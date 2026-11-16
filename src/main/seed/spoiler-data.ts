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
const locationFields = { nameOffset: 0, scene: 5, flag: 6, overrideType: 10 } as const;

/** How the game decides a location was collected. Values of mm3dr's `ItemOverride_Type`. */
const OverrideType = { BaseItem: 0, Chest: 1, Collectable: 2 } as const;

/**
 * Locations that share their item with another location and get marked collected along with it,
 * as (override type, scene, flag). Mirrors `SpoilerData_IsUniqueLocation` in mm3dr's
 * `spoiler_data.cpp`, so each shared item counts as one check, as it does in game.
 */
const duplicateLocations: ReadonlyArray<readonly [number, number, number]> = [
  [OverrideType.BaseItem, 0x64, 0x59], // Koume in the woods
  [OverrideType.BaseItem, 0x6e, 0xba], // North Clock Town postbox
  [OverrideType.BaseItem, 0x6f, 0xba], // South Clock Town postbox
  [OverrideType.BaseItem, 0x13, 0xb4], // Clock Town map, Ikana Tingle
  [OverrideType.BaseItem, 0x6e, 0xb5], // Woodfall map, Clock Town Tingle
  [OverrideType.BaseItem, 0x40, 0xb6], // Snowhead map, Woodfall Tingle
  [OverrideType.BaseItem, 0x5e, 0xb6], // Snowhead map, spring Snowhead Tingle
  [OverrideType.BaseItem, 0x5d, 0xb7], // Ranch map, winter Snowhead Tingle
  [OverrideType.BaseItem, 0x5e, 0xb7], // Ranch map, spring Snowhead Tingle
  [OverrideType.BaseItem, 0x22, 0xb8], // Great Bay map, ranch Tingle
  [OverrideType.BaseItem, 0x37, 0xb9], // Stone Tower map, Great Bay Tingle
  [OverrideType.BaseItem, 0x22, 0x03], // Keaton, Milk Road
  [OverrideType.BaseItem, 0x5a, 0x03], // Keaton, Mountain Village
  [OverrideType.BaseItem, 0x48, 0x34], // Powder Keg challenge, spring
  [OverrideType.BaseItem, 0x48, 0x1d], // Goron Village scrub purchase, spring
  [OverrideType.BaseItem, 0x48, 0x99], // Goron Village scrub trade, spring
  [OverrideType.Collectable, 0x48, 0x00], // Goron Village ledge heart piece, spring
  [OverrideType.BaseItem, 0x00, 0x35], // Swamp scrub purchase, cleared swamp
  [OverrideType.BaseItem, 0x00, 0x98], // Swamp scrub trade, cleared swamp
  [OverrideType.Collectable, 0x00, 0x00] // Tourist Center roof heart piece, cleared swamp
];

/** A check in the seed. The item placed there is deliberately left out. */
export type SeedLocation = {
  /** Position in the seed's location table, which the game's collected flags also use. */
  readonly index: number;
  readonly name: string;
};

/** Location names are single-byte text. */
const latin1 = new TextDecoder('latin1');

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
 * Reads the seed's checks from a patched image, leaving out shared-item duplicates.
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

    const isDuplicate = duplicateLocations.some(
      ([duplicateType, duplicateScene, duplicateFlag]) =>
        overrideType === duplicateType && scene === duplicateScene && flag === duplicateFlag
    );
    if (isDuplicate) continue;

    // Names are zero-terminated strings, found by their offset into the string table.
    const nameStart = strings + view.getUint16(entry + locationFields.nameOffset, true);
    const nameEnd = image.indexOf(0, nameStart);
    if (nameEnd === -1) return yield* new SpoilerDataNotFound();

    const name = latin1.decode(image.subarray(nameStart, nameEnd));
    locations.push({ index, name });
  }

  return locations;
});
