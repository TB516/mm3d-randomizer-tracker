import * as NodeFileSystem from '@effect/platform-node/NodeFileSystem';
import { Context, Effect, FileSystem, Layer, Stream, SubscriptionRef } from 'effect';

import type { SeedState } from '../../shared/tracker-state';
import { describeDefect } from '../describe-defect';
import type { LogicSeed } from '../logic/engine';
import { Settings } from '../settings';
import type { InvalidIpsPatch } from './ips';
import { loadSeed, type SeedFileUnreadable } from './load-seed';
import type { SeedCheck } from './place-in-zone';
import type { SpoilerDataNotFound } from './spoiler-data';

/** The seed's state as the page sees it, with a loaded seed's checks and logic attached. */
export type SeedStatus =
  | Exclude<SeedState, { status: 'loaded' }>
  | {
      readonly status: 'loaded';
      readonly path: string;
      readonly checks: ReadonlyArray<SeedCheck>;
      readonly logic: LogicSeed;
    };

/**
 * Explains why a seed didn't load.
 *
 * @param error - Why loading failed.
 * @returns The message the page shows.
 */
const messageFor = (error: SeedFileUnreadable | InvalidIpsPatch | SpoilerDataNotFound) => {
  switch (error._tag) {
    case 'SeedFileUnreadable':
      return "Couldn't read the file.";
    case 'InvalidIpsPatch':
      return error.message;
    case 'SpoilerDataNotFound':
      return 'No seed data found in the patch. Is it from MM3D Randomizer v1.5.1?';
  }
};

/** The seed the tracker follows, which can be swapped while the app runs. */
export class CurrentSeed extends Context.Service<
  CurrentSeed,
  {
    /** The current seed status, then each change to it. */
    readonly changes: Stream.Stream<SeedStatus>;

    /**
     * Switches to a seed and remembers it for the next launch. A seed that doesn't load is
     * reported through `changes`, not as a failure.
     *
     * @param path - Path to the seed's `code.ips`.
     */
    readonly load: (path: string) => Effect.Effect<void>;
  }
>()('mm3d-tracker/main/CurrentSeed') {
  /** Current seed live layer. Loads the seed remembered from the last launch, if there is one. */
  static readonly layer = Layer.effect(
    CurrentSeed,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const settings = yield* Settings;
      const status = yield* SubscriptionRef.make<SeedStatus>({ status: 'none' });

      const load = Effect.fn('CurrentSeed.load')(
        function* (path: string) {
          yield* SubscriptionRef.set(status, { status: 'loading', path });

          const seed = yield* loadSeed(path);
          yield* SubscriptionRef.set(status, { status: 'loaded', path, ...seed });

          // Only a seed that loaded is worth coming back to.
          yield* settings.rememberSeedPath(path);
        },
        (effect, path) =>
          effect.pipe(
            Effect.catch((error) =>
              SubscriptionRef.set(status, { status: 'error', path, message: messageFor(error) })
            ),
            // Anything else is a bug. Report it rather than leave the page on "loading".
            Effect.catchDefect((defect) =>
              Effect.logError('Seed loading hit an unexpected error', defect).pipe(
                Effect.andThen(
                  SubscriptionRef.set(status, {
                    status: 'error',
                    path,
                    message: `Unexpected error: ${describeDefect(defect)}`
                  })
                )
              )
            ),
            Effect.provideService(FileSystem.FileSystem, fs)
          )
      );

      const rememberedPath = yield* settings.seedPath;
      if (rememberedPath) yield* Effect.forkScoped(load(rememberedPath));

      return CurrentSeed.of({ changes: SubscriptionRef.changes(status), load });
    })
  ).pipe(Layer.provide(Layer.mergeAll(Settings.layer, NodeFileSystem.layer)));
}
