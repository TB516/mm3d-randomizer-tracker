import { icons } from './inventory-tiles';

/** An item's icon, with a CSS filter for icons made by recoloring another. */
export type ItemIcon = { readonly url: string; readonly filter?: string };

/**
 * Icons for the generator's items whose key doesn't simply match an icon's file name. Most do,
 * like `HOOKSHOT` and `hookshot` or `SONG_OF_TIME` and `song-of-time`.
 */
const iconsByKey: Readonly<Record<string, string>> = {
  GREAT_FAIRYS_SWORD: 'great-fairy-sword',
  HEROS_SHIELD: 'hero-shield',
  BUY_HEROS_SHIELD: 'hero-shield',
  LAND_TITLE: 'land-title-deed',
  SWAMP_TITLE: 'swamp-title-deed',
  MOUNTAIN_TITLE: 'mountain-title-deed',
  OCEAN_TITLE: 'ocean-title-deed',
  LETTER_KAFEI: 'letter-to-kafei',
  PENDANT_MEMORIES: 'pendant-of-memories',
  LETTER_MAMA: 'letter-to-mama',
  MOONS_TEAR: 'moon-tear',
  HEROS_BOW: 'bow',
  PROGRESSIVE_BOW: 'bow',
  LARGE_QUIVER: 'big-quiver',
  LARGEST_QUIVER: 'biggest-quiver',
  FIRE_ARROWS: 'fire-arrow',
  ICE_ARROWS: 'ice-arrow',
  LIGHT_ARROWS: 'light-arrow',
  BUY_MAGIC_BEAN: 'magic-bean',
  OCARINA_OF_TIME: 'ocarina',
  POSTMANS_HAT: 'postman-hat',
  GREAT_FAIRYS_MASK: 'great-fairy-mask',
  DON_GEROS_MASK: 'don-gero-mask',
  ROMANIS_MASK: 'romani-mask',
  CIRCUS_LEADERS_MASK: 'circus-leader-mask',
  KAFEIS_MASK: 'kafei-mask',
  COUPLES_MASK: 'couple-mask',
  KAMAROS_MASK: 'kamaro-mask',
  GIBDOS_MASK: 'gibdo-mask',
  GAROS_MASK: 'garo-mask',
  CAPTAINS_HAT: 'captain-hat',
  GIANTS_MASK: 'giant-mask',
  SWAMP_SKULLTULA_TOKEN: 'skulltula-token',
  OCEANSIDE_SKULLTULA_TOKEN: 'skulltula-token',
  CT_STRAY_FAIRY: 'stray-fairy',
  WF_STRAY_FAIRY: 'stray-fairy',
  SH_STRAY_FAIRY: 'stray-fairy',
  GBT_STRAY_FAIRY: 'stray-fairy',
  ST_STRAY_FAIRY: 'stray-fairy',
  EMPTY_BOTTLE1: 'bottle',
  EMPTY_BOTTLE2: 'bottle',
  BOTTLE_WITH_MILK: 'milk',
  // There's no Mystery Milk icon, and its name shows on hover.
  BOTTLE_WITH_MYSTERY_MILK: 'milk',
  BOTTLE_WITH_RED_POTION: 'red-potion',
  RED_POTION_REFILL: 'red-potion',
  GREEN_POTION_REFILL: 'green-potion',
  BLUE_POTION_REFILL: 'blue-potion',
  BUY_RED_POTION: 'red-potion',
  BUY_GREEN_POTION: 'green-potion',
  BUY_BLUE_POTION: 'blue-potion',
  BUY_FAIRYS_SPIRIT: 'fairy',
  BOMB_BAG: 'bomb-bag',
  PROGRESSIVE_BOMB_BAG: 'bomb-bag',
  ADULT_WALLET: 'wallet-adult',
  PROGRESSIVE_WALLET: 'wallet-adult',
  GIANT_WALLET: 'wallet-giant',
  MAGIC_POWER: 'magic-jar',
  PROGRESSIVE_MAGIC_METER: 'magic-jar',
  EXTENDED_MAGIC_POWER: 'large-magic-jar',
  PROGRESSIVE_SWORD: 'kokiri-sword',
  PROGRESSIVE_LULLABY: 'goron-lullaby',
  EPONAS_SONG: 'eponas-song',
  ODOLWAS_REMAINS: 'odolwa',
  GOHTS_REMAINS: 'goht',
  GYORGS_REMAINS: 'gyorg',
  TWINMOLDS_REMAINS: 'twinmold',
  ICE_TRAP: 'blue-fire'
};

/**
 * Icons made by recoloring another, for items with no icon of their own: the rarer rupees from
 * the red one, and double defense as a heart container in the outline the hearts counter uses.
 */
const recoloredIcons: Readonly<Record<string, readonly [string, string]>> = {
  PURPLE_RUPEE: ['red-rupee', 'hue-rotate(280deg) saturate(1.2)'],
  SILVER_RUPEE: ['red-rupee', 'grayscale(1) brightness(1.5) contrast(1.1)'],
  HUGE_RUPEE: ['red-rupee', 'grayscale(1) sepia(1) saturate(5) brightness(1.25) hue-rotate(-8deg)'],
  DOUBLE_DEFENSE: [
    'heart-container',
    'drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff)'
  ]
};

/** Icons for item families whose keys share a pattern, like each temple's small key. */
const iconsByPattern: ReadonlyArray<readonly [RegExp, string]> = [
  [/BOSS_KEY/, 'boss-key'],
  [/SMALL_KEY/, 'small-key'],
  [/TEMPLE_MAP|GBT_MAP/, 'dungeon-map'],
  // Tingle's maps of each region.
  [/_MAP$/, 'tingle-map'],
  [/COMPASS/, 'compass'],
  [/^(BUY_)?BOMBS_/, 'bomb'],
  [/^(BUY_)?BOMBCHU_/, 'bombchu'],
  [/^(BUY_)?ARROWS_/, 'arrows'],
  [/^(BUY_)?DEKU_NUTS?_/, 'deku-nuts'],
  [/^BUY_DEKU_STICK_/, 'deku-stick']
];

/**
 * Finds the icon for one of the generator's items.
 *
 * @param key - The item's key, such as `HOOKSHOT`.
 * @returns The icon, or undefined for items without one, like Sold Out, which show their name.
 */
export const itemIcon = (key: string): ItemIcon | undefined => {
  const [name, filter] = recoloredIcons[key] ?? [
    iconsByKey[key] ??
      iconsByPattern.find(([pattern]) => pattern.test(key))?.[1] ??
      key.toLowerCase().replaceAll('_', '-')
  ];

  const url = icons[name];
  if (!url) return undefined;

  return filter ? { url, filter } : { url };
};
