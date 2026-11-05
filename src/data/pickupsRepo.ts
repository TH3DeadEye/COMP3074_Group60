import {
  collection,
  doc,
  getDoc,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';

import {
  historyTitle,
  timeLabel,
  type HistoryEntry,
  type JobType,
  type Pickup,
  type PickupStatus,
  type StatusUpdate,
} from './model';
import { DEMO_DRIVER, SEED_PICKUPS } from './seed';

// Everything that talks to Firestore lives here. It takes the database as an argument and has no
// React Native imports, so it can be exercised against the Firebase emulator.
//
// Collections:
//   drivers/{uid}             truck, shift, ...                     (one per driver)
//   pickups/{id}              a pickup; drivers may change only status and updatedAt
//   pickupEvents/{id}         the audit log: one immutable row per status change

export type PickupBase = Omit<Pickup, 'history'>;

export type DriverDoc = { truck?: string; truckType?: string; shift?: string };

export type PickupEvent = {
  id: string;
  pickupId: string;
  status: PickupStatus;
  detail: string | null;
  byName: string;
  /** When it happened on the driver's phone (ms). The server time is stored separately in `at`. */
  clientAt: number;
};

type Who = { uid: string; name: string };

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/* ---------- reads ---------- */

// Two equality filters only, so Firestore needs no composite index. Sorting happens in the app.
export const pickupsQuery = (db: Firestore, uid: string, date: string) =>
  query(collection(db, 'pickups'), where('driverUid', '==', uid), where('date', '==', date));

export const eventsQuery = (db: Firestore, uid: string, date: string) =>
  query(collection(db, 'pickupEvents'), where('driverUid', '==', uid), where('date', '==', date));

export const driverRef = (db: Firestore, uid: string) => doc(db, 'drivers', uid);

export function parsePickup(id: string, d: DocumentData): PickupBase {
  return {
    id,
    stop: Number(d.stop) || 0,
    customer: String(d.customer ?? ''),
    address: String(d.address ?? ''),
    city: String(d.city ?? ''),
    window: String(d.window ?? ''),
    job: d.job as JobType,
    material: String(d.material ?? ''),
    note: typeof d.note === 'string' && d.note ? d.note : undefined,
    status: d.status as PickupStatus,
    map: { x: Number(d.map?.x) || 0, y: Number(d.map?.y) || 0 },
  };
}

export function parseEvent(id: string, d: DocumentData): PickupEvent {
  return {
    id,
    pickupId: String(d.pickupId ?? ''),
    status: d.status as PickupStatus,
    detail: typeof d.detail === 'string' && d.detail ? d.detail : null,
    byName: String(d.byName ?? ''),
    clientAt: Number(d.clientAt) || 0,
  };
}

/** Newest first, grouped by pickup, in the shape the pickup details screen shows. */
export function historyByPickup(events: PickupEvent[]): Map<string, HistoryEntry[]> {
  const sorted = [...events].sort((a, b) => b.clientAt - a.clientAt || b.id.localeCompare(a.id));
  const byPickup = new Map<string, HistoryEntry[]>();
  for (const e of sorted) {
    const list = byPickup.get(e.pickupId) ?? [];
    list.push({ title: historyTitle(e.status, e.detail), meta: `${timeLabel(e.clientAt)} · ${e.byName}` });
    byPickup.set(e.pickupId, list);
  }
  return byPickup;
}

/* ---------- writes ---------- */

/**
 * Records a status change: the pickup's new status and an audit event, in one atomic batch.
 * The security rules only let a driver touch their own pickups and only append events.
 */
export async function commitUpdate(db: Firestore, who: Who, update: StatusUpdate) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'pickups', update.pickupId), { status: update.status, updatedAt: serverTimestamp() });
  batch.set(doc(db, 'pickupEvents', update.id), {
    pickupId: update.pickupId,
    driverUid: who.uid,
    date: update.date,
    status: update.status,
    detail: update.detail ?? null,
    byUid: who.uid,
    byName: who.name,
    clientAt: update.clientAt,
    at: serverTimestamp(),
  });
  await batch.commit();
}

/** Creates the driver's profile document if it doesn't exist yet (it can't be changed later). */
export async function ensureDriver(db: Firestore, uid: string) {
  const ref = driverRef(db, uid);
  if ((await getDoc(ref)).exists()) return;
  await setDoc(ref, { ...DEMO_DRIVER, createdAt: serverTimestamp() });
}

/**
 * Files the demo pickups (and their starting history) under this driver for `date`.
 * IDs are deterministic, so a second attempt fails instead of creating duplicates.
 */
export async function seedToday(db: Firestore, who: Who, date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const at = (hour: number, minute: number) => new Date(y, m - 1, d, hour, minute).getTime();
  const batch = writeBatch(db);

  for (const sp of SEED_PICKUPS) {
    const id = `${who.uid}_${date}_s${sp.stop}`;
    batch.set(doc(db, 'pickups', id), {
      driverUid: who.uid,
      date,
      stop: sp.stop,
      customer: sp.customer,
      address: sp.address,
      city: sp.city,
      window: sp.window,
      job: sp.job,
      material: sp.material,
      ...(sp.note ? { note: sp.note } : {}),
      status: sp.status,
      map: sp.map,
      updatedAt: serverTimestamp(),
    });

    const event = (suffix: string, status: PickupStatus, detail: string | null, byName: string, clientAt: number) =>
      batch.set(doc(db, 'pickupEvents', `${id}_${suffix}`), {
        pickupId: id,
        driverUid: who.uid,
        date,
        status,
        detail,
        byUid: who.uid,
        byName,
        clientAt,
        at: serverTimestamp(),
      });

    event('e0', 'scheduled', `Assigned to ${DEMO_DRIVER.truck}`, 'Dispatcher A. Lee', at(7, 2));
    if (sp.doneAt) event('e1', 'completed', null, who.name, at(sp.doneAt[0], sp.doneAt[1]));
  }

  await batch.commit();
}
