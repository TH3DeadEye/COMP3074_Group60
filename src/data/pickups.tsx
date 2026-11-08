import { getDocsFromServer, onSnapshot } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { identityOf, useAuth } from '@/data/auth';
import { db } from '@/firebase';
import {
  dateKey,
  dateLabel,
  type DriverInfo,
  type JobType,
  type Pickup,
  type PickupStatus,
  type StatusUpdate,
} from './model';
import {
  commitUpdate,
  driverRef,
  ensureDriver,
  eventsQuery,
  historyByPickup,
  newId,
  parseEvent,
  parsePickup,
  pickupsQuery,
  seedToday,
  type DriverDoc,
  type PickupBase,
  type PickupEvent,
} from './pickupsRepo';
import { loadQueue, saveQueue } from './queueStorage';
import { applyQueue, drainQueue, withTimeout } from './syncQueue';
import { canTransitionTo, isValidStatusDetail } from './transitions';
import { useOnline } from './useOnline';

export type { DriverInfo, HistoryEntry, JobType, Pickup, PickupStatus } from './model';

export const jobLabel: Record<JobType, string> = {
  SWAP: 'Swap bin',
  DROP: 'Drop bin',
  COLLECT: 'Collect bin',
};

const COMMIT_TIMEOUT_MS = 10_000; // give up on a write the server never answers
const RETRY_EVERY_MS = 20_000; // how often to retry a queue that is stuck on a temporary failure

type Store = {
  pickups: Pickup[];
  getPickup: (id: string) => Pickup | undefined;
  /** The first stop that is still open (in progress or scheduled). */
  nextPickup: Pickup | undefined;
  /**
   * Records a status change for one of today's pickups. It shows on screen immediately and is
   * saved on the phone, then sent (with an audit-log entry) as soon as there's a connection.
   */
  updateStatus: (id: string, status: PickupStatus, detail?: string) => boolean;
  driver: DriverInfo;
  /** True until the first batch of pickups has arrived. */
  loading: boolean;
  /** Set when Firestore refuses or can't be reached, e.g. the rules aren't deployed. */
  error: string | null;
  /** Last time we heard from the server, or null if we haven't yet. */
  lastSynced: Date | null;
  /** False when the phone has no connection. */
  online: boolean;
  /** How many status changes are saved on the phone but not yet on the server. */
  pendingCount: number;
  /** True while changes are being sent or the list is being refreshed. */
  syncing: boolean;
  refresh: () => Promise<void>;
};

const PickupsContext = createContext<Store | null>(null);

// Everything we've heard from Firestore, tagged with the user it belongs to so that switching
// accounts can never show the previous driver's data.
type Remote = {
  uid: string | null;
  pickups: PickupBase[] | null; // null until the first snapshot
  events: PickupEvent[];
  driverDoc: DriverDoc | null | undefined; // undefined = not loaded, null = no document
  lastServerSync: Date | null;
  pendingWrites: boolean;
  error: string | null;
};

const emptyRemote = (uid: string | null): Remote => ({
  uid,
  pickups: null,
  events: [],
  driverDoc: undefined,
  lastServerSync: null,
  pendingWrites: false,
  error: null,
});

const patch = (prev: Remote, uid: string, changes: Partial<Remote>): Remote => ({
  ...(prev.uid === uid ? prev : emptyRemote(uid)),
  ...changes,
});

// The offline queue, tagged with its owner for the same reason.
type QueueState = { uid: string | null; items: StatusUpdate[] };
const NO_QUEUE: StatusUpdate[] = [];

function describeError(e: unknown) {
  const code = typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : 'unknown';
  if (__DEV__) console.warn('Firestore error:', code, e);
  switch (code) {
    case 'permission-denied':
      return "Firestore refused the request (permission denied). Publish firestore.rules to the project's database.";
    case 'not-found':
      return 'Firestore database not found. Create the (default) database in the Firebase console.';
    case 'unavailable':
      return "Can't reach the server. Showing the last data this phone saw.";
    default:
      return `Couldn't load your pickups (${code}).`;
  }
}

