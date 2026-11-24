import { Effect, FileSystem, Schema } from 'effect';

import { createLogicSeed } from '../logic/engine';
import { applyIpsPatch } from './ips';
import { readItemOverrides } from './item-overrides';
import { placeChecks } from './place-in-zone';
import { readSeedSettings } from './seed-settings';
import { readLocations } from './spoiler-data';

/** The seed file couldn't be read, for example because it doesn't exist. */
export class SeedFileUnreadable extends Schema.TaggedError<SeedFileUnreadable>()(
  'SeedFileUnreadable',
  { path: Schema.String, cause: Schema.Defect() }
) {}

/**
 * Loads a seed's checks and what logic needs from its `code.ips` patch.
 *
 * @param path - Path to the seed's `code.ips`.
 * @returns The seed's checks in location-table order, each sorted into its zone, and what logic
 * needs. Every logic mode uses the same rules: v1.5.1 has no glitched rules, and the no-logic and
 * vanilla modes only skip the rules when placing items, so the rules still say what's reachable.
 */
export const loadSeed = Effect.fn('loadSeed')(function* (path: string) {
  const fs = yield* FileSystem.FileSystem;
  const patch = yield* fs
    .readFile(path)
    .pipe(Effect.mapError((cause) => new SeedFileUnreadable({ path, cause })));

  const image = yield* applyIpsPatch(patch);
  const locations = yield* readLocations(image);
  const settings = yield* readSeedSettings(image);

  const logic = createLogicSeed(
    locations,
    readItemOverrides(image),
    settings.logicSettings,
    settings.startingItems
  );

  return { checks: placeChecks(locations), logic };
});
