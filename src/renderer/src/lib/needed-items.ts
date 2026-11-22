import { icons } from './inventory-tiles';

/**
 * Icons for the generator's items whose key doesn't simply match an icon's file name. Most do,
 * like `HOOKSHOT` and `hookshot` or `SONG_OF_TIME` and `song-of-time`.
 */
const iconsByKey: Readonly<Record<string, string>> = {
  GREAT_FAIRYS_SWORD: 'great-fairy-sword',
  HEROS_SHIELD: 'hero-shield',
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
  LARGE_QUIVER: 'bow',
  LARGEST_QUIVER: 'bow',
  FIRE_ARROWS: 'fire-arrow',
  ICE_ARROWS: 'ice-arrow',
  LIGHT_ARROWS: 'light-arrow',
  MAGIC_BEAN_PACK: 'magic-bean',
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
  ZORA_EGG: 'bottle',
  GOLD_DUST: 'bottle',
  CHATEAU_ROMANI: 'bottle',
  DEKU_PRINCESS: 'bottle',
  MILK: 'bottle',
  BOMB_BAG: 'bomb',
  BIG_BOMB_BAG: 'bomb',
  BIGGEST_BOMB_BAG: 'bomb',
  PROGRESSIVE_BOMB_BAG: 'bomb',
  ADULT_WALLET: 'wallet-adult',
  PROGRESSIVE_WALLET: 'wallet-adult',
  GIANT_WALLET: 'wallet-giant',
  PROGRESSIVE_SWORD: 'kokiri-sword',
  LULLABY_INTRO: 'goron-lullaby',
  GORONS_LULLABY: 'goron-lullaby',
  PROGRESSIVE_LULLABY: 'goron-lullaby',
  EPONAS_SONG: 'eponas-song',
  ODOLWAS_REMAINS: 'odolwa',
  GOHTS_REMAINS: 'goht',
  GYORGS_REMAINS: 'gyorg',
  TWINMOLDS_REMAINS: 'twinmold'
};

/**
 * Finds the icon for one of the generator's items.
 *
 * @param key - The item's key, such as `HOOKSHOT`.
 * @returns The icon's URL, or undefined for items without one, like the seahorse.
 */
export const neededItemIcon = (key: string) => {
  if (/BOTTLE/.test(key)) return icons['bottle'];
  if (/BOSS_KEY/.test(key)) return icons['boss-key'];
  if (/SMALL_KEY/.test(key)) return icons['small-key'];

  return icons[iconsByKey[key] ?? key.toLowerCase().replaceAll('_', '-')];
};
