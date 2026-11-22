import type { CheckState } from '../../../shared/tracker-state';
import { type ZoneId, zones } from '../../../shared/zones';

/** How a check shows on the page. */
export type CheckStatus = 'done' | 'available' | 'blocked' | 'unknown';

/**
 * Works out how a check shows: done once collected, unknown until the game is read, otherwise
 * available if it's in logic and blocked if not.
 *
 * @param check - The check.
 * @returns Its status.
 */
export const statusOf = (check: CheckState): CheckStatus => {
  if (check.collected) return 'done';
  if (check.inLogic === null) return 'unknown';
  return check.inLogic ? 'available' : 'blocked';
};

/**
 * Sums up a group of checks, such as a zone or a region.
 *
 * @param checks - The checks in the group.
 * @returns How many are left, how many there are, and the best thing you can do there: available
 * if any check is, blocked if only blocked ones are left, unknown before the game is read, and
 * done once all are.
 */
export const summarize = (checks: ReadonlyArray<CheckState>) => {
  const statuses = checks.map(statusOf);
  const left = statuses.filter((status) => status !== 'done').length;

  let status: CheckStatus = 'done';
  if (statuses.includes('available')) status = 'available';
  else if (statuses.includes('blocked')) status = 'blocked';
  else if (statuses.includes('unknown')) status = 'unknown';

  return { left, total: checks.length, status };
};

/**
 * Groups the seed's checks by zone, in zone-table order, leaving out zones with no checks.
 *
 * @param checks - Every check in the seed.
 * @returns Each zone that has checks, with its checks.
 */
export const groupByZone = (checks: ReadonlyArray<CheckState>) =>
  zones
    .map((zone) => ({ zone, checks: checks.filter((check) => check.zone === zone.id) }))
    .filter((group) => group.checks.length > 0);

export type ZoneGroup = ReturnType<typeof groupByZone>[number];

/**
 * Finds a zone by its ID.
 *
 * @param id - The zone's ID.
 * @returns The zone.
 */
export const zoneById = (id: ZoneId) => zones.find((zone) => zone.id === id) ?? zones[0];
