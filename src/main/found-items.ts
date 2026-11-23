import type { DungeonItems, DungeonPart, Inventory, Upgrade } from '../shared/inventory';
import {
  type BossRemains,
  type InventoryItem,
  type Song,
  shields,
  swords,
  type Temple,
  temples
} from '../shared/items';
import type { ItemSource, ItemSources, SourceId } from '../shared/tracker-state';
import type { ItemKey } from './logic/generated/items';

/** What finding an item adds to the inventory. */
type Find =
  | { readonly kind: 'item' | 'mask' | 'trade'; readonly item: InventoryItem }
  | { readonly kind: 'song'; readonly song: Song }
  /** The Goron Lullaby comes in two halves: the intro, then the full song. */
  | { readonly kind: 'lullaby'; readonly part: 'intro' | 'full' | 'next' }
  | { readonly kind: 'remains'; readonly remains: BossRemains }
  | { readonly kind: 'notebook' }
  /** An upgrade to a level, or a progressive one to the level after the last found. */
  | { readonly kind: 'upgrade'; readonly upgrade: Upgrade; readonly level: number | 'next' }
  | { readonly kind: 'dungeon'; readonly temple: Temple; readonly part: DungeonPart };

const item = (inventoryItem: InventoryItem): Find => ({ kind: 'item', item: inventoryItem });
const mask = (inventoryItem: InventoryItem): Find => ({ kind: 'mask', item: inventoryItem });
const trade = (inventoryItem: InventoryItem): Find => ({ kind: 'trade', item: inventoryItem });
const song = (name: Song): Find => ({ kind: 'song', song: name });
const remains = (name: BossRemains): Find => ({ kind: 'remains', remains: name });
const upgrade = (name: Upgrade, level: number | 'next'): Find => ({
  kind: 'upgrade',
  upgrade: name,
  level
});

/** Each temple's prefix in the generator's item keys. */
const templePrefixes: Readonly<Record<Temple, string>> = {
  Woodfall: 'WOODFALL_TEMPLE',
  Snowhead: 'SNOWHEAD_TEMPLE',
  GreatBay: 'GBT',
  StoneTower: 'STONE_TOWER_TEMPLE'
};

/** Each dungeon part's suffix in the generator's item keys. */
const dungeonParts = [
  ['smallKey', 'SMALL_KEY'],
  ['bossKey', 'BOSS_KEY'],
  ['map', 'MAP'],
  ['compass', 'COMPASS']
] as const satisfies ReadonlyArray<readonly [DungeonPart, string]>;

/**
 * What each of the generator's items adds, for the items the inventory shows. Refills like Bombs
 * (5) aren't here: getting one without the item doesn't give it, so those tiles go by the save.
 * Hearts, Skulltula tokens, bottles, and stray fairies go by the save too.
 */
