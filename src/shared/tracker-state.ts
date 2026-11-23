import type { Inventory } from './inventory';
import type { TradeItem } from './items';
import type { ZoneId } from './zones';

/** One of the seed's checks. A shared item has one check per zone that gives it. */
export type CheckState = {
  /** Identifies the check to the main process, such as when asking what it needs. */
  readonly id: number;
  /** The check's name without its zone prefix. */
  readonly name: string;
  readonly zone: ZoneId;
  readonly collected: boolean;
  /**
   * Whether logic says the check can be reached with what's been found. Null until the game is
   * read, since nothing is known about what's been found. Always true for a seed whose settings
   * logic doesn't follow.
   */
  readonly inLogic: boolean | null;
  /** Whether a check in another zone already counts this shared item toward the overall total. */
  readonly countedElsewhere: boolean;
};

/** An item that would help bring a check into logic. */
export type NeededItem = {
  /** The generator's name for the item, such as `HOOKSHOT`, which picks its icon. */
  readonly key: string;
  readonly name: string;
  /** How many are needed, such as Skulltula tokens. Always 1 for an item that works alone. */
  readonly count: number;
};

/** What a check out of logic needs. Only items the player hasn't found yet are listed. */
export type CheckNeeds =
  /** Each of these brings the check into logic alone. */
  | { readonly kind: 'anyOf'; readonly items: ReadonlyArray<NeededItem> }
  /** No single item does, but these together do. There can be other ways too. */
  | { readonly kind: 'allOf'; readonly items: ReadonlyArray<NeededItem> }
  /** Logic can't reach the check even with every item. */
  | { readonly kind: 'unreachable' };

/** The needs of checks out of logic, by their `id`. */
export type ChecksNeeds = Readonly<Record<number, CheckNeeds>>;

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
  /**
   * Trade items the player has found, from collected checks and starting items, whether or not
   * they still have them. Empty until tracking, and for seeds whose settings logic doesn't follow.
   */
  readonly tradeItemsFound: ReadonlyArray<TradeItem>;
};
