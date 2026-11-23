import { type ZoneId, zones } from '../../shared/zones';
import type { SeedLocation } from './spoiler-data';

/** A check in the seed, sorted into its zone. */
export type SeedCheck = {
  /**
   * Positions in the seed's location table, which the game's collected flags also use. More than
   * one when copies of a shared item in the same zone are shown as this one check.
   */
  readonly indexes: ReadonlyArray<number>;
  /** The full names of those locations, which logic knows them by. */
  readonly locations: ReadonlyArray<string>;
  /** The check's name without its zone prefix, since the zone is shown alongside it. */
  readonly name: string;
  readonly zone: ZoneId;
  /** Whether a check in another zone already counts this shared item toward the overall total. */
  readonly countedElsewhere: boolean;
  /** The item placed here, by its name in the seed. Copies of a shared item all hold it. */
  readonly item: string;
};

/** Every zone prefix, longest first, so `Woodfall Temple` wins over a shorter prefix. */
const prefixes = zones
  .flatMap((zone) => zone.prefixes.map((prefix) => ({ prefix, zone: zone.id })))
  .toSorted((a, b) => b.prefix.length - a.prefix.length);

/**
 * Sorts a seed location into the zone its name starts with.
 *
 * @param location - A location from `readLocations`.
 * @returns Its zone, or `other` if no prefix matches, and its name without the prefix.
 */
const placeInZone = (location: SeedLocation): { zone: ZoneId; name: string } => {
  const match = prefixes.find(({ prefix }) => location.name.startsWith(prefix));
  if (!match) return { zone: 'other', name: location.name };

  // Some names are only the prefix, like `Song of Time`, so keep those whole.
  const name = location.name.slice(match.prefix.length).trim() || location.name;
  return { zone: match.zone, name };
};

/**
 * Sorts the seed's locations into zones as checks. Copies of a shared item in the same zone, like
 * a check's winter and spring versions, become one check named after the first. Copies in
 * different zones stay separate checks, since each is somewhere the item can be found.
 *
 * @param locations - The locations from `readLocations`.
 * @returns The checks in location-table order.
 */
export const placeChecks = (locations: ReadonlyArray<SeedLocation>) => {
  const checks: SeedCheck[] = [];
  const sharedChecks = new Map<string, { indexes: number[]; locations: string[] }>();
  const countedItems = new Set<number>();

  for (const location of locations) {
    const { zone, name } = placeInZone(location);
    const { sharedItem } = location;

    if (sharedItem === null) {
      checks.push({
        indexes: [location.index],
        locations: [location.name],
        name,
        zone,
        countedElsewhere: false,
        item: location.item
      });
      continue;
    }

    // A later copy in the same zone joins the check made for the first.
    const key = `${sharedItem} ${zone}`;
    const sameZoneCheck = sharedChecks.get(key);
    if (sameZoneCheck) {
      sameZoneCheck.indexes.push(location.index);
      sameZoneCheck.locations.push(location.name);
      continue;
    }

    const check = {
      indexes: [location.index],
      locations: [location.name],
      name,
      zone,
      countedElsewhere: countedItems.has(sharedItem),
      item: location.item
    };
    countedItems.add(sharedItem);
    sharedChecks.set(key, check);
    checks.push(check);
  }

  return checks;
};
