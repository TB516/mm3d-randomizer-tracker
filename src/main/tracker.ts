import { Context, Effect, Layer, Stream } from 'effect';

import type { TrackerState } from '../shared/tracker-state';
import { GameConnection, type GameStatus } from './game/connection';
import { findLocationsInLogic } from './logic/engine';
import { CurrentSeed, type SeedStatus } from './seed/current-seed';
import type { SeedCheck } from './seed/place-in-zone';

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
  const logic = seed.status === 'loaded' ? seed.logic : null;

  // The game marks every copy of a shared item together, but any one is enough.
  const collected = checks.map((check) =>
    check.indexes.some((index) => snapshot?.collected[index] === 1)
  );
  const locationsInLogic =
    snapshot && logic
      ? findLocationsInLogic(
          logic,
          checks.flatMap((check, at) => (collected[at] ? check.indexes : []))
        )
      : null;

  /**
   * Works out whether logic can reach a check.
   *
   * @param check - The check.
   * @returns Null until the game is read, since nothing is known about what's been found.
   */
  const inLogic = (check: SeedCheck) => {
    if (!snapshot) return null;

    // A seed whose settings logic doesn't follow shows everything as reachable.
    if (!locationsInLogic) return true;

    // A check made of several copies is in logic when any of them is.
    return check.locations.some((location) => locationsInLogic.has(location));
  };

  return {
    // The page gets the statuses without the data attached to them.
    seed: seed.status === 'loaded' ? { status: 'loaded', path: seed.path } : seed,
    game: game.status === 'tracking' ? { status: 'tracking' } : game,
    checks: checks.map((check, at) => ({
      name: check.name,
      zone: check.zone,
      collected: collected[at] ?? false,
      inLogic: inLogic(check),
      countedElsewhere: check.countedElsewhere
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