export function PickupsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { name, initials } = identityOf(user);
  const online = useOnline();

  const [today, setToday] = useState(() => dateKey());
  const [remote, setRemote] = useState<Remote>(() => emptyRemote(null));
  const [queueState, setQueueState] = useState<QueueState>({ uid: null, items: NO_QUEUE });
  const [flushing, setFlushing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [listenAttempt, setListenAttempt] = useState(0);
  const [rejectedOwner, setRejectedOwner] = useState<string | null>(null);

  // Latest values for callbacks that outlive a render (listeners, timers, the sender).
  const live = useRef({ uid, name, online });
  useEffect(() => {
    live.current = { uid, name, online };
  });
  const seeding = useRef<string | null>(null);
  const queueRef = useRef<StatusUpdate[]>([]); // the queue, always current (state lags a render)
  const sending = useRef(false);

  /* ---------- the offline queue ---------- */

  // Load this account's saved queue when it signs in.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadQueue(uid).then((saved) => {
      if (cancelled) return;
      // Keep anything queued while this was loading.
      const merged = [...saved, ...queueRef.current];
      queueRef.current = merged;
      setQueueState({ uid, items: merged });
    });
    return () => {
      cancelled = true;
      queueRef.current = [];
    };
  }, [uid]);

  // Every change goes through here: update memory, update the screen, save to the phone.
  const changeQueue = useCallback((fn: (queue: StatusUpdate[]) => StatusUpdate[]) => {
    const owner = live.current.uid;
    if (!owner) return;
    const next = fn(queueRef.current);
    queueRef.current = next;
    setQueueState({ uid: owner, items: next });
    void saveQueue(owner, next);
  }, []);

  // Send queued updates to the server, oldest first, for as long as we're online.
  const send = useCallback(async () => {
    const owner = live.current.uid;
    if (!owner || sending.current) return;
    sending.current = true;
    setFlushing(true);
    try {
      const result = await drainQueue({
        isOnline: () => live.current.online && live.current.uid === owner,
        peek: () => queueRef.current[0],
        commit: (update) => commitUpdate(db, { uid: owner, name: live.current.name }, update),
        remove: (id) => {
          if (live.current.uid === owner) changeQueue((q) => q.filter((u) => u.id !== id));
        },
        timeoutMs: COMMIT_TIMEOUT_MS,
        onDropped: (update, e) => {
          if (__DEV__) console.warn('The server rejected a queued update, dropping it:', update, e);
          if (live.current.uid === owner) setRejectedOwner(owner);
        },
      });
      if (result.sent > 0 && live.current.uid === owner) {
        setRemote((prev) => patch(prev, owner, { lastServerSync: new Date(), error: null }));
      }
    } finally {
      sending.current = false;
      setFlushing(false);
    }
  }, [changeQueue]);

  const queueReady = uid !== null && queueState.uid === uid;
  const queued = queueReady ? queueState.items : NO_QUEUE;

  // Try as soon as something is queued, or the connection comes back.
  useEffect(() => {
    if (queueReady && online && queued.length > 0) void send();
  }, [queueReady, online, queued.length, send]);

  // And keep trying while something is stuck (e.g. a server hiccup).
  useEffect(() => {
    if (!(queueReady && online && queued.length > 0)) return;
    const timer = setInterval(() => void send(), RETRY_EVERY_MS);
    return () => clearInterval(timer);
  }, [queueReady, online, queued.length, send]);

  // Coming back to the app is a good moment to catch up, and to move on to a new day.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      setToday(dateKey());
      void send();
    });
    return () => sub.remove();
  }, [send]);

  /* ---------- live data from Firestore ---------- */

  // Any change in Firestore (from this phone or another) updates the UI.
  useEffect(() => {
    if (!uid) return;

    const fail = (e: unknown) => setRemote((prev) => patch(prev, uid, { error: describeError(e) }));

    // First time on this account/day: file the demo pickups, once.
    const seed = async () => {
      const key = `${uid}_${today}`;
      if (seeding.current === key) return;
      seeding.current = key;
      try {
        await ensureDriver(db, uid);
        await seedToday(db, { uid, name: live.current.name }, today);
      } catch (e) {
        seeding.current = null;
        fail(e);
      }
    };

    const unsubPickups = onSnapshot(
      pickupsQuery(db, uid, today),
      { includeMetadataChanges: true },
      (snap) => {
        const fromServer = !snap.metadata.fromCache && !snap.metadata.hasPendingWrites;
        setRemote((prev) =>
          patch(prev, uid, {
            pickups: snap.docs.map((d) => {
              // The queue renders our own writes until Firestore acknowledges them.
              const known = d.metadata.hasPendingWrites && prev.uid === uid && prev.pickups?.find((p) => p.id === d.id);
              return known || parsePickup(d.id, d.data());
            }),
            pendingWrites: snap.metadata.hasPendingWrites,
            error: null,
            ...(fromServer ? { lastServerSync: new Date() } : {}),
          }),
        );
        // An empty answer from the cache just means we haven't heard from the server yet.
        if (snap.empty && fromServer) void seed();
      },
      fail,
    );
    const unsubEvents = onSnapshot(
      eventsQuery(db, uid, today),
      { includeMetadataChanges: true },
      (snap) => setRemote((prev) => patch(prev, uid, {
        events: snap.docs.filter((d) => !d.metadata.hasPendingWrites).map((d) => parseEvent(d.id, d.data())),
      })),
      fail,
    );
    const unsubDriver = onSnapshot(
      driverRef(db, uid),
      (snap) => setRemote((prev) => patch(prev, uid, { driverDoc: snap.exists() ? (snap.data() as DriverDoc) : null })),
      fail,
    );

    return () => {
      unsubPickups();
      unsubEvents();
      unsubDriver();
    };
  }, [uid, today, listenAttempt]);

  /* ---------- what the screens see ---------- */

  const view = remote.uid === uid ? remote : emptyRemote(uid);

  // Queued updates the server already has (sent, but not yet removed from the queue) would show twice.
  const eventIds = useMemo(() => new Set(view.events.map((e) => e.id)), [view.events]);
  const waiting = useMemo(() => queued.filter((u) => !eventIds.has(u.id)), [queued, eventIds]);

  const pickups = useMemo<Pickup[]>(() => {
    const history = historyByPickup(view.events);
    const fromServer = [...(view.pickups ?? [])]
      .sort((a, b) => a.stop - b.stop)
      .map((p) => ({ ...p, history: history.get(p.id) ?? [] }));
    return applyQueue(fromServer, waiting, name);
  }, [view.pickups, view.events, waiting, name]);

  const refresh = useCallback(async () => {
    if (!uid || !live.current.online) return;
    setRejectedOwner(null);
    if (view.error) setListenAttempt((attempt) => attempt + 1);
    setRefreshing(true);
    try {
      await send();
      // Succeeds only if the server answers, which also proves we're really online.
      await withTimeout(getDocsFromServer(pickupsQuery(db, uid, today)), 8_000);
      if (live.current.uid === uid) setRemote((prev) => patch(prev, uid, { lastServerSync: new Date() }));
    } catch (error) {
      if (live.current.uid === uid) setRemote((prev) => patch(prev, uid, { error: describeError(error) }));
    } finally {
      setRefreshing(false);
    }
  }, [uid, today, send, view.error]);

  const driverDoc = view.driverDoc;
  const driver = useMemo<DriverInfo>(
    () => ({
      name,
      initials,
      truck: driverDoc?.truck ?? '—',
      truckType: driverDoc?.truckType ?? '',
      shift: driverDoc?.shift ?? '—',
      date: dateLabel(),
    }),
    // `today` changes at midnight, which moves the date label with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, initials, driverDoc, today],
  );

  const store = useMemo<Store>(
    () => ({
      pickups,
      getPickup: (id) => pickups.find((p) => p.id === id),
      nextPickup: pickups.find((p) => p.status === 'in_progress' || p.status === 'scheduled'),
      updateStatus: (id, status, detail) => {
        if (!queueReady || live.current.uid !== uid || !isValidStatusDetail(status, detail)) return false;
        const pickup = pickups.find((p) => p.id === id);
        if (!pickup) return false;
        // A second action can arrive before React has rendered the previous queue change.
        const pending = queueRef.current.filter((u) => u.pickupId === id && !eventIds.has(u.id));
        const [current] = applyQueue([pickup], pending, name);
        if (!canTransitionTo(current.status, status)) return false;
        changeQueue((q) => [...q, { id: newId(), pickupId: id, date: today, status, detail, clientAt: Date.now() }]);
        setRejectedOwner(null);
        return true;
      },
      driver,
      loading: uid !== null && view.pickups === null && view.error === null,
      error: view.error ?? (uid && rejectedOwner === uid ? 'A status update was rejected. Check the pickup’s current status.' : null),
      lastSynced: view.lastServerSync,
      online,
      pendingCount: waiting.length,
      syncing: flushing || refreshing || view.pendingWrites,
      refresh,
    }),
    [
      pickups,
      driver,
      uid,
      today,
      changeQueue,
      eventIds,
      name,
      queueReady,
      rejectedOwner,
      view.pickups,
      view.error,
      view.lastServerSync,
      view.pendingWrites,
      online,
      waiting.length,
      flushing,
      refreshing,
      refresh,
    ],
  );

  return <PickupsContext.Provider value={store}>{children}</PickupsContext.Provider>;
}

export function usePickups() {
  const store = useContext(PickupsContext);
  if (!store) throw new Error('usePickups must be used inside PickupsProvider');
  return store;
}
