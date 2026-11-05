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

// What the screens show about the signed-in driver. Name comes from the account, the rest from
// the driver's Firestore document.
export type DriverInfo = {
  name: string;
  initials: string;
  truck: string;
  truckType: string;
  shift: string;
  date: string;
};

export const statusTitle: Record<PickupStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  missed: 'Missed',
  cancelled: 'Cancelled',
};

export function historyTitle(status: PickupStatus, detail?: string | null) {
  return detail ? `${statusTitle[status]} · ${detail}` : statusTitle[status];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "14:05" */
export function timeLabel(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "2026-11-16", in the phone's local time. This is the day a driver's pickups are filed under. */
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mon, Nov 16" */
export function dateLabel(d = new Date()) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
