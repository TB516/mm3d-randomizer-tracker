import { Effect } from 'effect';

import type { ItemKey } from '../logic/generated/items';
import type { LogicSettings } from '../logic/has';
import { SpoilerDataNotFound } from './spoiler-data';

/**
 * Where `gSettingsContext` sits in a v1.5.1 seed's patched image (the generator writes it at
 * `GSETTINGSCONTEXT_ADDR - 0x100000`).
 */
const settingsAddress = 0x7c387c;
const settingsSize = 192;

/**
 * Where each field this reads starts, from `SettingsContext` in mm3dr's `rnd/settings.h`. Every
 * field there is a u8 except a few u32s and one u16, which shift the later fields for alignment.
 */
const fields = {
  mapsAndCompasses: 26,
  keysanity: 27,
  bossKeysanity: 28,
  skipBombersMinigame: 31,
  itemPoolValue: 44,
  startingNotebook: 62,
  startingOcarina: 63,
  startingHerosBow: 64,
  startingFireArrows: 65,
  startingIceArrows: 66,
  startingLightArrows: 67,
  startingBombBag: 68,
  startingMagicBean: 72,
  startingPowderKeg: 73,
  startingPictographBox: 74,
  startingLensOfTruth: 75,
  startingHookshot: 76,
  startingGreatFairySword: 77,
  startingBottle1: 78,
  startingBottle2: 79,
  startingBottle3: 80,
  startingBottle4: 81,
  startingBottle5: 82,
  startingBottle6: 83,
  startingBottle7: 84,
  startingKokiriSword: 85,
  startingShield: 86,
  startingMagicMeter: 87,
  startingDoubleDefense: 88,
  startingHealth: 89,
  startingOathToOrder: 92,
  startingEponasSong: 93,
  startingSongOfStorms: 94,
  startingSonataOfAwakening: 95,
  startingGoronsLullaby: 96,
  startingNewWaveBossaNova: 97,
  startingElegyOfEmptiness: 98,
  startingSongOfSoaring: 99,
  startingSongOfHealing: 100,
  startingWallet: 101,
  startingOdolwaRemains: 102,
  startingGohtRemains: 103,
  startingGyorgRemains: 104,
  startingTwinmoldRemains: 105,
  startingSwampTokens: 106,
  startingOceanTokens: 107,
  startingDekuMask: 108,
  startingGoronMask: 109,
  startingZoraMask: 110,
  startingBunnyHood: 111,
  startingKeatonMask: 112,
  startingPostmanHat: 113,
  startingAllNightMask: 114,
  startingBlastMask: 115,
  startingStoneMask: 116,
  startingGreatFairyMask: 117,
  startingBremenMask: 118,
  startingDonGerosMask: 119,
  startingMaskOfScents: 120,
  startingRomanisMask: 121,
  startingCircusLeadersMask: 122,
  startingKafeiMask: 123,
  startingCouplesMask: 124,
  startingKamarosMask: 125,
  startingGibdosMask: 126,
  startingGaroMask: 127,
  startingCaptainsHat: 128,
  startingGiantsMask: 129,
  startingFierceDeityMask: 130,
  startingMaskOfTruth: 131,
  masksNeededToEnterMoon: 185,
  masksNeededForVictory: 186
} as const;

type Field = keyof typeof fields;

/** The value keys, maps and compasses, and boss keys settings use for "start with". */
const startWith = 1;

/**
 * Starting items the generator adds once per step of a setting, like a bow for each quiver
 * level. Mirrors `GenerateStartingInventory` in the generator's `starting_inventory.cpp`.
 */
