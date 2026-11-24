import { Effect, FileSystem, Schema } from 'effect';

import type { LogicNotFollowed } from '../../shared/tracker-state';
import { createLogicSeed } from '../logic/engine';
import { applyIpsPatch } from './ips';
import { readItemOverrides } from './item-overrides';
import { placeChecks } from './place-in-zone';
import { readSeedSettings, type SeedSettings } from './seed-settings';
import { readLocations } from './spoiler-data';

/** The seed file couldn't be read, for example because it doesn't exist. */
export class SeedFileUnreadable extends Schema.TaggedError<SeedFileUnreadable>()(
  'SeedFileUnreadable',
  { path: Schema.String, cause: Schema.Defect() }
) {}

/**
 * Finds why logic can't follow a seed's settings, if it can't.
 *
 * @param settings - The seed's settings.
 * @returns The setting logic doesn't follow, or null when it follows them all.
 */
const findLogicNotFollowed = (settings: SeedSettings): LogicNotFollowed | null => {
  if (settings.logic !== 'glitchless') return settings.logic;
  if (settings.dungeonEntranceShuffle) return 'dungeonEntranceShuffle';
  return null;
};

/**
 * Loads a seed's checks and what logic needs from its `code.ips` patch.
 *
 * @param path - Path to the seed's `code.ips`.
 * @returns The seed's checks in location-table order, each sorted into its zone, what logic needs
 * (null for settings logic doesn't follow: anything but glitchless logic, or shuffled dungeon
 * entrances), why logic doesn't follow it, and the starting items.
 */
export const loadSeed = Effect.fn('loadSeed')(function* (path: string) {
  const fs = yield* FileSystem.FileSystem;
  const patch = yield* fs
    .readFile(path)
    .pipe(Effect.mapError((cause) => new SeedFileUnreadable({ path, cause })));

  const image = yield* applyIpsPatch(patch);
  const locations = yield* readLocations(image);
  const settings = yield* readSeedSettings(image);

  const logicNotFollowed = findLogicNotFollowed(settings);
  const logic =
    logicNotFollowed === null
      ? createLogicSeed(
          locations,
          readItemOverrides(image),
          settings.logicSettings,
          settings.startingItems
        )
      : null;

  return {
    checks: placeChecks(locations),
    logic,
    logicNotFollowed,
    startingItems: settings.startingItems
  };
});
