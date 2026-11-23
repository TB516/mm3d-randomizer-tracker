import type { Inventory } from '../../../shared/inventory';
import type { BossRemains, InventoryItem, Song, Temple } from '../../../shared/items';

/** Icon URLs keyed by file name, such as `deku-mask`. */
export const icons = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../assets/items/*.png', { eager: true, import: 'default' })
  ).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.png'.length), url])
);

/** One square in the inventory panel. */
export type Tile = {
  readonly icon: string;
  readonly name: string;
  readonly has: boolean;
  /** A small number in the corner, such as how many arrows the quiver holds. */
  readonly badge?: string;
  /** A CSS filter that recolors the icon, such as a temple's stray fairy color. */
  readonly tint?: string;
};

/** Ammo each upgrade level holds, from the in-game shops and upgrades. Level 0 is none. */
const quiverSizes = [0, 30, 40, 50];
const bombBagSizes = [0, 20, 30, 40];
const walletSizes = [99, 200, 500];
const walletNames = ["Child's Wallet", "Adult's Wallet", "Giant's Wallet"];

/** Item-screen tiles: icon, name, and the item that means you have it. */
const itemTiles: ReadonlyArray<readonly [string, string, InventoryItem]> = [
  ['fire-arrow', 'Fire Arrow', 'FireArrow'],
  ['ice-arrow', 'Ice Arrow', 'IceArrow'],
  ['light-arrow', 'Light Arrow', 'LightArrow'],
  ['bombchu', 'Bombchu', 'Bombchu'],
  ['deku-stick', 'Deku Stick', 'DekuStick'],
  ['deku-nuts', 'Deku Nuts', 'DekuNuts'],
  ['powder-keg', 'Powder Keg', 'PowderKeg'],
  ['pictograph-box', 'Pictograph Box', 'PictographBox'],
  ['lens-of-truth', 'Lens of Truth', 'LensOfTruth'],
  ['hookshot', 'Hookshot', 'Hookshot'],
  ['great-fairy-sword', "Great Fairy's Sword", 'GreatFairySword']
];

/** Trade items in the order of their quest chains: deeds, then the Kafei and Anju quest. */
const tradeTiles: ReadonlyArray<readonly [string, string, InventoryItem]> = [
  ['moon-tear', "Moon's Tear", 'MoonTear'],
  ['land-title-deed', 'Town Title Deed', 'LandTitleDeed'],
  ['swamp-title-deed', 'Swamp Title Deed', 'SwampTitleDeed'],
  ['mountain-title-deed', 'Mountain Title Deed', 'MountainTitleDeed'],
  ['ocean-title-deed', 'Ocean Title Deed', 'OceanTitleDeed'],
  ['room-key', 'Room Key', 'RoomKey'],
  ['letter-to-kafei', 'Letter to Kafei', 'LetterToKafei'],
  ['pendant-of-memories', 'Pendant of Memories', 'PendantOfMemories'],
  ['letter-to-mama', 'Special Delivery to Mama', 'LetterToMama']
];

/** Masks in the game's mask-screen order. */
const maskTiles: ReadonlyArray<readonly [string, string, InventoryItem]> = [
  ['postman-hat', "Postman's Hat", 'PostmanHat'],
  ['all-night-mask', 'All-Night Mask', 'AllNightMask'],
  ['blast-mask', 'Blast Mask', 'BlastMask'],
  ['stone-mask', 'Stone Mask', 'StoneMask'],
  ['great-fairy-mask', 'Great Fairy Mask', 'GreatFairyMask'],
  ['deku-mask', 'Deku Mask', 'DekuMask'],
  ['keaton-mask', 'Keaton Mask', 'KeatonMask'],
  ['bremen-mask', 'Bremen Mask', 'BremenMask'],
  ['bunny-hood', 'Bunny Hood', 'BunnyHood'],
  ['don-gero-mask', "Don Gero's Mask", 'DonGeroMask'],
  ['mask-of-scents', 'Mask of Scents', 'MaskOfScents'],
  ['goron-mask', 'Goron Mask', 'GoronMask'],
  ['romani-mask', "Romani's Mask", 'RomaniMask'],
  ['circus-leader-mask', "Troupe Leader's Mask", 'CircusLeaderMask'],
  ['kafei-mask', "Kafei's Mask", 'KafeiMask'],
  ['couple-mask', "Couple's Mask", 'CoupleMask'],
  ['mask-of-truth', 'Mask of Truth', 'MaskOfTruth'],
  ['zora-mask', 'Zora Mask', 'ZoraMask'],
  ['kamaro-mask', "Kamaro's Mask", 'KamaroMask'],
  ['gibdo-mask', 'Gibdo Mask', 'GibdoMask'],
  ['garo-mask', "Garo's Mask", 'GaroMask'],
  ['captain-hat', "Captain's Hat", 'CaptainHat'],
  ['giant-mask', "Giant's Mask", 'GiantMask'],
  ['fierce-deity-mask', "Fierce Deity's Mask", 'FierceDeityMask']
];

