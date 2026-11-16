import { Effect, FileSystem, Schema } from 'effect';

import { applyIpsPatch } from './ips';
import { readLocations } from './spoiler-data';

/** The seed file couldn't be read, for example because it doesn't exist. */
export class SeedFileUnreadable extends Schema.TaggedError<SeedFileUnreadable>()(
  'SeedFileUnreadable',
  { path: Schema.String, cause: Schema.Defect() }
) {}

/**
 * Loads a seed's checks from its `code.ips` patch.
 *
 * @param path - Path to the seed's `code.ips`.
 * @returns The seed's checks, as `readLocations` returns them.
 */
export const loadSeed = Effect.fn('loadSeed')(function* (path: string) {
  const fs = yield* FileSystem.FileSystem;
  const patch = yield* fs
    .readFile(path)
    .pipe(Effect.mapError((cause) => new SeedFileUnreadable({ path, cause })));

  const image = yield* applyIpsPatch(patch);
  return yield* readLocations(image);
});
