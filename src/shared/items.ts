/**
 * Items that can sit in the item and mask screens, indexed by their game item ID. Names follow
 * `game::ItemId` in mm3dr's `game/items.h`, except `MapUnused`, which the game uses for Tingle's
 * maps.
 */
export const inventoryItems = [
  'Ocarina',
  'Arrow',
  'FireArrow',
  'IceArrow',
  'LightArrow',
  'FairyOcarina',
  'Bomb',
  'Bombchu',
  'DekuStick',
  'DekuNuts',
  'MagicBean',
  'FairySlingshot',
  'PowderKeg',
  'PictographBox',
  'LensOfTruth',
  'Hookshot',
  'GreatFairySword',
  'HookshotUnused',
  'Bottle',
  'RedPotion',
  'GreenPotion',
  'BluePotion',
  'Fairy',
  'DekuPrincess',
  'Milk',
  'MilkHalf',
  'Fish',
  'Bug',
  'BlueFire',
  'Poe',
  'BigPoe',
  'Water',
  'HotSpringWater',
  'ZoraEgg',
  'GoldDust',
  'MagicalMushroom',
  'SeaHorse',
  'ChateauRomani',
  'MysteryMilk',
  'MysteryMilkSpoiled',
  'MoonTear',
  'LandTitleDeed',
  'SwampTitleDeed',
  'MountainTitleDeed',
  'OceanTitleDeed',
  'RoomKey',
  'LetterToMama',
  'LetterToKafei',
  'PendantOfMemories',
  'TingleMap',
  'DekuMask',
  'GoronMask',
  'ZoraMask',
  'FierceDeityMask',
  'MaskOfTruth',
  'KafeiMask',
  'AllNightMask',
  'BunnyHood',
  'KeatonMask',
  'GaroMask',
  'RomaniMask',
  'CircusLeaderMask',
  'PostmanHat',
  'CoupleMask',
  'GreatFairyMask',
  'GibdoMask',
  'DonGeroMask',
  'KamaroMask',
  'CaptainHat',
  'StoneMask',
  'BremenMask',
  'BlastMask',
  'MaskOfScents',
  'GiantMask'
] as const;

export type InventoryItem = (typeof inventoryItems)[number];

/** Songs in the order of their bits in the save's collect register. */
export const songs = [
  'SonataOfAwakening',
  'GoronLullaby',
  'NewWaveBossaNova',
  'ElegyOfEmptiness',
  'OathToOrder',
  'SariasSong',
  'SongOfTime',
  'SongOfHealing',
  'EponasSong',
  'SongOfSoaring',
  'SongOfStorms'
] as const;

export type Song = (typeof songs)[number];

export const bossRemains = ['Odolwa', 'Goht', 'Gyorg', 'Twinmold'] as const;

export type BossRemains = (typeof bossRemains)[number];

/** Swords in upgrade order. */
export const swords = ['KokiriSword', 'RazorSword', 'GildedSword'] as const;

export type Sword = (typeof swords)[number];

/** Shields in upgrade order. */
export const shields = ['HeroShield', 'MirrorShield'] as const;

export type Shield = (typeof shields)[number];
