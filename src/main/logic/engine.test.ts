import { readFileSync } from 'node:fs';

import { NodeFileSystem } from '@effect/platform-node';
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';

import { loadSeed } from '../seed/load-seed';
import { findLocationsInLogic } from './engine';

/**
 * A seed's `code.ips` and the spoiler log the generator wrote with it. Seeds and logs hold the
 * whole spoiler, so none are checked in; the test skips without them.
 */
const seedPath = process.env.MM3D_TEST_SEED;
const spoilerLogPath = process.env.MM3D_TEST_SPOILER_LOG;

const xmlEntities: Record<string, string> = { amp: '&', apos: "'", quot: '"', lt: '<', gt: '>' };

/**
 * Reads the playthrough from a spoiler log: the locations the generator expects to be reached, in
 * spheres, where each sphere only needs items from earlier ones.
 *
 * @param xml - The spoiler log.
 * @returns Each sphere's location names.
 */
const readPlaythrough = (xml: string) => {
  const playthrough = xml.slice(xml.indexOf('<playthrough>'), xml.indexOf('</playthrough>'));

  return playthrough
    .split('<sphere ')
    .slice(1)
    .map((sphere) =>
      [...sphere.matchAll(/<location name="([^"]*)"/g)].map(([, name = '']) =>
        name.replace(/&(\w+);/g, (entity, entityName: string) => xmlEntities[entityName] ?? entity)
      )
    );
};

describe.skipIf(!seedPath || !spoilerLogPath)('logic', () => {
  it("reaches each of the generator's spheres with only the checks from earlier ones", async () => {
    const seed = await loadSeed(seedPath ?? '').pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.runPromise
    );
    if (!seed.logic) throw new Error("The seed's settings aren't ones logic follows.");

    const spheres = readPlaythrough(readFileSync(spoilerLogPath ?? '', 'utf8'));
    expect(spheres.length).toBeGreaterThan(0);

    // Playthrough locations the seed's table leaves out count by themselves once in logic.
    const indexesByName = new Map(
      seed.checks.flatMap((check) =>
        check.locations.map((name, at) => [name, check.indexes[at] ?? -1] as const)
      )
    );

    const collected: number[] = [];
    for (const [sphere, names] of spheres.entries()) {
      const inLogic = findLocationsInLogic(seed.logic, collected);
      expect(
        names.filter((name) => !inLogic.has(name)),
        `sphere ${sphere + 1}`
      ).toEqual([]);

      collected.push(...names.flatMap((name) => indexesByName.get(name) ?? []));
    }
  });
});
