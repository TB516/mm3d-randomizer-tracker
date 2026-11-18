import type { CheckState } from '../../../shared/tracker-state';
import { type ZoneId, zones } from '../../../shared/zones';

/** How a check shows on the page. */
export type CheckStatus = 'done' | 'available' | 'blocked';

/**
 * Works out how a check shows. Until logic exists, every check that isn't collected counts as
 * available.
 *
 * @param check - The check.
 * @returns Its status.
 */
export const statusOf = (check: CheckState): CheckStatus =>
  check.collected ? 'done' : 'available';

/**
 * Sums up a group of checks, such as a zone or a region.
 *
 * @param checks - The checks in the group.
 * @returns How many are left, how many there are, and the best thing you can do there: available
 * if any check is, blocked if only blocked ones are left, and done once all are.
 */
export const summarize = (checks: ReadonlyArray<CheckState>) => {
  const statuses = checks.map(statusOf);
  const left = statuses.filter((status) => status !== 'done').length;

  let status: CheckStatus = 'done';
  if (statuses.includes('available')) status = 'available';
  else if (statuses.includes('blocked')) status = 'blocked';

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
