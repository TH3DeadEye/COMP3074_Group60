import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Pickup, PickupStatus, StatusUpdate } from '../../src/data/model';
import { applyQueue } from '../../src/data/syncQueue';
import { canTransitionTo, isFinal, isValidStatusDetail, nextStatuses } from '../../src/data/transitions';

const ALL: PickupStatus[] = ['scheduled', 'in_progress', 'completed', 'missed', 'cancelled'];

// The whole rule book, written out independently of the code: these are the only moves a driver
// may make. Everything else must be refused.
const ALLOWED: [PickupStatus, PickupStatus][] = [
  ['scheduled', 'in_progress'],
  ['scheduled', 'missed'],
  ['in_progress', 'completed'],
  ['in_progress', 'missed'],
];

describe('canTransitionTo', () => {
  for (const from of ALL) {
    for (const to of ALL) {
      const allowed = ALLOWED.some(([f, t]) => f === from && t === to);
      it(`${from} -> ${to} is ${allowed ? 'allowed' : 'refused'}`, () => {
        assert.equal(canTransitionTo(from, to), allowed);
      });
    }
  }

  it('a Missed pickup cannot be reopened (the original bug)', () => {
    assert.equal(canTransitionTo('missed', 'in_progress'), false);
    assert.equal(canTransitionTo('missed', 'scheduled'), false);
    assert.equal(canTransitionTo('missed', 'completed'), false);
  });

  it('a Completed pickup cannot be changed', () => {
    for (const to of ALL) assert.equal(canTransitionTo('completed', to), false);
  });

  it('a pickup cannot skip the step in the middle', () => {
    assert.equal(canTransitionTo('scheduled', 'completed'), false);
  });

  it('nothing moves backwards', () => {
    assert.equal(canTransitionTo('in_progress', 'scheduled'), false);
    assert.equal(canTransitionTo('completed', 'in_progress'), false);
  });
});

describe('nextStatuses', () => {
  it('offers In progress and Missed on a scheduled pickup', () => {
    assert.deepEqual([...nextStatuses('scheduled')], ['in_progress', 'missed']);
  });

  it('offers Completed and Missed on a pickup in progress', () => {
    assert.deepEqual([...nextStatuses('in_progress')], ['completed', 'missed']);
  });

  it('offers nothing once a pickup is final', () => {
    for (const s of ['completed', 'missed', 'cancelled'] as const) assert.deepEqual([...nextStatuses(s)], []);
  });

  it('agrees with canTransitionTo for every pair', () => {
    for (const from of ALL) {
      for (const to of ALL) {
        assert.equal(nextStatuses(from).some((status) => status === to), canTransitionTo(from, to), `${from} -> ${to}`);
      }
    }
  });
});

describe('status details', () => {
  it('requires a listed reason for Missed', () => {
    assert.equal(isValidStatusDetail('missed'), false);
    assert.equal(isValidStatusDetail('missed', 'Arbitrary reason'), false);
    assert.equal(isValidStatusDetail('missed', 'No access'), true);
  });

  it('limits the note to 200 characters separately from the reason', () => {
    const note = 'a'.repeat(199) + '\n';
    assert.equal(isValidStatusDetail('missed', 'No access — ' + note), true);
    assert.equal(isValidStatusDetail('missed', 'No access — ' + note + 'x'), false);
    assert.equal(isValidStatusDetail('completed', note), true);
    assert.equal(isValidStatusDetail('completed', note + 'x'), false);
  });
});

describe('offline status changes', () => {
  const pickup: Pickup = {
    id: 'pickup-1',
    stop: 1,
    customer: 'Test site',
    address: '1 Test St.',
    city: 'Toronto',
    window: '08:00–09:00',
    job: 'DROP',
    material: 'Mixed',
    status: 'scheduled',
    history: [],
    map: { x: 0, y: 0 },
  };
  const update = (status: PickupStatus): StatusUpdate => ({
    id: status,
    pickupId: pickup.id,
    date: '2026-11-07',
    status,
    clientAt: 1,
  });

  it('applies a start and completion in queue order', () => {
    const [result] = applyQueue([pickup], [update('in_progress'), update('completed')], 'Driver');
    assert.equal(result.status, 'completed');
    assert.deepEqual(result.history.map((entry) => entry.title), ['Completed', 'In progress']);
    assert.ok(result.history.every((entry) => entry.meta.includes('Waiting to sync')));
  });

  it('ignores a saved update that would reopen a missed pickup', () => {
    const missed: Pickup = { ...pickup, status: 'missed' };
    const [result] = applyQueue([missed], [update('in_progress')], 'Driver');
    assert.deepEqual(result, missed);
  });
});

describe('isFinal', () => {
  it('is true for completed, missed and cancelled', () => {
    assert.deepEqual(ALL.filter(isFinal), ['completed', 'missed', 'cancelled']);
  });

  it('is false while a pickup can still move', () => {
    assert.equal(isFinal('scheduled'), false);
    assert.equal(isFinal('in_progress'), false);
  });
});