const finds: Partial<Record<ItemKey, Find>> = {
  FIRE_ARROWS: item('FireArrow'),
  ICE_ARROWS: item('IceArrow'),
  LIGHT_ARROWS: item('LightArrow'),
  DEKU_STICK: item('DekuStick'),
  POWDER_KEG: item('PowderKeg'),
  PICTOGRAPH_BOX: item('PictographBox'),
  LENS_OF_TRUTH: item('LensOfTruth'),
  HOOKSHOT: item('Hookshot'),
  GREAT_FAIRYS_SWORD: item('GreatFairySword'),
  MAGIC_BEAN: item('MagicBean'),
  MAGIC_BEAN_PACK: item('MagicBean'),
  OCARINA_OF_TIME: item('Ocarina'),

  MOONS_TEAR: trade('MoonTear'),
  LAND_TITLE: trade('LandTitleDeed'),
  SWAMP_TITLE: trade('SwampTitleDeed'),
  MOUNTAIN_TITLE: trade('MountainTitleDeed'),
  OCEAN_TITLE: trade('OceanTitleDeed'),
  ROOM_KEY: trade('RoomKey'),
  LETTER_KAFEI: trade('LetterToKafei'),
  PENDANT_MEMORIES: trade('PendantOfMemories'),
  LETTER_MAMA: trade('LetterToMama'),

  POSTMANS_HAT: mask('PostmanHat'),
  ALL_NIGHT_MASK: mask('AllNightMask'),
  BLAST_MASK: mask('BlastMask'),
  STONE_MASK: mask('StoneMask'),
  GREAT_FAIRYS_MASK: mask('GreatFairyMask'),
  DEKU_MASK: mask('DekuMask'),
  KEATON_MASK: mask('KeatonMask'),
  BREMEN_MASK: mask('BremenMask'),
  BUNNY_HOOD: mask('BunnyHood'),
  DON_GEROS_MASK: mask('DonGeroMask'),
  MASK_OF_SCENTS: mask('MaskOfScents'),
  GORON_MASK: mask('GoronMask'),
  ROMANIS_MASK: mask('RomaniMask'),
  CIRCUS_LEADERS_MASK: mask('CircusLeaderMask'),
  KAFEIS_MASK: mask('KafeiMask'),
  COUPLES_MASK: mask('CoupleMask'),
  MASK_OF_TRUTH: mask('MaskOfTruth'),
  ZORA_MASK: mask('ZoraMask'),
  KAMAROS_MASK: mask('KamaroMask'),
  GIBDOS_MASK: mask('GibdoMask'),
  GAROS_MASK: mask('GaroMask'),
  CAPTAINS_HAT: mask('CaptainHat'),
  GIANTS_MASK: mask('GiantMask'),
  FIERCE_DEITY_MASK: mask('FierceDeityMask'),

  SONG_OF_TIME: song('SongOfTime'),
  SONG_OF_HEALING: song('SongOfHealing'),
  EPONAS_SONG: song('EponasSong'),
  SONG_OF_SOARING: song('SongOfSoaring'),
  SONG_OF_STORMS: song('SongOfStorms'),
  SONATA_OF_AWAKENING: song('SonataOfAwakening'),
  NEW_WAVE_BOSSA_NOVA: song('NewWaveBossaNova'),
  ELEGY_OF_EMPTINESS: song('ElegyOfEmptiness'),
  OATH_TO_ORDER: song('OathToOrder'),
  LULLABY_INTRO: { kind: 'lullaby', part: 'intro' },
  GORONS_LULLABY: { kind: 'lullaby', part: 'full' },
  PROGRESSIVE_LULLABY: { kind: 'lullaby', part: 'next' },

  ODOLWAS_REMAINS: remains('Odolwa'),
  GOHTS_REMAINS: remains('Goht'),
  GYORGS_REMAINS: remains('Gyorg'),
  TWINMOLDS_REMAINS: remains('Twinmold'),
  BOMBERS_NOTEBOOK: { kind: 'notebook' },

  KOKIRI_SWORD: upgrade('sword', 1),
  RAZOR_SWORD: upgrade('sword', 2),
  GILDED_SWORD: upgrade('sword', 3),
  PROGRESSIVE_SWORD: upgrade('sword', 'next'),
  HEROS_SHIELD: upgrade('shield', 1),
  BUY_HEROS_SHIELD: upgrade('shield', 1),
  MIRROR_SHIELD: upgrade('shield', 2),
  HEROS_BOW: upgrade('quiver', 1),
  LARGE_QUIVER: upgrade('quiver', 2),
  LARGEST_QUIVER: upgrade('quiver', 3),
  PROGRESSIVE_BOW: upgrade('quiver', 'next'),
  BOMB_BAG: upgrade('bombBag', 1),
  BIG_BOMB_BAG: upgrade('bombBag', 2),
  BIGGEST_BOMB_BAG: upgrade('bombBag', 3),
  PROGRESSIVE_BOMB_BAG: upgrade('bombBag', 'next'),
  ADULT_WALLET: upgrade('wallet', 1),
  GIANT_WALLET: upgrade('wallet', 2),
  PROGRESSIVE_WALLET: upgrade('wallet', 'next'),
  MAGIC_POWER: upgrade('magic', 1),
  EXTENDED_MAGIC_POWER: upgrade('magic', 2),
  PROGRESSIVE_MAGIC_METER: upgrade('magic', 'next')
};

/**
 * Finds what an item adds to the inventory.
 *
 * @param key - The item's key.
 * @returns What it adds, or undefined for an item the inventory doesn't show.
 */
const findOf = (key: ItemKey): Find | undefined => {
  const listed = finds[key];
  if (listed) return listed;

  // A temple's keys and dungeon items, like `GBT_SMALL_KEY`.
  for (const temple of temples) {
    for (const [part, suffix] of dungeonParts) {
      if (key === `${templePrefixes[temple]}_${suffix}`) return { kind: 'dungeon', temple, part };
    }
  }

  return undefined;
};

/** An item found, and where. */
export type FoundItem = { readonly key: ItemKey; readonly source: ItemSource };

/**
 * Works out what the inventory panel shows: everything found, plus everything held now. Found
 * items keep showing after they're traded away or used up, and held ones cover what no check
 * gives, like a bomb bag bought in its usual shop.
 *
 * @param held - What the save holds now.
 * @param found - The items found at collected checks and the starting items.
 * @returns The inventory to show, and where each part of it was found.
 */
