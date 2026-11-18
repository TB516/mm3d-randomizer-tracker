import { type ZoneId, zones } from '../../shared/zones';
import type { SeedLocation } from './spoiler-data';

/** A check in the seed, sorted into its zone. */
export type SeedCheck = {
  /** Position in the seed's location table, which the game's collected flags also use. */
  readonly index: number;
  /** The check's name without its zone prefix, since the zone is shown alongside it. */
  readonly name: string;
  readonly zone: ZoneId;
};

/** Every zone prefix, longest first, so `Woodfall Temple` wins over a shorter prefix. */
const prefixes = zones
  .flatMap((zone) => zone.prefixes.map((prefix) => ({ prefix, zone: zone.id })))
  .toSorted((a, b) => b.prefix.length - a.prefix.length);

/**
 * Sorts a seed location into the zone its name starts with.
 *
 * @param location - A location from `readLocations`.
 * @returns The check with its zone, or in `other` if no prefix matches.
 */
export const placeInZone = (location: SeedLocation): SeedCheck => {
  const match = prefixes.find(({ prefix }) => location.name.startsWith(prefix));
  if (!match) return { index: location.index, name: location.name, zone: 'other' };

  // Some names are only the prefix, like `Song of Time`, so keep those whole.
  const name = location.name.slice(match.prefix.length).trim() || location.name;
  return { index: location.index, name, zone: match.zone };
};
