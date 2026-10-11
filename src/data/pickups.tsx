import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type PickupStatus = 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'cancelled';
export type JobType = 'SWAP' | 'DROP' | 'COLLECT';

export type HistoryEntry = { title: string; meta: string };

export type Pickup = {
  id: string;
  stop: number;
  customer: string;
  address: string;
  city: string;
  window: string;
  job: JobType;
  material: string;
  note?: string;
  status: PickupStatus;
  history: HistoryEntry[];
  // Marker position on the mock route map, in the map's 390×764 design space.
  map: { x: number; y: number };
};

export const driver = {
  name: 'Jordan Rivera',
  initials: 'JR',
  truck: 'T-07',
  truckType: 'Roll-off',
  date: 'Mon, Nov 16',
  shift: '07:00 – 15:30',
};

export const jobLabel: Record<JobType, string> = {
  SWAP: 'Swap bin',
  DROP: 'Drop bin',
  COLLECT: 'Collect bin',
};

const assigned: HistoryEntry[] = [
  { title: 'Assigned to T-07', meta: '07:05 · Dispatcher A. Lee' },
  { title: 'Scheduled', meta: '07:02 · Dispatcher A. Lee' },
];

// Mock data for the prototype. Stops 1–2 aren't detailed in the design, so their
// addresses and windows are placeholders.
const initialPickups: Pickup[] = [
  {
    id: 'P-1040', stop: 1, customer: 'Maple Dental Clinic', address: '120 Bloor St W', city: 'Toronto',
    window: '08:00 – 09:00', job: 'COLLECT', material: 'General waste', status: 'completed',
    history: [{ title: 'Completed', meta: '08:41 · Jordan Rivera' }, ...assigned], map: { x: 40, y: 170 },
  },
  {
    id: 'P-1041', stop: 2, customer: 'R. Singh', address: '48 Euclid Ave', city: 'Toronto',
    window: '09:30 – 10:30', job: 'DROP', material: 'Renovation debris', status: 'completed',
    history: [{ title: 'Completed', meta: '09:58 · Jordan Rivera' }, ...assigned], map: { x: 120, y: 280 },
  },
  {
    id: 'P-1042', stop: 3, customer: 'Northside Builders', address: '900 Dufferin St', city: 'Toronto',
    window: '11:00 – 12:00', job: 'SWAP', material: 'Construction debris', note: 'Bin behind gate B',
    status: 'scheduled', history: assigned, map: { x: 264, y: 330 },
  },
  {
    id: 'P-1043', stop: 4, customer: 'Lakeview Condos', address: '9 Queens Quay W', city: 'Toronto',
    window: '12:30 – 13:30', job: 'SWAP', material: 'Mixed recycling', status: 'scheduled',
    history: assigned, map: { x: 345, y: 190 },
  },
  {
    id: 'P-1044', stop: 5, customer: 'Harbour Kitchens', address: '55 Mill St', city: 'Toronto',
    window: '13:30 – 14:30', job: 'COLLECT', material: 'Organics', note: 'Loading dock opens at 13:30',
    status: 'scheduled', history: assigned, map: { x: 260, y: 110 },
  },
  {
    id: 'P-1045', stop: 6, customer: 'Parkdale Rec Centre', address: '75 Lansdowne Ave', city: 'Toronto',
    window: '14:30 – 15:15', job: 'DROP', material: 'Yard waste', status: 'scheduled',
    history: assigned, map: { x: 40, y: 420 },
  },
];

const statusTitle: Record<PickupStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  missed: 'Missed',
  cancelled: 'Cancelled',
};

type Store = {
  pickups: Pickup[];
  getPickup: (id: string) => Pickup | undefined;
  /** The first stop that is still open (in progress or scheduled). */
  nextPickup: Pickup | undefined;
  updateStatus: (id: string, status: PickupStatus, detail?: string) => void;
  lastSynced: Date;
  refresh: () => void;
};

const PickupsContext = createContext<Store | null>(null);

function nowLabel() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function PickupsProvider({ children }: { children: ReactNode }) {
  const [pickups, setPickups] = useState(initialPickups);
  const [lastSynced, setLastSynced] = useState(() => new Date());

  const store = useMemo<Store>(
    () => ({
      pickups,
      getPickup: (id) => pickups.find((p) => p.id === id),
      nextPickup: pickups.find((p) => p.status === 'in_progress' || p.status === 'scheduled'),
      updateStatus: (id, status, detail) => {
        setPickups((list) =>
          list.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status,
                  history: [
                    {
                      title: detail ? `${statusTitle[status]} · ${detail}` : statusTitle[status],
                      meta: `${nowLabel()} · ${driver.name}`,
                    },
                    ...p.history,
                  ],
                }
              : p,
          ),
        );
        setLastSynced(new Date());
      },
      lastSynced,
      refresh: () => setLastSynced(new Date()),
    }),
    [pickups, lastSynced],
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
