import {
  type ItemKey,
  type LogicValues,
  type LogicVariable,
  readLogicValues
} from './generated/items';

/** The seed's settings that rules read. */
export type LogicSettings = {
  readonly skipBombersMinigame: boolean;
  /** Boss remains needed to reach the Moon. */
  readonly remainsForMoon: number;
  /** Boss remains needed to fight Majora. */
  readonly remainsForMajora: number;
};

/**
 * What the rules read: every logic variable (helpers included, worked out from the others), a
 * setting, and the helper functions. Names match the generator's, so converted rules read the same
 * as the original.
 */
export type Has = LogicValues & {
  readonly SkipBombersMinigame: boolean;
  readonly CanPlay: (song: boolean) => boolean;
  readonly CanUse: (item: ItemKey) => boolean;
  readonly SmallKeys: (keys: number, required: number) => boolean;
  readonly ZoraEggCount: (eggs: number, required: number) => boolean;
  readonly StrayFairyCount: (fairies: number, required: number) => boolean;
  readonly SkulltulaCount: (tokens: number, required: number) => boolean;
  readonly TotalHeartContainers: (required: number) => boolean;
  readonly TotalMaskCount: () => number;
};

/**
 * Items that need magic to use. Mirrors `IsMagicItem` in the generator's `logic.cpp`.
 */
const magicItems: ReadonlyArray<ItemKey> = ['LENS_OF_TRUTH', 'GIANTS_MASK'];

const magicArrows: ReadonlyArray<ItemKey> = ['FIRE_ARROWS', 'ICE_ARROWS', 'LIGHT_ARROWS'];

/**
 * Items usable without magic. Mirrors `IsNonMagicItemOrMask`, which leaves out a few masks, so
 * `CanUse` is false for those even when they're found. Its `SCARECROW` isn't a real item, so it's
 * left out here and in `HasItem` below.
 */
const otherUsableItems: ReadonlyArray<ItemKey> = [
  'KOKIRI_SWORD',
  'DEKU_STICK',
  'HEROS_BOW',
  'PICTOGRAPH_BOX',
  'POWDER_KEG',
  'DEKU_MASK',
  'GORON_MASK',
  'ZORA_MASK',
  'BLAST_MASK',
  'GREAT_FAIRYS_MASK',
  'POSTMANS_HAT',
  'ALL_NIGHT_MASK',
  'BREMEN_MASK',
  'DON_GEROS_MASK',
  'MASK_OF_SCENTS',
  'ROMANIS_MASK',
  'CIRCUS_LEADERS_MASK',
  'KAFEIS_MASK',
  'COUPLES_MASK',
  'GIBDOS_MASK',
  'GAROS_MASK',
  'CAPTAINS_HAT',
  'FIERCE_DEITY_MASK',
  'MASK_OF_TRUTH'
];

/**
 * Builds what the rules read.
 *
 * @param count - How many times a variable was set by found items and events.
 * @param settings - The seed's settings.
 * @returns The values rules read. Helpers are worked out when read, so they always match the
 * variables, as `UpdateHelpers` in the generator's `logic.cpp` keeps them.
 */
