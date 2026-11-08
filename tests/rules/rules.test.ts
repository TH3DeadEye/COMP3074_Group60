import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, it } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, serverTimestamp, setDoc, setLogLevel, updateDoc, writeBatch, type Firestore,
} from 'firebase/firestore';

import type { PickupStatus, StatusUpdate } from '../../src/data/model';
import { commitUpdate, ensureDriver, eventsQuery, pickupsQuery, seedToday } from '../../src/data/pickupsRepo';
import { canTransitionTo } from '../../src/data/transitions';

const driver = { uid: 'driver', name: 'Test Driver' };
const other = { uid: 'other', name: 'Other Driver' };
const date = '2026-11-07';
const statuses: PickupStatus[] = ['scheduled', 'in_progress', 'completed', 'missed', 'cancelled'];
let env: RulesTestEnvironment;

// The rules test library returns a compat instance, which the modular Firestore API unwraps.
function dbFor(uid: string) {
  return env.authenticatedContext(uid).firestore() as unknown as Firestore;
}

function change(pickupId: string, status: PickupStatus, detail?: string): StatusUpdate {
  return { id: `${pickupId}-${status}`, pickupId, date, status, detail, clientAt: 1 };
}

before(async () => {
  setLogLevel('silent'); // The invalid-write cases intentionally return permission errors.
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Start the Firestore emulator first. See README.md.');
  env = await initializeTestEnvironment({
    projectId: 'demo-dumplo',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    const batch = writeBatch(db);
    for (const from of statuses) {
      for (const to of statuses) {
        batch.set(doc(db, 'pickups', `${from}-${to}`), { status: from, date, driverUid: driver.uid });
      }
    }
    for (const id of ['replay', 'missed-reason', 'audit-required', 'race']) {
      batch.set(doc(db, 'pickups', id), { status: 'scheduled', date, driverUid: driver.uid });
    }
    await batch.commit();
  });
});

after(async () => {
  await env?.cleanup();
});

it('the server agrees with the client for every status pair', async () => {
  const db = dbFor(driver.uid);
  for (const from of statuses) {
    for (const to of statuses) {
      const id = `${from}-${to}`;
      const update = change(id, to, to === 'missed' ? 'No access' : undefined);
      const save = commitUpdate(db, driver, update);
      if (canTransitionTo(from, to)) await assertSucceeds(save);
      else await assertFails(save);
      assert.equal((await getDoc(doc(db, 'pickups', id))).data()?.status, canTransitionTo(from, to) ? to : from);
    }
  }
});

it('enforces a Missed reason and the 200-character note limit', async () => {
  const db = dbFor(driver.uid);
  const id = 'missed-reason';
  await assertFails(commitUpdate(db, driver, change(id, 'missed')));
  await assertFails(commitUpdate(db, driver, change(id, 'missed', 'Fake reason')));
  await assertFails(commitUpdate(db, driver, change(id, 'missed', 'No access — ' + 'a'.repeat(201))));
  const detail = 'No access — ' + 'a'.repeat(198) + '\nz';
  const update = change(id, 'missed', detail);
  await assertSucceeds(commitUpdate(db, driver, update));
  assert.equal((await getDoc(doc(db, 'pickupEvents', update.id))).data()?.detail, detail);
});

it('requires the pickup and audit row to be written together by its driver', async () => {
  const db = dbFor(driver.uid);
  const pickupId = 'audit-required';
  const eventId = 'audit-only';
  const patch = { status: 'in_progress', updatedAt: serverTimestamp(), lastEventId: eventId };
  await assertFails(updateDoc(doc(db, 'pickups', pickupId), patch));
  await assertFails(setDoc(doc(db, 'pickupEvents', eventId), {
    pickupId, date, driverUid: driver.uid, status: 'in_progress', byUid: driver.uid,
    byName: driver.name, at: serverTimestamp(), clientAt: 1, detail: null,
  }));
  await assertFails(getDoc(doc(dbFor(other.uid), 'pickups', pickupId)));
  await assertFails(commitUpdate(dbFor(other.uid), other, change(pickupId, 'in_progress')));
});

it('replays an acknowledged update without reopening the pickup or adding a duplicate audit row', async () => {
  const db = dbFor(driver.uid);
  const start = change('replay', 'in_progress');
  await assertSucceeds(commitUpdate(db, driver, start));
  await assertSucceeds(commitUpdate(db, driver, change('replay', 'completed', 'Done')));
  await assertSucceeds(commitUpdate(db, driver, start));
  assert.equal((await getDoc(doc(db, 'pickups', 'replay'))).data()?.status, 'completed');
  const rows = await getDocs(eventsQuery(db, driver.uid, date));
  assert.equal(rows.docs.filter((row) => row.data().pickupId === 'replay').length, 2);
});

it('records only one of two concurrent final updates', async () => {
  const db = dbFor(driver.uid);
  const update = change('race', 'missed', 'No access');
  const results = await Promise.allSettled([
    commitUpdate(db, driver, update),
    commitUpdate(db, driver, { ...update, id: 'race-second', detail: 'Blocked bin' }),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rows = await getDocs(eventsQuery(db, driver.uid, date));
  assert.equal(rows.docs.filter((row) => row.data().pickupId === 'race').length, 1);
});

it('still seeds new accounts with pickups and initial history', async () => {
  const newDriver = { uid: 'new-driver', name: 'New Driver' };
  const db = dbFor(newDriver.uid);
  await assertSucceeds(ensureDriver(db, newDriver.uid));
  await assertSucceeds(seedToday(db, newDriver, date));
  const pickups = await getDocs(pickupsQuery(db, newDriver.uid, date));
  const events = await getDocs(eventsQuery(db, newDriver.uid, date));
  assert.equal(pickups.size, 6);
  assert.ok(events.size >= pickups.size);
});
