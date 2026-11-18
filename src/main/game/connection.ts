import { Context, Effect, FiberHandle, Layer, Schedule, Stream, SubscriptionRef } from 'effect';

import type { Inventory } from '../../shared/inventory';
import type { GameState } from '../../shared/tracker-state';
import {
  AzaharRpc,
  type AzaharNotResponding,
  type AzaharSocketClosed,
  type MemoryReadFailed
} from '../azahar/rpc';
import { describeDefect } from '../describe-defect';
import { type ExtSaveDataNotFound, findExtSaveData, readRandomizerData } from './ext-save-data';
import { decodeInventory, saveDataAddress, saveDataSize } from './save-data';
import { type GameNotRunning, selectGame } from './select-game';

/** How often the game is read while tracking. */
const pollInterval = '500 millis';
/** How long to wait after losing the game before trying to reach it again. */
const retryInterval = '2 seconds';

type TrackingError =
  | AzaharNotResponding
  | AzaharSocketClosed
  | MemoryReadFailed
  | GameNotRunning
  | ExtSaveDataNotFound;

/** What one read of the game found. */
export type GameSnapshot = {
  /** One byte per slot in the seed's location table, 1 once collected. */
  readonly collected: Uint8Array;
  readonly inventory: Inventory;
};

/** The game's state as the page sees it, with the latest read attached while tracking. */
export type GameStatus =
  | Exclude<GameState, { status: 'tracking' }>
  | { readonly status: 'tracking'; readonly snapshot: GameSnapshot };

/**
 * Turns the error that stopped tracking into the status the page shows while it retries.
 *
 * @param error - Why tracking stopped.
 * @returns The waiting status for that error.
 */
const statusFor = (error: TrackingError): GameStatus => {
  switch (error._tag) {
    // A closed socket is gone with this attempt, and the next attempt opens a new one.
    case 'AzaharNotResponding':
    case 'AzaharSocketClosed':
      return { status: 'waitingForAzahar' };
    // A failed read means the selected process is gone, so the game was closed.
    case 'GameNotRunning':
    case 'MemoryReadFailed':
      return { status: 'waitingForGame' };
    case 'ExtSaveDataNotFound':
      return { status: 'waitingForFile' };
  }
};

/** Reaches the game through Azahar and keeps reading it. Knows nothing about seeds. */
export class GameConnection extends Context.Service<
  GameConnection,
  {
    /** The current game status, then each change to it. */
    readonly changes: Stream.Stream<GameStatus>;

    /** Drops the connection to the game and starts reaching it again from scratch. */
    readonly restart: Effect.Effect<void>;
  }
>()('mm3d-tracker/main/GameConnection') {
  /** Game connection live layer. Starts reaching the game in the background. */
  static readonly layer = Layer.effect(
    GameConnection,
    Effect.gen(function* () {
      const status = yield* SubscriptionRef.make<GameStatus>({ status: 'waitingForAzahar' });
      // Holds the one running `connect`, so starting another stops the last.
      const running = yield* FiberHandle.make();

      /**
       * Reads the game once and publishes what it found.
       *
       * @param extSaveDataAddress - Where the randomizer data is, from `findExtSaveData`.
       */
      const poll = Effect.fn('GameConnection.poll')(function* (extSaveDataAddress: number) {
        const rpc = yield* AzaharRpc;
        const { collected, tradeItems } = yield* readRandomizerData(extSaveDataAddress);
        const save = yield* rpc.readMemory(saveDataAddress, saveDataSize);

        yield* SubscriptionRef.set(status, {
          status: 'tracking',
          snapshot: { collected, inventory: decodeInventory(save, tradeItems) }
        });
      });

      /** One attempt at tracking: reach the game, then read it until something fails. */
      const track = Effect.gen(function* () {
        yield* selectGame;
        const extSaveDataAddress = yield* findExtSaveData();

        yield* poll(extSaveDataAddress).pipe(Effect.repeat(Schedule.spaced(pollInterval)));
      });

      /**
       * Keeps tracking, reporting why each attempt ended and starting another. Only finishes on an
       * unexpected error, which it reports as `failed`.
       */
      const connect = track.pipe(
        // Each attempt opens its own socket and closes it on the way out, so a broken socket never
        // outlives the attempt that broke it.
        Effect.provide(AzaharRpc.layer, { local: true }),
        // The other errors are everyday waiting. A closed socket shouldn't happen, so record why.
        Effect.tapErrorTag('AzaharSocketClosed', (error) =>
          Effect.logError('Azahar socket closed', error.cause)
        ),
        Effect.tapError((error) => SubscriptionRef.set(status, statusFor(error))),
        Effect.retry(Schedule.spaced(retryInterval)),
        // Anything else is a bug, and would likely hit again on a retry. Stop until restarted.
        Effect.catchDefect((defect) =>
          Effect.logError('Tracking stopped', defect).pipe(
            Effect.andThen(
              SubscriptionRef.set(status, { status: 'failed', message: describeDefect(defect) })
            )
          )
        )
      );

      const restart = SubscriptionRef.set(status, { status: 'waitingForAzahar' }).pipe(
        Effect.andThen(FiberHandle.run(running, connect)),
        Effect.asVoid
      );

      yield* restart;

      return GameConnection.of({ changes: SubscriptionRef.changes(status), restart });
    })
  );
}
