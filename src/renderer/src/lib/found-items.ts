import { createContext } from 'svelte';

import type { CheckState, ItemSources, SourceId } from '../../../shared/tracker-state';

/** Where something in the inventory was found. */
export type FoundAt = {
  /** The checks that gave it, in the seed's order. */
  readonly checks: ReadonlyArray<CheckState>;
  readonly starting: boolean;
};

/**
 * Where the inventory's found items came from, and a way to open where one was found. Shared with
 * the inventory's tiles, wherever they are, through context.
 */
export class FoundItems {
  readonly #sources: () => ItemSources;
  readonly #checks: () => ReadonlyArray<CheckState>;

  /** Opens a check's zone with the check lit up. */
  readonly show: (check: CheckState) => void;

  /**
   * @param sources - Where the found parts of the inventory came from, from the tracker's state.
   * @param checks - The seed's checks, from the tracker's state.
   * @param show - Opens a check's zone with the check lit up.
   */
  constructor(
    sources: () => ItemSources,
    checks: () => ReadonlyArray<CheckState>,
    show: (check: CheckState) => void
  ) {
    this.#sources = sources;
    this.#checks = checks;
    this.show = show;
  }

  /**
   * Finds where something in the inventory was found.
   *
   * @param id - What the tile shows.
   * @returns The checks that gave it and whether it's a starting item. Neither for something only
   *   held, like a bomb bag bought in its usual shop.
   */
  where(id: SourceId): FoundAt {
    const sources = this.#sources()[id] ?? [];
    const checks = this.#checks();

    return {
      checks: sources.flatMap((source) => {
        const check = source === 'starting' ? undefined : checks[source];
        return check ? [check] : [];
      }),
      starting: sources.includes('starting')
    };
  }
}

export const [getFoundItems, setFoundItems] = createContext<FoundItems>();
