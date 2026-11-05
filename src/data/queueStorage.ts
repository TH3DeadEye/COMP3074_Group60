import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StatusUpdate } from './model';

// The queue lives on the phone so it survives the app being closed. One queue per account, so a
// different driver signing in on the same phone never sends someone else's updates.
const key = (uid: string) => `pickupQueue:v1:${uid}`;

const STATUSES = ['scheduled', 'in_progress', 'completed', 'missed', 'cancelled'];

function isUpdate(x: unknown): x is StatusUpdate {
  if (typeof x !== 'object' || x === null) return false;
  const u = x as Record<string, unknown>;
  return (
    typeof u.id === 'string' &&
    typeof u.pickupId === 'string' &&
    typeof u.date === 'string' &&
    typeof u.status === 'string' &&
    STATUSES.includes(u.status) &&
    typeof u.clientAt === 'number' &&
    (u.detail === undefined || typeof u.detail === 'string')
  );
}

export async function loadQueue(uid: string): Promise<StatusUpdate[]> {
  try {
    const raw = await AsyncStorage.getItem(key(uid));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isUpdate) : [];
  } catch {
    return [];
  }
}

// Saves are chained so two quick changes can never be written out of order.
let writes: Promise<void> = Promise.resolve();

export function saveQueue(uid: string, items: StatusUpdate[]): Promise<void> {
  writes = writes.then(async () => {
    try {
      if (items.length === 0) await AsyncStorage.removeItem(key(uid));
      else await AsyncStorage.setItem(key(uid), JSON.stringify(items));
    } catch {
      // Storage full or unavailable: the in-memory queue still works for this session.
    }
  });
  return writes;
}