/** Songs in the order the game teaches most of them. */
const songTiles: ReadonlyArray<readonly [string, string, Song]> = [
  ['song-of-time', 'Song of Time', 'SongOfTime'],
  ['song-of-healing', 'Song of Healing', 'SongOfHealing'],
  ['eponas-song', "Epona's Song", 'EponasSong'],
  ['song-of-soaring', 'Song of Soaring', 'SongOfSoaring'],
  ['song-of-storms', 'Song of Storms', 'SongOfStorms'],
  ['sonata-of-awakening', 'Sonata of Awakening', 'SonataOfAwakening'],
  ['goron-lullaby', 'Goron Lullaby', 'GoronLullaby'],
  ['new-wave-bossa-nova', 'New Wave Bossa Nova', 'NewWaveBossaNova'],
  ['elegy-of-emptiness', 'Elegy of Emptiness', 'ElegyOfEmptiness'],
  ['oath-to-order', 'Oath to Order', 'OathToOrder']
];

const remainsTiles: ReadonlyArray<readonly [string, string, BossRemains]> = [
  ['odolwa', "Odolwa's Remains", 'Odolwa'],
  ['goht', "Goht's Remains", 'Goht'],
  ['gyorg', "Gyorg's Remains", 'Gyorg'],
  ['twinmold', "Twinmold's Remains", 'Twinmold']
];

const swordTiles = {
  KokiriSword: ['kokiri-sword', 'Kokiri Sword'],
  RazorSword: ['razor-sword', 'Razor Sword'],
  GildedSword: ['gilded-sword', 'Gilded Sword']
} as const;

const shieldTiles = {
  HeroShield: ['hero-shield', "Hero's Shield"],
  MirrorShield: ['mirror-shield', 'Mirror Shield']
} as const;

/**
 * Makes a tile.
 *
 * @param icon - The icon's file name.
 * @param name - What the tile is called when hovered.
 * @param has - Whether the player has it.
 * @param badge - A number for the corner, if any.
 * @returns The tile.
 */
const tile = (icon: string, name: string, has: boolean, badge?: string): Tile => ({
  icon: icons[icon] ?? '',
  name,
  has,
  ...(badge ? { badge } : {})
});

/** Stray fairies in each temple. */
const fairiesPerTemple = 15;

/**
 * Each temple's stray fairy color, as a filter on the pink Woodfall icon. Stone Tower's gets
 * brightened so its yellow doesn't come out brown.
 */
const fairyTints: Record<Temple, string | undefined> = {
  Woodfall: undefined,
  Snowhead: 'hue-rotate(140deg)',
  GreatBay: 'hue-rotate(230deg)',
  StoneTower: 'hue-rotate(75deg) saturate(1.3) brightness(1.15)'
};

/**
 * Lays out a temple's keys, dungeon items, and stray fairies. Without an inventory, everything
 * shows as missing.
 *
 * @param inventory - What the player has, or null before tracking starts.
 * @param temple - Which temple.
 * @returns The key and dungeon item tiles, and the stray fairy tile.
 */
export const dungeonTiles = (inventory: Inventory | null, temple: Temple) => {
  const items = inventory?.dungeons[temple];
  const keys = items?.smallKeys ?? 0;
  const fairies = items?.strayFairies ?? 0;
  const tint = fairyTints[temple];

  return {
    items: [
      tile('small-key', 'Small Keys', keys > 0, keys ? String(keys) : undefined),
      tile('boss-key', 'Boss Key', items?.bossKey ?? false),
      tile('dungeon-map', 'Map', items?.map ?? false),
      tile('compass', 'Compass', items?.compass ?? false)
    ],
    fairies: {
      ...tile('stray-fairy', 'Stray Fairies', fairies > 0, `${fairies}/${fairiesPerTemple}`),
      ...(tint ? { tint } : {})
    }
  };
};

