import type { PickupStatus } from './model';

// The rules for changing a pickup's status. No React Native or Firebase imports, so they can be
// tested in plain Node.

/** The statuses a driver can set. (Scheduled and Cancelled are only ever set by dispatch.) */
export type DriverStatus = 'in_progress' | 'completed' | 'missed';

export const STATUS_NOTE_LIMIT = 200;
export const MISSED_REASONS = ['No access', 'Blocked bin', 'Customer not ready', 'Truck breakdown', 'Other'] as const;

/** The queue and audit log share the same detail format, including entries saved by older builds. */
export function isValidStatusDetail(status: PickupStatus, detail?: string | null): boolean {
  if (status !== 'missed') return detail == null || detail.length <= STATUS_NOTE_LIMIT;
  if (!detail) return false;
  return MISSED_REASONS.some((reason) => {
    const prefix = reason + ' — ';
    return detail === reason || (
      detail.startsWith(prefix) && detail.length > prefix.length && detail.length <= prefix.length + STATUS_NOTE_LIMIT
    );
  });
}

// Which status a pickup can move to from each status. A driver only moves a pickup forward:
//
//   scheduled   → in progress, or missed
//   in progress → completed, or missed
//
// Completed, missed and cancelled are final. A missed pickup can't be reopened from the app (the
// update sheet used to offer "In progress" on one); what happens to it next is up to dispatch.
//
// The security rules in firestore.rules repeat this table, and tests/rules/rules.test.ts checks
// that the two agree for every pair of statuses.
const NEXT: Record<PickupStatus, readonly DriverStatus[]> = {
  scheduled: ['in_progress', 'missed'],
  in_progress: ['completed', 'missed'],
  completed: [],
  missed: [],
  cancelled: [],
};

/** The statuses a pickup can be moved to from `from`. Empty when it is final. */
export const nextStatuses = (from: PickupStatus): readonly DriverStatus[] => NEXT[from];

/** Whether a driver may change a pickup from `from` to `to`. Staying where it is is not a change. */
export const canTransitionTo = (from: PickupStatus, to: PickupStatus): boolean =>
  (NEXT[from] as readonly PickupStatus[]).includes(to);

/** True when a pickup can't be changed any more. */
export const isFinal = (status: PickupStatus): boolean => NEXT[status].length === 0;
