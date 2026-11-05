import { historyTitle, timeLabel, type Pickup, type StatusUpdate } from './model';

// The logic behind the offline queue. No React Native or Firebase imports, so it can be tested
// in plain Node. Storage is in queueStorage.ts and the sending is injected (see drainQueue).

/**
 * Shows queued updates as if they had already happened: the pickup takes the newest queued status
 * and its history gains an entry marked "Waiting to sync". Updates the server already has should
 * be filtered out before calling this.
 */
export function applyQueue(pickups: Pickup[], queue: StatusUpdate[], byName: string): Pickup[] {
  if (queue.length === 0) return pickups;
  const byPickup = new Map<string, StatusUpdate[]>();
  for (const u of queue) byPickup.set(u.pickupId, [...(byPickup.get(u.pickupId) ?? []), u]);

  return pickups.map((p) => {
    const mine = byPickup.get(p.id);
    if (!mine) return p;
    const pending = [...mine].reverse().map((u) => ({
      title: historyTitle(u.status, u.detail),
      meta: `${timeLabel(u.clientAt)} · ${byName} · Waiting to sync`,
    }));
    return { ...p, status: mine[mine.length - 1].status, history: [...pending, ...p.history] };
  });
}

// Errors where trying again would get the same answer, so the update should be dropped instead
// of blocking everything behind it. "permission-denied" also covers an update that actually
// reached the server on an earlier attempt: its audit row exists and rows can't be rewritten.
const PERMANENT = new Set(['permission-denied', 'invalid-argument', 'not-found', 'failed-precondition', 'already-exists']);

export function isPermanentError(e: unknown) {
  const code = typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : '';
  return PERMANENT.has(code);
}

/** Rejects if `p` hasn't settled in `ms`. Firestore writes wait forever when the connection is half-dead. */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('timed out'), { code: 'timeout' })), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export type DrainResult = {
  sent: number;
  dropped: number;
  /** Why it stopped: queue empty, connection lost, or a failure worth retrying later. */
  stoppedBy: 'empty' | 'offline' | 'retry';
};

/**
 * Sends queued updates one at a time, oldest first, removing each once it is done. Order matters
 * (a later status must not land before an earlier one), so a failure that is worth retrying stops
 * the whole run and leaves everything still queued.
 */
export async function drainQueue(opts: {
  isOnline: () => boolean;
  peek: () => StatusUpdate | undefined;
  commit: (update: StatusUpdate) => Promise<void>;
  remove: (id: string) => void;
  timeoutMs?: number;
  onDropped?: (update: StatusUpdate, error: unknown) => void;
}): Promise<DrainResult> {
  let sent = 0;
  let dropped = 0;
  for (;;) {
    if (!opts.isOnline()) return { sent, dropped, stoppedBy: 'offline' };
    const next = opts.peek();
    if (!next) return { sent, dropped, stoppedBy: 'empty' };
    try {
      await withTimeout(opts.commit(next), opts.timeoutMs ?? 10_000);
      sent++;
    } catch (e) {
      if (!isPermanentError(e)) return { sent, dropped, stoppedBy: 'retry' };
      dropped++;
      opts.onDropped?.(next, e);
    }
    opts.remove(next.id);
  }
}