const countedStartingItems: ReadonlyArray<readonly [Field, ItemKey]> = [
  ['startingBombBag', 'PROGRESSIVE_BOMB_BAG'],
  ['startingHerosBow', 'PROGRESSIVE_BOW'],
  ['startingFireArrows', 'FIRE_ARROWS'],
  ['startingIceArrows', 'ICE_ARROWS'],
  ['startingLightArrows', 'LIGHT_ARROWS'],
  ['startingLensOfTruth', 'LENS_OF_TRUTH'],
  ['startingMagicBean', 'MAGIC_BEAN'],
  ['startingHookshot', 'HOOKSHOT'],
  ['startingPowderKeg', 'POWDER_KEG'],
  ['startingPictographBox', 'PICTOGRAPH_BOX'],
  ['startingNotebook', 'BOMBERS_NOTEBOOK'],
  ['startingOcarina', 'OCARINA_OF_TIME'],
  ['startingOathToOrder', 'OATH_TO_ORDER'],
  ['startingEponasSong', 'EPONAS_SONG'],
  ['startingSongOfStorms', 'SONG_OF_STORMS'],
  ['startingSonataOfAwakening', 'SONATA_OF_AWAKENING'],
  ['startingGoronsLullaby', 'PROGRESSIVE_LULLABY'],
  ['startingNewWaveBossaNova', 'NEW_WAVE_BOSSA_NOVA'],
  ['startingElegyOfEmptiness', 'ELEGY_OF_EMPTINESS'],
  ['startingSongOfHealing', 'SONG_OF_HEALING'],
  ['startingSongOfSoaring', 'SONG_OF_SOARING'],
  ['startingGreatFairySword', 'GREAT_FAIRYS_SWORD'],
  ['startingMagicMeter', 'PROGRESSIVE_MAGIC_METER'],
  ['startingWallet', 'PROGRESSIVE_WALLET'],
  ['startingDoubleDefense', 'DOUBLE_DEFENSE'],
  ['startingOdolwaRemains', 'ODOLWAS_REMAINS'],
  ['startingGohtRemains', 'GOHTS_REMAINS'],
  ['startingGyorgRemains', 'GYORGS_REMAINS'],
  ['startingTwinmoldRemains', 'TWINMOLDS_REMAINS'],
  ['startingSwampTokens', 'SWAMP_SKULLTULA_TOKEN'],
  ['startingOceanTokens', 'OCEANSIDE_SKULLTULA_TOKEN'],
  ['startingDekuMask', 'DEKU_MASK'],
  ['startingGoronMask', 'GORON_MASK'],
  ['startingZoraMask', 'ZORA_MASK'],
  ['startingBunnyHood', 'BUNNY_HOOD'],
  ['startingKeatonMask', 'KEATON_MASK'],
  ['startingPostmanHat', 'POSTMANS_HAT'],
  ['startingAllNightMask', 'ALL_NIGHT_MASK'],
  ['startingBlastMask', 'BLAST_MASK'],
  ['startingStoneMask', 'STONE_MASK'],
  ['startingGreatFairyMask', 'GREAT_FAIRYS_MASK'],
  ['startingBremenMask', 'BREMEN_MASK'],
  ['startingDonGerosMask', 'DON_GEROS_MASK'],
  ['startingMaskOfScents', 'MASK_OF_SCENTS'],
  ['startingRomanisMask', 'ROMANIS_MASK'],
  ['startingCircusLeadersMask', 'CIRCUS_LEADERS_MASK'],
  ['startingKafeiMask', 'KAFEIS_MASK'],
  ['startingCouplesMask', 'COUPLES_MASK'],
  ['startingKamarosMask', 'KAMAROS_MASK'],
  ['startingGibdosMask', 'GIBDOS_MASK'],
  ['startingGaroMask', 'GAROS_MASK'],
  ['startingCaptainsHat', 'CAPTAINS_HAT'],
  ['startingGiantsMask', 'GIANTS_MASK'],
  ['startingFierceDeityMask', 'FIERCE_DEITY_MASK'],
  ['startingMaskOfTruth', 'MASK_OF_TRUTH']
];

/** Starting bottles, which the settings store as on or off. */
const startingBottles: ReadonlyArray<readonly [Field, ItemKey]> = [
  ['startingBottle1', 'EMPTY_BOTTLE1'],
  ['startingBottle2', 'EMPTY_BOTTLE2'],
  ['startingBottle3', 'BOTTLE_WITH_MILK'],
  ['startingBottle4', 'BOTTLE_WITH_RED_POTION'],
  ['startingBottle5', 'GOLD_DUST'],
  ['startingBottle6', 'CHATEAU_ROMANI'],
  ['startingBottle7', 'BOTTLE_WITH_MYSTERY_MILK']
];

