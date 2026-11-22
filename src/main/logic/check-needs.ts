import type { CheckNeeds, NeededItem } from '../../shared/tracker-state';
import { findLocationsInLogic, type LogicSeed } from './engine';
import { type ItemKey, itemKeys, items } from './generated/items';

/** A check to work out the needs of. Reaching any of its locations is enough. */
type NeedsQuery = { readonly id: number; readonly locations: ReadonlyArray<string> };

/**
 * Lists items for the page, merging items that share a name, like the different empty bottles.
 *
 * @param counts - How many of each item.
 * @returns The items in the generator's item order.
 */
const toNeededItems = (counts: ReadonlyMap<ItemKey, number>) => {
  const byName = new Map<string, NeededItem>();
  for (const key of itemKeys) {
    const count = counts.get(key);
    if (!count) continue;

    const { name } = items[key];
    byName.set(name, { key, name, count: (byName.get(name)?.count ?? 0) + count });
  }

  return [...byName.values()];
};

const expand = (counts: ReadonlyMap<ItemKey, number>) =>
  [...counts].flatMap(([item, count]) => Array.from({ length: count }, () => item));

const reaches = (inLogic: ReadonlySet<string>, check: NeedsQuery) =>
  check.locations.some((location) => inLogic.has(location));

/**
 * Finds one set of items that reaches a check. Starting from everything, it drops items in halves
 * while the rest still works, so the few items a check needs are found without trying every item
 * alone. Then each item that's kept is cut down to the fewest that still work. Logic only ever
 * opens more with more items, so both steps can search by halves.
 *
 * @param seed - What logic needs from the seed.
 * @param collected - Table indexes of the checks the player has collected.
 * @param everything - Every item still out there, which together reach the check.
 * @param check - The check.
 * @returns How many of each item the set has.
 */
const trimNeeded = (
  seed: LogicSeed,
  collected: ReadonlyArray<number>,
  everything: ReadonlyMap<ItemKey, number>,
  check: NeedsQuery
) => {
  const needed = new Map(everything);
  const works = () => reaches(findLocationsInLogic(seed, collected, expand(needed)), check);

  const dropUnneeded = (group: ReadonlyArray<ItemKey>) => {
    for (const item of group) needed.delete(item);
    if (works()) return;

    for (const item of group) needed.set(item, everything.get(item) ?? 0);
    if (group.length === 1) return;

    const half = Math.ceil(group.length / 2);
    dropUnneeded(group.slice(0, half));
    dropUnneeded(group.slice(half));
  };
  dropUnneeded([...everything.keys()]);

  for (const [item, count] of needed) {
    let fewest = 1;
    let most = count;
    while (fewest < most) {
      const middle = Math.floor((fewest + most) / 2);
      needed.set(item, middle);
      if (works()) most = middle;
      else fewest = middle + 1;
    }
    needed.set(item, fewest);
  }

  return needed;
};

/**
 * Works out which items would bring checks into logic. Only items the seed has and the player
 * hasn't found yet count, so it never suggests an item that isn't out there.
 *
 * @param seed - What logic needs from the seed.
 * @param collected - Table indexes of the checks the player has collected.
 * @param checks - The checks to work out.
 * @returns Each check out of logic by its ID: the items that each unlock it alone, or, when no
 *   single item does, one set of items that does it together. Checks in logic are left out.
 */
export const findChecksNeeds = (
  seed: LogicSeed,
  collected: ReadonlyArray<number>,
  checks: ReadonlyArray<NeedsQuery>
) => {
  const inLogicNow = findLocationsInLogic(seed, collected);
  const blocked = checks.filter((check) => !reaches(inLogicNow, check));
  const needs = new Map<number, CheckNeeds>();
  if (blocked.length === 0) return needs;

  // Everything still out there: the items at checks not collected yet, and at left-out locations
  // logic hasn't reached, which the search would otherwise count by itself.
  const collectedIndexes = new Set(collected);
  const missing = new Map<ItemKey, number>();
  const addMissing = (item: ItemKey) => missing.set(item, (missing.get(item) ?? 0) + 1);

  for (const [index, item] of seed.checkItems) {
    if (!collectedIndexes.has(index)) addMissing(item);
  }
  for (const [location, item] of seed.otherItems) {
    if (!inLogicNow.has(location)) addMissing(item);
  }

  // One search per item answers every check at once.
  const singles = new Map<number, Map<ItemKey, number>>();
  for (const item of missing.keys()) {
    const inLogic = findLocationsInLogic(seed, collected, [item]);
    for (const check of blocked) {
      if (!reaches(inLogic, check)) continue;
      singles.set(check.id, (singles.get(check.id) ?? new Map()).set(item, 1));
    }
  }

  const inLogicWithEverything = findLocationsInLogic(seed, collected, expand(missing));

  for (const check of blocked) {
    const single = singles.get(check.id);
    if (single) {
      needs.set(check.id, { kind: 'anyOf', items: toNeededItems(single) });
      continue;
    }

    // Like the Moon's bombchu rooms, which no item opens in the generator's logic either.
    if (!reaches(inLogicWithEverything, check)) {
      needs.set(check.id, { kind: 'unreachable' });
      continue;
    }

    needs.set(check.id, {
      kind: 'allOf',
      items: toNeededItems(trimNeeded(seed, collected, missing, check))
    });
  }

  return needs;
};
