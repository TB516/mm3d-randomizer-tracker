import { Context, Effect, FiberHandle, Layer, Option, Stream } from 'effect';

import { type TradeItem, tradeItems } from '../shared/items';
import type { CheckNeeds, ChecksNeeds, TrackerState } from '../shared/tracker-state';
import { GameConnection, type GameStatus } from './game/connection';
import { findChecksNeeds } from './logic/check-needs';
import { findLocationsInLogic, type LogicSeed } from './logic/engine';
import type { ItemKey } from './logic/generated/items';
import { CurrentSeed, type SeedStatus } from './seed/current-seed';
import type { SeedCheck } from './seed/place-in-zone';

/**
 * Finds which of the seed's checks the game says are collected.
 *
 * @param checks - The seed's checks.
 * @param game - The current game status.
 * @returns Whether each check is collected, and the table indexes of every collected copy.
 */
const findCollected = (checks: ReadonlyArray<SeedCheck>, game: GameStatus) => {
  const snapshot = game.status === 'tracking' ? game.snapshot : null;

  // The game marks every copy of a shared item together, but any one is enough.
  const collected = checks.map((check) =>
    check.indexes.some((index) => snapshot?.collected[index] === 1)
  );
  const indexes = checks.flatMap((check, at) => (collected[at] ? check.indexes : []));

  return { collected, indexes };
};

/** The generator's keys for the trade items. */
const tradeItemKeys: Readonly<Record<TradeItem, ItemKey>> = {
  MoonTear: 'MOONS_TEAR',
  LandTitleDeed: 'LAND_TITLE',
  SwampTitleDeed: 'SWAMP_TITLE',
  MountainTitleDeed: 'MOUNTAIN_TITLE',
  OceanTitleDeed: 'OCEAN_TITLE',
  RoomKey: 'ROOM_KEY',
  LetterToKafei: 'LETTER_KAFEI',
  PendantOfMemories: 'PENDANT_MEMORIES',
  LetterToMama: 'LETTER_MAMA'
};

/**
 * Finds the trade items the player has found, so ones traded away can still show as found. Only
 * collected checks count, so this never tells the player anything they haven't picked up.
 *
 * @param logic - What logic knows about the seed, including what each check holds.
 * @param collected - Table indexes of the collected checks.
 * @returns The trade items found, held or not.
 */
const findTradeItemsFound = (logic: LogicSeed, collected: ReadonlyArray<number>) => {
  const found = new Set([
    ...logic.startingItems,
    ...collected.flatMap((index) => logic.checkItems.get(index) ?? [])
  ]);
  return tradeItems.filter((item) => found.has(tradeItemKeys[item]));
};

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

  const { collected, indexes } = findCollected(checks, game);
  const locationsInLogic = snapshot && logic ? findLocationsInLogic(logic, indexes) : null;

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
      id: at,
      name: check.name,
      zone: check.zone,
      collected: collected[at] ?? false,
      inLogic: inLogic(check),
      countedElsewhere: check.countedElsewhere
    })),
    inventory: snapshot?.inventory ?? null,
    tradeItemsFound: snapshot && logic ? findTradeItemsFound(logic, indexes) : []
  };
};

/** Publishes what the page should show. */
export class Tracker extends Context.Service<
  Tracker,
  {
    /** The current state, then each change to it. */
    readonly changes: Stream.Stream<TrackerState>;

    /**
     * Works out what checks out of logic need, from the seed and game as they are now.
     *
     * @param ids - The checks' `id`s from the state.
     * @returns The checks out of logic and not collected, by ID. Empty when logic isn't followed.
     */
    readonly findNeeds: (ids: ReadonlyArray<number>) => Effect.Effect<ChecksNeeds>;
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

      // Needs only change when the seed or the collected checks do, so they're kept until then.
      let cache: {
        readonly seed: SeedStatus | null;
        /** The collected table indexes, joined. */
        readonly collected: string;
        readonly needs: Map<number, CheckNeeds>;
      } = { seed: null, collected: '', needs: new Map() };

      const findNeeds = Effect.fn('findNeeds')(function* (ids: ReadonlyArray<number>) {
        // Both streams start with their current status.
        const current = yield* Stream.runHead(Stream.zipLatest(seed.changes, game.changes));
        if (Option.isNone(current)) return {};

        const [seedStatus, gameStatus] = current.value;
        if (seedStatus.status !== 'loaded' || !seedStatus.logic) return {};
        if (gameStatus.status !== 'tracking') return {};

        const { checks, logic } = seedStatus;
        const { collected, indexes } = findCollected(checks, gameStatus);
        const collectedKey = indexes.join(' ');
        if (cache.seed !== seedStatus || cache.collected !== collectedKey) {
          cache = { seed: seedStatus, collected: collectedKey, needs: new Map() };
        }

        const unknown = ids.flatMap((id) => {
          const check = checks[id];
          return check && !collected[id] && !cache.needs.has(id)
            ? [{ id, locations: check.locations }]
            : [];
        });
        for (const [id, needs] of findChecksNeeds(logic, indexes, unknown)) {
          cache.needs.set(id, needs);
        }

        return Object.fromEntries(
          ids.flatMap((id) => {
            const needs = cache.needs.get(id);
            return needs ? [[id, needs] as const] : [];
          })
        );
      });

      /**
       * Works out every zone's needs ahead of time, so opening a zone shows them at once. One zone
       * at a time, with a pause between, so reading the game and answering the page never wait
       * long. Each zone uses the seed and game as they are by then.
       *
       * @param checks - The seed's checks.
       */
      const findAllNeeds = Effect.fn('findAllNeeds')(function* (checks: ReadonlyArray<SeedCheck>) {
        const idsByZone = Map.groupBy(checks.keys(), (id) => checks[id]?.zone);
        for (const ids of idsByZone.values()) {
          yield* Effect.sleep('1 millis');
          yield* findNeeds(ids);
        }
      });

      // Starts again whenever the seed or the collected checks change, dropping a run that's out
      // of date.
      const findingAllNeeds = yield* FiberHandle.make();
      yield* Stream.zipLatest(seed.changes, game.changes).pipe(
        Stream.map(([seedStatus, gameStatus]) => ({
          seedStatus,
          // Null until tracking, so reaching a new file with nothing collected still counts.
          collected:
            seedStatus.status === 'loaded' && gameStatus.status === 'tracking'
              ? findCollected(seedStatus.checks, gameStatus).indexes.join(' ')
              : null
        })),
        Stream.changesWith((a, b) => a.seedStatus === b.seedStatus && a.collected === b.collected),
        Stream.runForEach(({ seedStatus }) =>
          seedStatus.status === 'loaded'
            ? FiberHandle.run(findingAllNeeds, findAllNeeds(seedStatus.checks))
            : FiberHandle.clear(findingAllNeeds)
        ),
        Effect.forkScoped
      );

      return Tracker.of({ changes, findNeeds });
    })
  ).pipe(Layer.provide(Layer.mergeAll(CurrentSeed.layer, GameConnection.layer)));
}