export const addFoundItems = (held: Inventory, found: ReadonlyArray<FoundItem>) => {
  const sources: Partial<Record<SourceId, ItemSource[]>> = {};
  const addSource = (id: SourceId, source: ItemSource) => {
    sources[id] = [...(sources[id] ?? []), source];
  };

  const items = new Set(held.items);
  const masks = new Set(held.masks);
  const tradeItems = new Set(held.tradeItems);
  const songs = new Set(held.songs);
  const bossRemains = new Set(held.bossRemains);
  let { bombersNotebook, lullabyIntro } = held;
  let lullabyParts = 0;

  // Levels held now, then raised by what's found.
  const levels: Record<Upgrade, number> = {
    sword: held.sword ? swords.indexOf(held.sword) + 1 : 0,
    shield: held.shield ? shields.indexOf(held.shield) + 1 : 0,
    quiver: held.quiver,
    bombBag: held.bombBag,
    wallet: held.wallet,
    magic: held.magic
  };
  const progressive: Record<Upgrade, number> = {
    sword: 0,
    shield: 0,
    quiver: 0,
    bombBag: 0,
    wallet: 0,
    magic: 0
  };

  const dungeons: Record<Temple, DungeonItems> = { ...held.dungeons };
  const smallKeysFound: Record<Temple, number> = {
    Woodfall: 0,
    Snowhead: 0,
    GreatBay: 0,
    StoneTower: 0
  };

  for (const { key, source } of found) {
    const find = findOf(key);
    if (!find) continue;

    switch (find.kind) {
      case 'item':
        items.add(find.item);
        addSource(find.item, source);
        break;
      case 'mask':
        masks.add(find.item);
        addSource(find.item, source);
        break;
      case 'trade':
        tradeItems.add(find.item);
        addSource(find.item, source);
        break;
      case 'song':
        songs.add(find.song);
        addSource(find.song, source);
        break;
      case 'lullaby':
        if (find.part === 'intro') lullabyIntro = true;
        if (find.part === 'full') songs.add('GoronLullaby');
        if (find.part === 'next') lullabyParts += 1;
        addSource('GoronLullaby', source);
        break;
      case 'remains':
        bossRemains.add(find.remains);
        addSource(find.remains, source);
        break;
      case 'notebook':
        bombersNotebook = true;
        addSource('BombersNotebook', source);
        break;
      case 'upgrade':
        if (find.level === 'next') progressive[find.upgrade] += 1;
        else levels[find.upgrade] = Math.max(levels[find.upgrade], find.level);
        addSource(find.upgrade, source);
        break;
      case 'dungeon': {
        const dungeon = dungeons[find.temple];
        if (find.part === 'smallKey') smallKeysFound[find.temple] += 1;
        else dungeons[find.temple] = { ...dungeon, [find.part]: true };
        addSource(`${find.temple}.${find.part}`, source);
        break;
      }
    }
  }

  // The progressive Lullaby gives the intro first, then the full song.
  if (lullabyParts >= 1) lullabyIntro = true;
  if (lullabyParts >= 2) songs.add('GoronLullaby');

  // Keys show how many were found, or how many are held if that's more, like keys left in
  // their usual chests on a seed that doesn't shuffle them.
  for (const temple of temples) {
    const dungeon = dungeons[temple];
    dungeons[temple] = {
      ...dungeon,
      smallKeys: Math.max(dungeon.smallKeys, smallKeysFound[temple])
    };
  }

  const level = (upgrade: Upgrade) => Math.max(levels[upgrade], progressive[upgrade]);

  // The bow and bombs show on the item screen once there's a quiver or bomb bag.
  if (level('quiver') > 0) items.add('Arrow');
  if (level('bombBag') > 0) items.add('Bomb');

  const inventory: Inventory = {
    ...held,
    items: [...items],
    masks: [...masks],
    tradeItems: [...tradeItems],
    songs: [...songs],
    lullabyIntro,
    bossRemains: [...bossRemains],
    bombersNotebook,
    sword: levelName(swords, level('sword')),
    shield: levelName(shields, level('shield')),
    quiver: level('quiver'),
    bombBag: level('bombBag'),
    wallet: level('wallet'),
    magic: level('magic'),
    dungeons
  };

  const foundAt: ItemSources = sources;
  return { inventory, sources: foundAt };
};

/**
 * Names an upgrade level.
 *
 * @param names - The upgrades in order.
 * @param level - 0 for none, or N for the Nth.
 * @returns The name, or null for none. Levels past the last name the last.
 */
const levelName = <Name>(names: ReadonlyArray<Name>, level: number) =>
  level === 0 ? null : (names[Math.min(level, names.length) - 1] ?? null);
