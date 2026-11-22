import type { ChecksNeeds } from '../../../shared/tracker-state';

/**
 * Keeps what some blocked checks need, asking the main process again whenever the IDs change, since
 * a new item can change what a check needs. Answers are kept until new ones arrive, so rows don't
 * flicker. Call it while a component is being set up.
 *
 * @param ids - The blocked checks' IDs, read again whenever they change.
 * @returns The needs by check ID, under `current`.
 */
export const watchNeeds = (ids: () => ReadonlyArray<number>) => {
  let needs = $state<ChecksNeeds>({});

  $effect(() => {
    const asked = ids();
    if (asked.length === 0) return;

    let current = true;
    void window.api.findChecksNeeds([...asked]).then((result) => {
      if (current) needs = result;
    });

    return () => {
      current = false;
    };
  });

  return {
    get current() {
      return needs;
    }
  };
};
