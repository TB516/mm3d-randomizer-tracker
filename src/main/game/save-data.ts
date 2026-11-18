import type { Inventory } from '../../shared/inventory';
import {
  bossRemains,
  inventoryItems,
  type InventoryItem,
  shields,
  songs,
  swords
} from '../../shared/items';

/**
 * The game's `SaveData` in memory (`CommonData.save`), laid out as in mm3dr's
 * `game/common_data.h`. It's the same layout as `save0.bin` from file offset 8.
 */
export const saveDataAddress = 0x7751e0;
export const saveDataSize = 0x1a88;

/** Where the nested structs start, since most fields are listed relative to one. */
const playerData = 0x118;
const inventory = 0x174;

const offsets = {
  healthMax: playerData + 0x1a,
  magicSizeType: playerData + 0x1e,
  doubleDefense: playerData + 0x28,
  swordShield: 0x172,
  items: inventory,
  masks: inventory + 0x18,
  upgrades: inventory + 0x78,
  collectRegister: inventory + 0x7c,
  skulltulas: 0x1208
} as const;

/** Item IDs per screen. Each slot is one byte. */
const slotCount = 24;
/** Max health is stored in sixteenths of a heart. */
const healthPerHeart = 16;

/** A value packed into part of an integer: its lowest bit, and how many bits wide it is. */
type BitField = { readonly start: number; readonly length: number };

/** The u16 at `swordShield`. 0 means none, then each level in order. */
const swordShieldFields = {
  sword: { start: 0, length: 4 },
  shield: { start: 4, length: 8 }
} as const satisfies Record<string, BitField>;

/** The u32 at `upgrades`. Each is a level, 0 for none. */
const upgradeFields = {
  quiver: { start: 0, length: 3 },
  bombBag: { start: 3, length: 3 },
  wallet: { start: 12, length: 2 }
} as const satisfies Record<string, BitField>;

/**
 * The u32 at `collectRegister`. Remains and songs are one bit each, in the order of the
 * `bossRemains` and `songs` lists.
 */
const collectFields = {
  bossRemains: { start: 0, length: bossRemains.length },
  songs: { start: 6, length: songs.length },
  bombersNotebook: { start: 18, length: 1 },
  heartPieces: { start: 28, length: 4 }
} as const satisfies Record<string, BitField>;

/** The u32 at `skulltulas`: one token count per Spider House. */
const skulltulaFields = {
  ocean: { start: 0, length: 16 },
  swamp: { start: 16, length: 16 }
} as const satisfies Record<string, BitField>;

/**
 * Reads a value packed into part of an integer.
 *
 * @param value - The integer it's packed into.
 * @param field - Where the value sits.
 * @returns The value.
 */
const readBits = (value: number, field: BitField) =>
  // Shift the field down to bit 0, then keep only its `length` bits, so 3 bits keeps `0b111`.
  (value >>> field.start) & ((1 << field.length) - 1);

/**
 * Reads a run of one-bit flags, one per entry in `names`.
 *
 * @param value - The integer the flags are packed into.
 * @param field - Where the flags sit, one bit per name.
 * @param names - What each flag stands for, in bit order.
 * @returns The names whose flag is set.
 */
const readFlags = <Name>(value: number, field: BitField, names: ReadonlyArray<Name>) => {
  const flags = readBits(value, field);
  return names.filter((_, index) => (flags >>> index) & 1);
};

/**
 * Reads one screen of 24 item slots.
 *
 * @param save - The game's save data.
 * @param offset - Where the slots start in the save data.
 * @returns The items in the slots, in slot order, without empty slots.
 */
const readSlots = (save: Uint8Array, offset: number) =>
  // Each slot is one byte holding an item ID. Empty slots hold 0xFF, which has no name, so they
  // drop out here.
  Array.from(save.subarray(offset, offset + slotCount)).flatMap((itemId) => {
    const item = inventoryItems[itemId];
    return item ? [item] : [];
  });

/**
 * Decodes what the player has from the game's save data.
 *
 * @param save - `saveDataSize` bytes read from `saveDataAddress`.
 * @param tradeItems - The trade items held, from the randomizer's data.
 * @returns The player's inventory.
 */
export const decodeInventory = (
  save: Uint8Array,
  tradeItems: ReadonlyArray<InventoryItem>
): Inventory => {
  // These four hold several values each, which the field tables above split apart.
  const view = new DataView(save.buffer, save.byteOffset, save.byteLength);
  const swordShield = view.getUint16(offsets.swordShield, true);
  const upgrades = view.getUint32(offsets.upgrades, true);
  const collected = view.getUint32(offsets.collectRegister, true);
  const skulltulas = view.getUint32(offsets.skulltulas, true);

  // Level 0 is none, and level N is the Nth entry in the list.
  const swordLevel = readBits(swordShield, swordShieldFields.sword);
  const shieldLevel = readBits(swordShield, swordShieldFields.shield);

  return {
    items: readSlots(save, offsets.items),
    tradeItems,
    masks: readSlots(save, offsets.masks),
    songs: readFlags(collected, collectFields.songs, songs),
    bossRemains: readFlags(collected, collectFields.bossRemains, bossRemains),
    bombersNotebook: readBits(collected, collectFields.bombersNotebook) === 1,

    sword: swords[swordLevel - 1] ?? null,
    shield: shields[shieldLevel - 1] ?? null,

    quiver: readBits(upgrades, upgradeFields.quiver),
    bombBag: readBits(upgrades, upgradeFields.bombBag),
    wallet: readBits(upgrades, upgradeFields.wallet),
    magic: view.getUint8(offsets.magicSizeType),
    doubleDefense: view.getUint8(offsets.doubleDefense) === 1,

    maxHearts: Math.floor(view.getUint16(offsets.healthMax, true) / healthPerHeart),
    heartPieces: readBits(collected, collectFields.heartPieces),
    swampTokens: readBits(skulltulas, skulltulaFields.swamp),
    oceanTokens: readBits(skulltulas, skulltulaFields.ocean)
  };
};
