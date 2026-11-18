import type { ZoneId } from '../../../shared/zones';

/**
 * Where each zone's pin sits on `assets/termina.png`, in the image's pixels. Pins follow the
 * landmarks painted on the map, checked against maps of the game's layout.
 */
export const mapPins: Partial<Record<ZoneId, readonly [x: number, y: number]>> = {
  // Clock Town's zones sit in a ring around the town, spread enough that the pins don't touch.
  northClockTown: [667, 422],
  westClockTown: [621, 467],
  eastClockTown: [713, 467],
  southClockTown: [667, 512],
  laundryPool: [716, 513],
  stockPotInn: [729, 423],

  terminaField: [575, 410],
  milkRoad: [625, 525],
  romaniRanch: [598, 545],

  roadToSouthernSwamp: [628, 580],
  southernSwamp: [600, 665],
  swampSpiderHouse: [552, 652],
  dekuPalace: [625, 715],
  woodfall: [690, 668],
  woodfallTemple: [668, 628],

  mountainVillage: [660, 345],
  twinIslands: [745, 285],
  goronVillage: [865, 250],
  roadToSnowhead: [628, 285],
  snowhead: [612, 232],
  snowheadTemple: [612, 168],

  greatBayCoast: [385, 512],
  oceanSpiderHouse: [432, 468],
  pinnacleRock: [232, 462],
  piratesFortress: [428, 372],
  zoraCape: [368, 625],
  zoraHall: [325, 558],
  greatBayTemple: [158, 505],

  roadToIkana: [800, 458],
  ikanaGraveyard: [840, 378],
  ikanaCanyon: [935, 432],
  beneathTheWell: [1000, 404],
  ikanaCastle: [985, 450],
  secretShrine: [1048, 392],
  stoneTower: [1080, 440],
  stoneTowerTemple: [1117, 385],

  // The moon has no place on the map, so it hangs in the sky above the mountains.
  moon: [1000, 125],

  // Checks that match no zone get a pin in the paper's top-right corner, so they're never hidden.
  other: [1200, 130]
};

/** Size of `assets/termina.png`, in pixels. */
export const mapImage = { width: 1333, height: 948 };

/** The part of the map image that's shown: the land, without most of the paper around it. */
export const mapCrop = { x: 95, y: 75, width: 1160, height: 765 };