export const createHas = (
  count: (variable: LogicVariable) => number,
  settings: LogicSettings
): Has => {
  const values = readLogicValues(count);

  // Mirrors `HasItem`.
  const hasItem: Partial<Record<ItemKey, () => boolean>> = {
    KOKIRI_SWORD: () => has.KokiriSword,
    LENS_OF_TRUTH: () => has.LensOfTruth,
    HEROS_BOW: () => has.HerosBow,
    DEKU_STICK: () => has.DekuStick || has.Sticks,
    FIRE_ARROWS: () => has.FireArrows,
    ICE_ARROWS: () => has.IceArrows,
    LIGHT_ARROWS: () => has.LightArrows,
    PICTOGRAPH_BOX: () => has.Pictobox,
    POWDER_KEG: () => has.PowderKeg,
    DEKU_MASK: () => has.DekuMask,
    GORON_MASK: () => has.GoronMask,
    ZORA_MASK: () => has.ZoraMask,
    BLAST_MASK: () => has.BlastMask,
    GREAT_FAIRYS_MASK: () => has.GreatFairyMask,
    POSTMANS_HAT: () => has.PostmansHat,
    ALL_NIGHT_MASK: () => has.AllNightMask,
    BREMEN_MASK: () => has.BremenMask,
    DON_GEROS_MASK: () => has.DonGerosMask,
    MASK_OF_SCENTS: () => has.MaskOfScents,
    ROMANIS_MASK: () => has.RomanisMask,
    CIRCUS_LEADERS_MASK: () => has.CircusLeadersMask,
    KAFEIS_MASK: () => has.KafeisMask,
    KAMAROS_MASK: () => has.KamarosMask,
    COUPLES_MASK: () => has.CouplesMask,
    GIBDOS_MASK: () => has.GibdosMask,
    GAROS_MASK: () => has.GarosMask,
    CAPTAINS_HAT: () => has.CaptainsHat,
    GIANTS_MASK: () => has.GiantsMask,
    FIERCE_DEITY_MASK: () => has.FierceDeityMask,
    MASK_OF_TRUTH: () => has.MaskOfTruth
  };

  const masks = () => [
    has.PostmansHat,
    has.AllNightMask,
    has.BlastMask,
    has.StoneMask,
    has.GreatFairyMask,
    has.KeatonMask,
    has.BremenMask,
    has.BunnyHood,
    has.DonGerosMask,
    has.MaskOfScents,
    has.RomanisMask,
    has.CircusLeadersMask,
    has.KafeisMask,
    has.CouplesMask,
    has.MaskOfTruth,
    has.KamarosMask,
    has.GibdosMask,
    has.GarosMask,
    has.CaptainsHat,
    has.GiantsMask
  ];

  const bottles = () => [
    has.WitchBottle,
    has.AlienBottle,
    has.BeaverRaceBottle,
    has.ArcheryBottle,
    has.GoronRaceBottle,
    has.ChateauBottle,
    has.UsableMysteryMilkBottle
  ];

  const has: Has = {
    ...values,
    SkipBombersMinigame: settings.skipBombersMinigame,

    // Helpers, in `UpdateHelpers` order. Where it assigns one twice, the last assignment wins.
    get DekuStickDrop() {
      return has.StickPot || has.DekuBabaSticks;
    },
    get DekuNutDrop() {
      return has.NutPot || has.NutCrate || has.DekuBabaNuts;
    },
    get BugsAccess() {
      return has.BugShrub || has.WanderingBugs || has.BugRock;
    },
    get FishAccess() {
      return has.LoneFish || has.FishGroup;
    },
    get WaterAccess() {
      return (has.SpringWater && has.AnyBottle) || has.CanPlay(has.SongOfStorms);
    },
    get HotSpringWaterAccess() {
      return has.HotSpringWater && has.AnyBottle;
    },
    get BeansAndWater() {
      return has.AnyMagicBean && (has.SpringWater || has.SongOfStorms);
    },
    get Bombs() {
      return has.AnyBombBag;
    },
    get Nuts() {
      return has.DekuNutDrop;
    },
    get Sticks() {
      return has.DekuStickDrop || has.DekuStick;
    },
    // Events also set these two. The generator only recalculates helpers when it applies an item,
    // so once the search settles, an event that happened keeps them true.
    get Bugs() {
      return values.Bugs || (has.AnyBottle && has.BugsAccess);
    },
    get Fish() {
      return values.Fish || (has.AnyBottle && has.FishAccess);
    },

    get CanBlastOrSmash() {
      return has.HasExplosives || has.GoronMask;
    },
    get CanDive() {
      return has.CanUse('ZORA_MASK');
    },
    get CanPlantBugs() {
      return has.HasBottle && has.BugsAccess;
    },
    get CanRideEpona() {
      return has.Epona && has.CanPlay(has.EponasSong);
    },
    get CanPlantBean() {
      return has.AnyMagicBean || has.MagicBeanPack;
    },
    get CanOpenStormGrotto() {
      return has.CanPlay(has.SongOfStorms);
    },
    get CanOpenBombGrotto() {
      return has.CanBlastOrSmash;
    },
    get DekuStickFighting() {
      return has.Sticks;
    },
    get HasFireSource() {
      return has.CanUse('FIRE_ARROWS');
    },
    get HasFireSourceWithTorch() {
      return has.Sticks;
    },
    get AnySword() {
      return has.GreatFairySword || has.AnyBSword;
    },
    get AnyBSword() {
      return has.KokiriSword || has.RazorSword || has.GildedSword || has.ProgressiveSword >= 1;
    },
    get NightInnAccess() {
      return has.DekuMask || has.RoomKey;
    },

    get Fighting() {
      return has.GoronMask || has.ZoraMask || has.AnySword;
    },
    get AnyShield() {
      return has.HerosShield || has.MirrorShield;
    },
    get CanUseProjectile() {
      return (
        has.Hookshot ||
        has.HerosBow ||
        has.ProgressiveBow >= 1 ||
        (has.DekuMask && has.MagicMeter) ||
        has.ZoraMask
      );
    },
    // Blast Mask without a shield hurts the player.
    get HasExplosives() {
      return has.AnyBombBag || (has.BlastMask && has.AnyShield);
    },

    get AnyMagicBean() {
      return has.MagicBean || has.LimitlessBeans;
    },
    get AnyWallet() {
      return has.Townwallet200 || has.OceanWallet500 || has.ProgressiveWallet >= 1;
    },
    get AnyBottle() {
      return bottles().some(Boolean) || has.HasBottle;
    },
    get MagicMeter() {
      return has.ProgressiveMagic >= 1 || has.MagicPower || has.ExtendedMagicPower;
    },
    get Scarecrow() {
      return has.Hookshot && has.CanPlay(has.ScarecrowSong);
    },
    get AnyPaper() {
      return (
        has.LandTitle ||
        has.SwampTitle ||
        has.OceanTitle ||
        has.MountainTitle ||
        has.LetterKafei ||
        has.LetterMama
      );
    },

    get AnyBombBag() {
      return has.ProgressiveBombBag >= 1 || has.BombBag20 || has.TownBombBag || has.MountainBombBag;
    },
    get Explosives() {
      return has.BlastMask || has.AnyBombBag;
    },
    get HasBombchus() {
      return (has.BuyBombchus5 || has.BuyBombchus10 || has.BuyBombchus20) && has.AnyBombBag;
    },
    get FoundBombchus() {
      return has.Bombchus;
    },
    get Bow() {
      return has.ProgressiveBow >= 1 || has.HerosBow;
    },

    get AnyHealingPotion() {
      return has.AnyRedPotion || has.AnyBluePotion;
    },
    get AnyRedPotion() {
      return has.AnyBottle;
    },
    get AnyBluePotion() {
      return has.AnyBottle;
    },
    // The generator lists every pair of the bottles below.
    get TwoBottles() {
      return bottles().filter(Boolean).length >= 2;
    },

    get PoisonWaterAsZora() {
      return has.ZoraMask && has.TakeDamage;
    },
    get WFT2ndFloorSkip() {
      return has.Hookshot;
    },
    get OneMask() {
      return masks().some(Boolean);
    },
    TwoMasks: false,
    ThreeMasks: false,
    FourMasks: false,
    get AllMasks() {
      return masks().every(Boolean);
    },

    get CurrentRemains() {
      return [has.OdolwaRemains, has.GohtRemains, has.GyorgRemains, has.TwinmoldRemains].filter(
        Boolean
      ).length;
    },
    get RemainsForMoon() {
      return has.CurrentRemains >= settings.remainsForMoon;
    },
    get RemainsForMajora() {
      return has.CurrentRemains >= settings.remainsForMajora;
    },

    // Helper functions.
    CanPlay: (song) => has.Ocarina && song,
    CanUse: (item) => {
      const found = hasItem[item]?.() ?? false;
      if (magicItems.includes(item)) return found && has.MagicMeter;
      if (magicArrows.includes(item)) return found && has.MagicMeter && has.Bow;
      return otherUsableItems.includes(item) && found;
    },
    SmallKeys: (keys, required) => keys >= required,
    ZoraEggCount: (eggs, required) => eggs >= required,
    StrayFairyCount: (fairies, required) => fairies >= required,
    SkulltulaCount: (tokens, required) => tokens >= required,
    TotalHeartContainers: (required) =>
      has.HeartContainers + Math.floor(has.PiecesOfHeart / 4) + 3 >= required,
    TotalMaskCount: () =>
      // Mirrors `TotalMaskCount`, which counts the same masks as the mask helpers.
      masks().filter(Boolean).length
  };

  return has;
};
