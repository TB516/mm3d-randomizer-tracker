import type { Inventory } from './inventory';
import type { ZoneId } from './zones';

/** One of the seed's checks. Shared-item duplicates are already left out. */
export type CheckState = {
  /** The check's name without its zone prefix. */
  readonly name: string;
  readonly zone: ZoneId;
  readonly collected: boolean;
};

/** The seed the tracker follows. */
export type SeedState =
  | { readonly status: 'none' }
  | { readonly status: 'loading'; readonly path: string }
  | { readonly status: 'error'; readonly path: string; readonly message: string }
  | { readonly status: 'loaded'; readonly path: string };

/** How far the tracker got in reaching the game. */
export type GameState =
  | { readonly status: 'waitingForAzahar' }
  | { readonly status: 'waitingForGame' }
  | { readonly status: 'waitingForFile' }
  | { readonly status: 'tracking' }
  /** Tracking stopped on an unexpected error and stays stopped until it's restarted. */
  | { readonly status: 'failed'; readonly message: string };

/** Everything the page shows. The main process sends a new one whenever something changes. */
export type TrackerState = {
  readonly seed: SeedState;
  readonly game: GameState;
  /** The seed's checks. Empty without a loaded seed, and all uncollected until tracking. */
  readonly checks: ReadonlyArray<CheckState>;
  /** Null until tracking. */
  readonly inventory: Inventory | null;
};