/** Each temple's own items, with how many small keys it has. From the generator's `dungeon.cpp`. */
const templeItems: ReadonlyArray<{
  readonly smallKey: ItemKey;
  readonly smallKeys: number;
  readonly bossKey: ItemKey;
  readonly map: ItemKey;
  readonly compass: ItemKey;
}> = [
  {
    smallKey: 'WOODFALL_TEMPLE_SMALL_KEY',
    smallKeys: 1,
    bossKey: 'WOODFALL_TEMPLE_BOSS_KEY',
    map: 'WOODFALL_TEMPLE_MAP',
    compass: 'WOODFALL_TEMPLE_COMPASS'
  },
  {
    smallKey: 'SNOWHEAD_TEMPLE_SMALL_KEY',
    smallKeys: 3,
    bossKey: 'SNOWHEAD_TEMPLE_BOSS_KEY',
    map: 'SNOWHEAD_TEMPLE_MAP',
    compass: 'SNOWHEAD_TEMPLE_COMPASS'
  },
  {
    smallKey: 'GBT_SMALL_KEY',
    smallKeys: 1,
    bossKey: 'GBT_BOSS_KEY',
    map: 'GBT_MAP',
    compass: 'GBT_COMPASS'
  },
  {
    smallKey: 'STONE_TOWER_TEMPLE_SMALL_KEY',
    smallKeys: 4,
    bossKey: 'STONE_TOWER_TEMPLE_BOSS_KEY',
    map: 'STONE_TOWER_TEMPLE_MAP',
    compass: 'STONE_TOWER_TEMPLE_COMPASS'
  }
];

/** What logic needs from a seed's settings. */
export type SeedSettings = {
  readonly logicSettings: LogicSettings;
  /** Every item the player starts with, once per copy. */
  readonly startingItems: ReadonlyArray<ItemKey>;
};

/**
 * Works out the starting hearts. Mirrors the end of `GenerateStartingInventory`: fewer than three
 * hearts still counts a heart's worth of pieces, and extra hearts are containers up to how many
 * the item pool has, then pieces.
 *
 * @param read - Reads a settings field.
 * @returns The heart items to start with.
 */
const startingHearts = (read: (field: Field) => number): ItemKey[] => {
  // The settings store the starting hearts plus one, so this is the change from three.
  const extraHearts = read('startingHealth') - 3;
  if (extraHearts < 0) return Array<ItemKey>(4).fill('PIECE_OF_HEART');

  const poolContainers = 8 * Math.max(0, 2 - read('itemPoolValue'));
  const containers = Math.min(extraHearts, poolContainers);
  const pieces = (extraHearts - containers) * 4;
  return [
    ...Array<ItemKey>(containers).fill('HEART_CONTAINER'),
    ...Array<ItemKey>(pieces).fill('PIECE_OF_HEART')
  ];
};

/**
 * Reads the settings logic needs from a patched image.
 *
 * @param image - The output of `applyIpsPatch` for the seed's `code.ips`.
 * @returns The settings, with the starting items worked out.
 */
export const readSeedSettings = Effect.fn('readSeedSettings')(function* (image: Uint8Array) {
  if (image.length < settingsAddress + settingsSize) return yield* new SpoilerDataNotFound();

  const read = (field: Field) => image[settingsAddress + fields[field]] ?? 0;
  const repeat = (item: ItemKey, times: number) => Array<ItemKey>(times).fill(item);

  // A sword setting of 1 or 2 starts with that many swords; anything else starts with none.
  const swords = read('startingKokiriSword');
  const shields: Partial<Record<number, ItemKey>> = { 0: 'HEROS_SHIELD', 1: 'MIRROR_SHIELD' };
  const shield = shields[read('startingShield')];

  const startingItems: ItemKey[] = [
    ...templeItems.flatMap((temple) => [
      ...(read('mapsAndCompasses') === startWith ? [temple.map, temple.compass] : []),
      ...(read('keysanity') === startWith ? repeat(temple.smallKey, temple.smallKeys) : []),
      ...(read('bossKeysanity') === startWith ? [temple.bossKey] : [])
    ]),
    ...countedStartingItems.flatMap(([field, item]) => repeat(item, read(field))),
    ...startingBottles.flatMap(([field, item]) => (read(field) ? [item] : [])),
    ...repeat('PROGRESSIVE_SWORD', swords === 1 || swords === 2 ? swords : 0),
    ...(shield ? [shield] : []),
    ...startingHearts(read)
  ];

  const settings: SeedSettings = {
    logicSettings: {
      skipBombersMinigame: read('skipBombersMinigame') === 1,
      remainsForMoon: read('masksNeededToEnterMoon'),
      remainsForMajora: read('masksNeededForVictory')
    },
    startingItems
  };
  return settings;
});