/**
 * Lays out the inventory panel. Without an inventory, everything shows as missing.
 *
 * @param inventory - What the player has, or null before tracking starts.
 * @param tradeItemsFound - Trade items found, held or not, so ones traded away show as such.
 * @returns The tiles for each section, plus the counters.
 */
export const inventoryTiles = (
  inventory: Inventory | null,
  tradeItemsFound: ReadonlyArray<InventoryItem> = []
) => {
  const items = inventory?.items ?? [];
  const has = (item: InventoryItem) => items.includes(item);

  const sword = inventory?.sword ?? null;
  const shield = inventory?.shield ?? null;
  const bottles = inventory?.bottles.length ?? 0;
  const quiver = quiverSizes[inventory?.quiver ?? 0] ?? 0;
  const bombBag = bombBagSizes[inventory?.bombBag ?? 0] ?? 0;

  // Swords and shields show the one you have, or the first one greyed out.
  const [swordIcon, swordName] = swordTiles[sword ?? 'KokiriSword'];
  const [shieldIcon, shieldName] = shieldTiles[shield ?? 'HeroShield'];

  return {
    items: [
      tile(swordIcon, swordName, sword !== null),
      tile(shieldIcon, shieldName, shield !== null),
      tile('bow', "Hero's Bow", has('Arrow'), quiver ? String(quiver) : undefined),
      tile('bomb', 'Bombs', has('Bomb'), bombBag ? String(bombBag) : undefined),
      ...itemTiles.map(([icon, name, item]) => tile(icon, name, has(item))),
      tile('bottle', 'Bottles', bottles > 0, bottles > 1 ? String(bottles) : undefined),
      tile('magic-bean', 'Magic Beans', has('MagicBean')),
      tile('bombers-notebook', "Bombers' Notebook", inventory?.bombersNotebook ?? false)
    ],
    trade: tradeTiles.map(([icon, name, item]) => {
      const has = inventory?.tradeItems.includes(item) ?? false;
      // Found but no longer held: faded like a missing item, with a check in the corner.
      const traded = !has && tradeItemsFound.includes(item);

      return traded ? tile(icon, `${name} (traded away)`, false, '✓') : tile(icon, name, has);
    }),
    masks: maskTiles.map(([icon, name, item]) =>
      tile(icon, name, inventory?.masks.includes(item) ?? false)
    ),
    songs: songTiles.map(([icon, name, song]) => {
      const has = inventory?.songs.includes(song) ?? false;
      // The randomizer gives the Lullaby in two halves, and only the full song is playable.
      const introOnly = song === 'GoronLullaby' && !has && (inventory?.lullabyIntro ?? false);

      return introOnly ? tile(icon, `${name} (intro only)`, false, '1/2') : tile(icon, name, has);
    }),
    ocarina: tile('ocarina', 'Ocarina of Time', has('Ocarina')),
    remains: remainsTiles.map(([icon, name, remains]) =>
      tile(icon, name, inventory?.bossRemains.includes(remains) ?? false)
    ),
    counters: inventory && {
      hearts: inventory.maxHearts,
      doubleDefense: inventory.doubleDefense,
      heartPieces: inventory.heartPieces,
      magic: inventory.magic,
      swampTokens: inventory.swampTokens,
      oceanTokens: inventory.oceanTokens,
      wallet: walletSizes[inventory.wallet] ?? walletSizes[0],
      // There's no icon for the starting wallet, so it shows the next one's, greyed out.
      walletIcon: icons[inventory.wallet === 2 ? 'wallet-giant' : 'wallet-adult'] ?? '',
      walletName: walletNames[inventory.wallet] ?? walletNames[0],
      walletUpgraded: inventory.wallet > 0
    },
    counterIcons: {
      heart: icons['heart-container'] ?? '',
      heartPiece: icons['piece-of-heart'] ?? '',
      token: icons['skulltula-token'] ?? ''
    }
  };
};
