/** The big areas of Termina, in the order the list view shows them. */
export const regions = [
  'Clock Town',
  'Termina Field',
  'Southern Swamp',
  'Snowhead',
  'Great Bay',
  'Ikana',
  'The Moon',
  'Other'
] as const;

export type Region = (typeof regions)[number];

/**
 * The places checks belong to, in the order they're listed within their region. Every check name
 * in the seed starts with its zone's prefix, which is how checks are sorted into zones.
 */
export const zones = [
  {
    id: 'southClockTown',
    name: 'South Clock Town',
    region: 'Clock Town',
    // The Clock Tower's checks are in South Clock Town: the four starting items, and the Ocarina
    // when the seed doesn't start with it.
    prefixes: [
      'SCT ',
      'Song of Time',
      'Song of Healing',
      'Deku Mask',
      'Bombers Notebook',
      'Ocarina of Time'
    ]
  },
  { id: 'northClockTown', name: 'North Clock Town', region: 'Clock Town', prefixes: ['NCT '] },
  {
    id: 'eastClockTown',
    name: 'East Clock Town',
    region: 'Clock Town',
    prefixes: ['ECT ', "Bombers' Hideout"]
  },
  { id: 'westClockTown', name: 'West Clock Town', region: 'Clock Town', prefixes: ['WCT '] },
  { id: 'laundryPool', name: 'Laundry Pool', region: 'Clock Town', prefixes: ['LP '] },
  { id: 'stockPotInn', name: 'Stock Pot Inn', region: 'Clock Town', prefixes: ['SPI '] },

  { id: 'terminaField', name: 'Termina Field', region: 'Termina Field', prefixes: ['TF '] },
  { id: 'milkRoad', name: 'Milk Road', region: 'Termina Field', prefixes: ['MR '] },
  { id: 'romaniRanch', name: 'Romani Ranch', region: 'Termina Field', prefixes: ['RR '] },

  {
    id: 'roadToSouthernSwamp',
    name: 'Road to Southern Swamp',
    region: 'Southern Swamp',
    // One check name in the seed capitalizes "To".
    prefixes: ['Road to Southern Swamp', 'Road To Southern Swamp']
  },
  { id: 'southernSwamp', name: 'Southern Swamp', region: 'Southern Swamp', prefixes: ['SS '] },
  {
    id: 'swampSpiderHouse',
    name: 'Swamp Spider House',
    region: 'Southern Swamp',
    prefixes: ['SSH ']
  },
  { id: 'dekuPalace', name: 'Deku Palace', region: 'Southern Swamp', prefixes: ['DP '] },
  { id: 'woodfall', name: 'Woodfall', region: 'Southern Swamp', prefixes: ['WF '] },
  {
    id: 'woodfallTemple',
    name: 'Woodfall Temple',
    region: 'Southern Swamp',
    prefixes: ['Woodfall Temple']
  },

  { id: 'mountainVillage', name: 'Mountain Village', region: 'Snowhead', prefixes: ['MV '] },
  { id: 'twinIslands', name: 'Twin Islands', region: 'Snowhead', prefixes: ['TI '] },
  { id: 'goronVillage', name: 'Goron Village', region: 'Snowhead', prefixes: ['GV '] },
  {
    id: 'roadToSnowhead',
    name: 'Road to Snowhead',
    region: 'Snowhead',
    prefixes: ['Road to Snowhead']
  },
  { id: 'snowhead', name: 'Snowhead', region: 'Snowhead', prefixes: ['SH '] },
  {
    id: 'snowheadTemple',
    name: 'Snowhead Temple',
    region: 'Snowhead',
    prefixes: ['Snowhead Temple']
  },

  { id: 'greatBayCoast', name: 'Great Bay Coast', region: 'Great Bay', prefixes: ['GBC '] },
  { id: 'oceanSpiderHouse', name: 'Ocean Spider House', region: 'Great Bay', prefixes: ['OSH '] },
  { id: 'pinnacleRock', name: 'Pinnacle Rock', region: 'Great Bay', prefixes: ['PR '] },
  {
    id: 'piratesFortress',
    name: "Pirates' Fortress",
    region: 'Great Bay',
    prefixes: ["Pirate's Fortress"]
  },
  { id: 'zoraCape', name: 'Zora Cape', region: 'Great Bay', prefixes: ['ZC '] },
  { id: 'zoraHall', name: 'Zora Hall', region: 'Great Bay', prefixes: ['ZH '] },
  {
    id: 'greatBayTemple',
    name: 'Great Bay Temple',
    region: 'Great Bay',
    prefixes: ['Great Bay Temple']
  },

  { id: 'roadToIkana', name: 'Road to Ikana', region: 'Ikana', prefixes: ['Road to Ikana'] },
  { id: 'ikanaGraveyard', name: 'Ikana Graveyard', region: 'Ikana', prefixes: ['IG '] },
  { id: 'ikanaCanyon', name: 'Ikana Canyon', region: 'Ikana', prefixes: ['IC '] },
  {
    id: 'beneathTheWell',
    name: 'Beneath the Well',
    region: 'Ikana',
    prefixes: ['Beneath the Well']
  },
  { id: 'ikanaCastle', name: 'Ikana Castle', region: 'Ikana', prefixes: ['Ikana Castle'] },
  { id: 'secretShrine', name: 'Secret Shrine', region: 'Ikana', prefixes: ['Secret Shrine'] },
  { id: 'stoneTower', name: 'Stone Tower', region: 'Ikana', prefixes: ['IST '] },
  {
    id: 'stoneTowerTemple',
    name: 'Stone Tower Temple',
    region: 'Ikana',
    prefixes: ['Stone Tower Temple']
  },

  { id: 'moon', name: 'The Moon', region: 'The Moon', prefixes: ['The Moon', 'Oath to Order'] },

  // Any check whose name matches no prefix, such as one added by a newer randomizer version.
  { id: 'other', name: 'Other', region: 'Other', prefixes: [] }
] as const satisfies ReadonlyArray<{
  readonly id: string;
  readonly name: string;
  readonly region: Region;
  readonly prefixes: ReadonlyArray<string>;
}>;

export type Zone = (typeof zones)[number];
export type ZoneId = Zone['id'];
