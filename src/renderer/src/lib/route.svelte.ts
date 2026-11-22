import { createContext } from 'svelte';

import type { CheckState } from '../../../shared/tracker-state';

/**
 * Reads a seed's saved route. Storage can be missing or hold anything, so a bad save counts as no
 * route.
 *
 * @param key - Where the route is saved.
 * @returns The saved check IDs, in order.
 */
const readSaved = (key: string) => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(saved) ? saved.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
};

/**
 * The checks the player plans to do, in order. Each seed keeps its own route, saved in the page's
 * storage under the seed's path, since check IDs only mean something within one seed.
 */
export class Route {
  /** The stops' check IDs in order, collected ones included until they're cleared. */
  #ids = $state<Array<number>>([]);
  #key: string | null = null;
  readonly #checks: () => ReadonlyArray<CheckState>;

  readonly #stops = $derived.by(() => {
    const byId = new Map(this.#checks().map((check) => [check.id, check]));
    return this.#ids.flatMap((id) => byId.get(id) ?? []);
  });

  /** The stops still to do, in order. */
  readonly left = $derived(this.#stops.filter((check) => !check.collected));

  /** The stops already collected, in route order. */
  readonly completed = $derived(this.#stops.filter((check) => check.collected));

  readonly #numbers = $derived(new Map(this.left.map((check, at) => [check.id, at + 1])));

  /** @param checks - The seed's checks, read again whenever they change. */
  constructor(checks: () => ReadonlyArray<CheckState>) {
    this.#checks = checks;
  }

  /**
   * Switches to a seed's route.
   *
   * @param seedPath - The loaded seed's path, or null for no seed.
   */
  open(seedPath: string | null) {
    this.#key = seedPath && `route:${seedPath}`;
    this.#ids = this.#key ? readSaved(this.#key) : [];
  }

  /**
   * @param id - A check's ID.
   * @returns The check's place among the stops left, counting from 1, or undefined if it isn't one.
   */
  numberOf(id: number) {
    return this.#numbers.get(id);
  }

  /**
   * Adds a check to the end of the route, or takes it off if it's already there.
   *
   * @param id - The check's ID.
   */
  toggle(id: number) {
    this.#save(this.#ids.includes(id) ? this.#ids.filter((at) => at !== id) : [...this.#ids, id]);
  }

  /** @param id - The check to take off the route. */
  remove(id: number) {
    this.#save(this.#ids.filter((at) => at !== id));
  }

  /**
   * Moves a stop next to another one.
   *
   * @param id - The stop to move.
   * @param target - The stop it goes next to.
   * @param after - Whether it goes after the target instead of before.
   */
  move(id: number, target: number, after: boolean) {
    if (id === target) return;

    const ids = this.#ids.filter((at) => at !== id);
    ids.splice(ids.indexOf(target) + Number(after), 0, id);
    this.#save(ids);
  }

  /** Takes the collected stops off the route. */
  clearCompleted() {
    const completed = new Set(this.completed.map((check) => check.id));
    this.#save(this.#ids.filter((id) => !completed.has(id)));
  }

  #save(ids: Array<number>) {
    this.#ids = ids;
    if (!this.#key) return;

    // Not being able to save only costs the route on the next launch.
    try {
      localStorage.setItem(this.#key, JSON.stringify(ids));
    } catch {}
  }
}

/** The app's route, shared with the components that show or change it. */
export const [getRoute, setRoute] = createContext<Route>();
