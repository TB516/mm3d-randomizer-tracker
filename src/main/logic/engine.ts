import type { SeedLocation } from '../seed/spoiler-data';
import {
  type ItemKey,
  type LogicVariable,
  itemKeys,
  items,
  itemsByGetItemId,
  locations
} from './generated/items';
import { areas } from './generated/rules';
import { createHas, type Has, type LogicSettings } from './has';

type Rule = (has: Has) => boolean;

/** An area from the generator's logic, as `scripts/convert-logic.mts` writes it. */
export type Area = {
  readonly name: string;
  /** Things that can happen here, like saving the old lady, which set a logic variable. */
  readonly events: ReadonlyArray<{ readonly event: LogicVariable; readonly rule: Rule }>;
  /** Locations here by their name in the seed, randomized or not. */
  readonly locations: ReadonlyArray<{ readonly location: string; readonly rule: Rule }>;
  readonly exits: ReadonlyArray<{ readonly to: string; readonly rule: Rule }>;
};

/** What logic needs from a seed. Items stay in the main process. */
export type LogicSeed = {
  readonly settings: LogicSettings;
  readonly startingItems: ReadonlyArray<ItemKey>;
  /**
   * The item at each of the seed's checks, by table index. Copies of a shared item are all
   * collected together, so only the first copy has an entry and the item counts once.
   */
  readonly checkItems: ReadonlyMap<number, ItemKey>;
  /** The item at each location the seed's table leaves out, which counts once it's in logic. */
  readonly otherItems: ReadonlyMap<string, ItemKey>;
};

/** Items by their name in the seed. A few names, like "Empty Bottle", are several items. */
const itemKeysByName = new Map<string, ItemKey[]>();
for (const key of itemKeys) {
  const { name } = items[key];
  itemKeysByName.set(name, [...(itemKeysByName.get(name) ?? []), key]);
}

/**
 * Works out the item at every location logic can count: the seed's checks by their item names,
 * and every other location from the seed's item overrides.
 *
 * @param seedLocations - The seed's checks from `readLocations`.
 * @param overrides - Get-item IDs by override key from `readItemOverrides`.
 * @param settings - The seed's settings that rules read.
 * @param startingItems - The items the player starts with.
 * @returns What logic needs from the seed.
 */
export const createLogicSeed = (
  seedLocations: ReadonlyArray<SeedLocation>,
  overrides: ReadonlyMap<string, number>,
  settings: LogicSettings,
  startingItems: ReadonlyArray<ItemKey>
): LogicSeed => {
  const checkItems = new Map<number, ItemKey>();
  const countedSharedItems = new Set<number>();
  // Items that share a name are handed out in turn, so two empty bottles are two different bottles.
  const namesSeen = new Map<string, number>();

  for (const location of seedLocations) {
    if (location.sharedItem !== null) {
      if (countedSharedItems.has(location.sharedItem)) continue;
      countedSharedItems.add(location.sharedItem);
    }

    const keys = itemKeysByName.get(location.item) ?? [];
    const seen = namesSeen.get(location.item) ?? 0;
    namesSeen.set(location.item, seen + 1);

    const key = keys[Math.min(seen, keys.length - 1)];
    if (key) checkItems.set(location.index, key);
  }

  /**
   * Works out what the seed put at a location it doesn't list.
   *
   * @param vanillaItem - The location's vanilla item.
   * @param overrideKey - Its override key, or null when other locations share it.
   * @returns The item, or null for nothing logic uses.
   */
  const otherItem = (vanillaItem: ItemKey | null, overrideKey: string | null) => {
    // A shared key has one override for several locations, so it can't say which is which.
    if (overrideKey === null) return vanillaItem;

    // No override means the generator didn't put anything here.
    const getItemId = overrides.get(overrideKey);
    if (getItemId === undefined) return null;

    // Null is an ID several items share, and a missing ID is an item logic doesn't use.
    const item = itemsByGetItemId[getItemId];
    return item === null ? vanillaItem : (item ?? null);
  };

  const checkNames = new Set(seedLocations.map((location) => location.name));
  const otherItems = new Map<string, ItemKey>();

  for (const [name, { vanillaItem, overrideKey }] of Object.entries(locations)) {
    const item = checkNames.has(name) ? null : otherItem(vanillaItem, overrideKey);
    if (item) otherItems.set(name, item);
  }

  return { settings, startingItems, checkItems, otherItems };
};

const areaByKey = new Map<string, Area>(Object.entries(areas));

/**
 * Finds every location in logic, the way the generator's `GetAccessibleLocations` searches: from
 * `ROOT`, follow exits whose rules pass, make events happen, and count the items at in-logic
 * locations the seed doesn't list, until nothing new opens up.
 *
 * @param seed - What logic needs from the seed.
 * @param collected - Table indexes of the checks the player has collected.
 * @param extraItems - Items to count as found on top of those, to see what they would open.
 * @returns The names of every location in logic.
 */
export const findLocationsInLogic = (
  seed: LogicSeed,
  collected: Iterable<number>,
  extraItems: Iterable<ItemKey> = []
) => {
  const counts = new Map<LogicVariable, number>();
  const give = (item: ItemKey) => {
    const { variable } = items[item];
    if (variable) counts.set(variable, (counts.get(variable) ?? 0) + 1);
  };

  seed.startingItems.forEach(give);
  for (const index of collected) {
    const item = seed.checkItems.get(index);
    if (item) give(item);
  }
  for (const item of extraItems) give(item);

  const reached = new Set(['ROOT']);
  const inLogic = new Set<string>();

  /**
   * Visits a reached area: makes its events happen, follows its exits, and finds its locations.
   *
   * @param area - The area.
   * @param has - What rules read.
   * @returns Whether an event or item changed what rules read.
   */
  const visit = (area: Area, has: Has) => {
    let changed = false;

    for (const { event, rule } of area.events) {
      if (counts.has(event) || !rule(has)) continue;
      counts.set(event, 1);
      changed = true;
    }

    for (const { to, rule } of area.exits) {
      if (!reached.has(to) && rule(has)) reached.add(to);
    }

    for (const { location, rule } of area.locations) {
      if (inLogic.has(location) || !rule(has)) continue;
      inLogic.add(location);

      const item = seed.otherItems.get(location);
      if (!item) continue;
      give(item);
      changed = true;
    }

    return changed;
  };

  let changed = true;
  while (changed) {
    changed = false;
    const has = createHas((variable) => counts.get(variable) ?? 0, seed.settings);

    // The set grows while it's walked, so newly reached areas get visited in this same pass.
    for (const key of reached) {
      const area = areaByKey.get(key);
      if (area && visit(area, has)) changed = true;
    }
  }

  return inLogic;
};
