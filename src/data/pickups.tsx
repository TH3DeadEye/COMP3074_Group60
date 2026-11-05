import { getDocsFromServer, onSnapshot } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { identityOf, useAuth } from '@/data/auth';
import { db } from '@/firebase';
import { dateKey, dateLabel, type DriverInfo, type JobType, type Pickup, type PickupStatus } from './model';
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

export type { DriverInfo, HistoryEntry, JobType, Pickup, PickupStatus } from './model';

export const jobLabel: Record<JobType, string> = {
  SWAP: 'Swap bin',
  DROP: 'Drop bin',
  COLLECT: 'Collect bin',
};

type Store = {
  pickups: Pickup[];
  getPickup: (id: string) => Pickup | undefined;
  /** The first stop that is still open (in progress or scheduled). */
  nextPickup: Pickup | undefined;
  /** Records a status change (and an audit-log entry) for one of today's pickups. */
  updateStatus: (id: string, status: PickupStatus, detail?: string) => void;
  driver: DriverInfo;
  /** True until the first batch of pickups has arrived. */
  loading: boolean;
  /** Set when Firestore refuses or can't be reached, e.g. the rules aren't deployed. */
  error: string | null;
  /** Last time we heard from the server, or null if we haven't yet. */
  lastSynced: Date | null;
  /** True while changes are on their way to the server. */
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

  const [today, setToday] = useState(() => dateKey());
  const [remote, setRemote] = useState<Remote>(() => emptyRemote(null));
  const [refreshing, setRefreshing] = useState(false);

  // Latest values for callbacks that outlive a render.
  const live = useRef({ uid, name });
  useEffect(() => {
    live.current = { uid, name };
  });
  const seeding = useRef<string | null>(null);

  // A phone left open overnight should move on to the new day when it comes back to the front.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(dateKey());
    });
    return () => sub.remove();
  }, []);

  // Live subscriptions: any change in Firestore (from this phone or another) updates the UI.
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
      (snap) => {
        const fromServer = !snap.metadata.fromCache;
        setRemote((prev) =>
          patch(prev, uid, {
            pickups: snap.docs.map((d) => parsePickup(d.id, d.data())),
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
      (snap) => setRemote((prev) => patch(prev, uid, { events: snap.docs.map((d) => parseEvent(d.id, d.data())) })),
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
  }, [uid, today]);

  const view = remote.uid === uid ? remote : emptyRemote(uid);

  const pickups = useMemo<Pickup[]>(() => {
    const history = historyByPickup(view.events);
    return [...(view.pickups ?? [])]
      .sort((a, b) => a.stop - b.stop)
      .map((p) => ({ ...p, history: history.get(p.id) ?? [] }));
  }, [view.pickups, view.events]);

  const refresh = useCallback(async () => {
    if (!uid) return;
    setRefreshing(true);
    try {
      // Succeeds only if the server answers, which also proves we're online.
      await getDocsFromServer(pickupsQuery(db, uid, today));
      setRemote((prev) => patch(prev, uid, { lastServerSync: new Date() }));
    } catch {
      // Offline: keep showing what we have.
    } finally {
      setRefreshing(false);
    }
  }, [uid, today]);

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
        const owner = live.current.uid;
        if (!owner) return;
        commitUpdate(db, { uid: owner, name: live.current.name }, { id: newId(), pickupId: id, date: today, status, detail, clientAt: Date.now() }).catch(
          (e) => setRemote((prev) => patch(prev, owner, { error: describeError(e) })),
        );
      },
      driver,
      loading: uid !== null && view.pickups === null && view.error === null,
      error: view.error,
      lastSynced: view.lastServerSync,
      syncing: view.pendingWrites || refreshing,
      refresh,
    }),
    [pickups, driver, uid, today, view.pickups, view.error, view.lastServerSync, view.pendingWrites, refreshing, refresh],
  );

  return <PickupsContext.Provider value={store}>{children}</PickupsContext.Provider>;
}

export function usePickups() {
  const store = useContext(PickupsContext);
  if (!store) throw new Error('usePickups must be used inside PickupsProvider');
  return store;
}

export function navigationUrl(p: Pickup) {
  const destination = encodeURIComponent(`${p.address} ${p.city}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
}
