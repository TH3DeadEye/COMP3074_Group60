import type { JobType, PickupStatus } from './model';

// Demo data. There's no dispatch back end yet, so the first time a driver signs in, the app
// files these pickups under their account for today (see seedToday in pickupsRepo.ts).

export const DEMO_DRIVER = { truck: 'T-07', truckType: 'Roll-off', shift: '07:00 – 15:30' };

export type SeedPickup = {
  stop: number;
  customer: string;
  address: string;
  city: string;
  window: string;
  job: JobType;
  material: string;
  note?: string;
  status: PickupStatus;
  /** [hour, minute] the pickup was completed, for pickups that start out done. */
  doneAt?: [number, number];
  map: { x: number; y: number };
};

// Stops 1–2 aren't detailed in the design, so their addresses and windows are placeholders.
export const SEED_PICKUPS: SeedPickup[] = [
  {
    stop: 1, customer: 'Maple Dental Clinic', address: '120 Bloor St W', city: 'Toronto',
    window: '08:00 – 09:00', job: 'COLLECT', material: 'General waste', status: 'completed',
    doneAt: [8, 41], map: { x: 40, y: 170 },
  },
  {
    stop: 2, customer: 'R. Singh', address: '48 Euclid Ave', city: 'Toronto',
    window: '09:30 – 10:30', job: 'DROP', material: 'Renovation debris', status: 'completed',
    doneAt: [9, 58], map: { x: 120, y: 280 },
  },
  {
    stop: 3, customer: 'Northside Builders', address: '900 Dufferin St', city: 'Toronto',
    window: '11:00 – 12:00', job: 'SWAP', material: 'Construction debris', note: 'Bin behind gate B',
    status: 'scheduled', map: { x: 264, y: 330 },
  },
  {
    stop: 4, customer: 'Lakeview Condos', address: '9 Queens Quay W', city: 'Toronto',
    window: '12:30 – 13:30', job: 'SWAP', material: 'Mixed recycling', status: 'scheduled',
    map: { x: 345, y: 190 },
  },
  {
    stop: 5, customer: 'Harbour Kitchens', address: '55 Mill St', city: 'Toronto',
    window: '13:30 – 14:30', job: 'COLLECT', material: 'Organics', note: 'Loading dock opens at 13:30',
    status: 'scheduled', map: { x: 260, y: 110 },
  },
  {
    stop: 6, customer: 'Parkdale Rec Centre', address: '75 Lansdowne Ave', city: 'Toronto',
    window: '14:30 – 15:15', job: 'DROP', material: 'Yard waste', status: 'scheduled',
    map: { x: 40, y: 420 },
  },
];
