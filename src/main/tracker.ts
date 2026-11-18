import { Context, Effect, Layer, Stream } from 'effect';

import type { TrackerState } from '../shared/tracker-state';
import { GameConnection, type GameStatus } from './game/connection';
import { CurrentSeed, type SeedStatus } from './seed/current-seed';

/**
 * Combines the seed and the game into what the page shows.
 *
 * @param seed - The current seed status.
 * @param game - The current game status.
 * @returns The page's state.
 */
const toTrackerState = (seed: SeedStatus, game: GameStatus): TrackerState => {
  const snapshot = game.status === 'tracking' ? game.snapshot : null;
  const checks = seed.status === 'loaded' ? seed.checks : [];

  return {
    // The page gets the statuses without the data attached to them.
    seed: seed.status === 'loaded' ? { status: 'loaded', path: seed.path } : seed,
    game: game.status === 'tracking' ? { status: 'tracking' } : game,
    checks: checks.map((check) => ({
      name: check.name,
      zone: check.zone,
      collected: snapshot?.collected[check.index] === 1
    })),
    inventory: snapshot?.inventory ?? null
  };
};

/** Publishes what the page should show. */
export class Tracker extends Context.Service<
  Tracker,
  {
    /** The current state, then each change to it. */
    readonly changes: Stream.Stream<TrackerState>;
  }
>()('mm3d-tracker/main/Tracker') {
  /** Tracker live layer. */
  static readonly layer = Layer.effect(
    Tracker,
    Effect.gen(function* () {
      const seed = yield* CurrentSeed;
      const game = yield* GameConnection;

      const changes = Stream.zipLatest(seed.changes, game.changes).pipe(
        Stream.map(([seedStatus, gameStatus]) => toTrackerState(seedStatus, gameStatus)),
        // Polling republishes the game status every time, so only pass on real changes.
        Stream.changes
      );

      return Tracker.of({ changes });
    })
  ).pipe(Layer.provide(Layer.mergeAll(CurrentSeed.layer, GameConnection.layer)));
}
