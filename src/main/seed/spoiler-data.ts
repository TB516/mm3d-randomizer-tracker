import { Effect, Schema } from 'effect';

import { matchesAt } from './bytes';

/** The patch has no `SpoilerData`, so it's not a seed from a randomizer version we support. */
export class SpoilerDataNotFound extends Schema.TaggedError<SpoilerDataNotFound>()(
  'SpoilerDataNotFound',
  {}
) {}

/**
 * `SpoilerData` layout from mm3dr's `rnd/spoiler_data.h`. The struct has no fixed address in the
 * patch, so it's found from its string table, which always starts with these two item names.
 *
 * The struct is: a header with the location count, a table of 512 location entries, a 512-entry
 * u16 array this doesn't use, then the string table that holds every name.
 */
const stringTableStart = new TextEncoder().encode('Song of Time\0Deku Mask\0');
const locationCountOffset = 2;
const maxLocations = 512;
const locationsOffset = 204;
const locationSize = 12;
/** The 512-entry u16 array between the locations and the strings. */
const sphereLocationsSize = maxLocations * 2;
const stringTableOffset = locationsOffset + maxLocations * locationSize + sphereLocationsSize;

/** Where each field this reads starts inside a 12-byte location entry. */
const locationFields = {
  nameOffset: 0,
  itemOffset: 2,
  scene: 5,
  flag: 6,
  overrideType: 10
} as const;

/** How the game decides a location was collected. Values of mm3dr's `ItemOverride_Type`. */
const OverrideType = { BaseItem: 0, Chest: 1, Collectable: 2 } as const;

/**
 * Items the game gives at more than one location, as (override type, flag) and every scene that
 * gives it. Getting the item at one marks every copy collected. Mirrors
 * `SpoilerLog_CheckMultiLocationItems` in mm3dr's `spoiler_data.cpp`.
 */
const sharedItems: ReadonlyArray<{
  readonly type: number;
  readonly flag: number;
  readonly scenes: ReadonlyArray<number>;
}> = [
  { type: OverrideType.BaseItem, flag: 0x59, scenes: [0x0a, 0x64] }, // Koume, potion shop and woods
  { type: OverrideType.BaseItem, flag: 0xba, scenes: [0x6c, 0x6e, 0x6f] }, // Postman's postboxes
  { type: OverrideType.BaseItem, flag: 0xb4, scenes: [0x13, 0x6e] }, // Tingle's Clock Town map
  { type: OverrideType.BaseItem, flag: 0xb5, scenes: [0x40, 0x6e] }, // Tingle's Woodfall map
  { type: OverrideType.BaseItem, flag: 0xb6, scenes: [0x40, 0x5d, 0x5e] }, // Tingle's Snowhead map
  { type: OverrideType.BaseItem, flag: 0xb7, scenes: [0x22, 0x5d, 0x5e] }, // Tingle's Romani Ranch map
  { type: OverrideType.BaseItem, flag: 0xb8, scenes: [0x22, 0x37] }, // Tingle's Great Bay map
  { type: OverrideType.BaseItem, flag: 0xb9, scenes: [0x13, 0x37] }, // Tingle's Stone Tower map
  { type: OverrideType.BaseItem, flag: 0x03, scenes: [0x22, 0x5a, 0x6e] }, // Keaton quiz
  { type: OverrideType.BaseItem, flag: 0x34, scenes: [0x48, 0x4d] }, // Powder Keg challenge, both seasons
  { type: OverrideType.BaseItem, flag: 0x1d, scenes: [0x48, 0x4d] }, // Goron Village scrub purchase
  { type: OverrideType.BaseItem, flag: 0x99, scenes: [0x48, 0x4d] }, // Goron Village scrub trade
  { type: OverrideType.Collectable, flag: 0x00, scenes: [0x48, 0x4d] }, // Goron Village ledge heart piece
  { type: OverrideType.BaseItem, flag: 0x35, scenes: [0x00, 0x45] }, // Swamp scrub purchase, both swamps
  { type: OverrideType.BaseItem, flag: 0x98, scenes: [0x00, 0x45] }, // Swamp scrub trade
  { type: OverrideType.Collectable, flag: 0x00, scenes: [0x00, 0x45] }, // Tourist Center roof heart piece
  { type: OverrideType.Chest, flag: 0x05, scenes: [0x16, 0x18] } // Stone Tower Temple chest, both ways up
];

/** A check in the seed. */
export type SeedLocation = {
  /** Position in the seed's location table, which the game's collected flags also use. */
  readonly index: number;
  readonly name: string;
  /** The item placed here. Logic reads it in the main process; it never goes to the page. */
  readonly item: string;
  /** Which of `sharedItems` this location gives a copy of, if any. */
  readonly sharedItem: number | null;
};

/** Names are single-byte text. */
const latin1 = new TextDecoder('latin1');

/**
 * Reads a zero-terminated name from the string table.
 *
 * @param image - The patched image.
 * @param start - Where the name starts.
 * @returns The name, or null if it never ends.
 */
const readName = (image: Uint8Array, start: number) => {
  const end = image.indexOf(0, start);
  return end === -1 ? null : latin1.decode(image.subarray(start, end));
};

/**
 * Finds where the string table starts.
 *
 * @param image - The output of `applyIpsPatch` for the seed's `code.ips`.
 * @returns The string table's position, or -1 if it isn't there.
 */
const findStringTable = (image: Uint8Array) => {
  for (let position = 0; position < image.length; position++) {
    if (matchesAt(image, stringTableStart, position)) return position;
  }

  return -1;
};

/**
 * Reads the seed's checks from a patched image.
 *
 * @param image - The output of `applyIpsPatch` for the seed's `code.ips`.
 * @returns The checks in location-table order, each with its table index.
 */
export const readLocations = Effect.fn('readLocations')(function* (image: Uint8Array) {
  // Find the string table, then step back by its known offset to reach the struct's start.
  const strings = findStringTable(image);
  const base = strings - stringTableOffset;
  if (strings === -1 || base < 0) return yield* new SpoilerDataNotFound();

  const view = new DataView(image.buffer, image.byteOffset, image.byteLength);
  const count = view.getUint16(base + locationCountOffset, true);
  if (count > maxLocations) return yield* new SpoilerDataNotFound();

  const locations: SeedLocation[] = [];

  for (let index = 0; index < count; index++) {
    const entry = base + locationsOffset + index * locationSize;
    const scene = view.getUint8(entry + locationFields.scene);
    const flag = view.getUint8(entry + locationFields.flag);
    const overrideType = view.getUint8(entry + locationFields.overrideType);

    const sharedItem = sharedItems.findIndex(
      (shared) =>
        shared.type === overrideType && shared.flag === flag && shared.scenes.includes(scene)
    );

    // Names are found by their offset into the string table.
    const name = readName(image, strings + view.getUint16(entry + locationFields.nameOffset, true));
    const item = readName(image, strings + view.getUint16(entry + locationFields.itemOffset, true));
    if (name === null || item === null) return yield* new SpoilerDataNotFound();

    locations.push({ index, name, item, sharedItem: sharedItem === -1 ? null : sharedItem });
  }

  return locations;
});
