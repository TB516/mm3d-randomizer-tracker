import { Effect, Schema } from 'effect';

import { inventoryItems, type InventoryItem } from '../../shared/items';
import { AzaharRpc } from '../azahar/rpc';

/** No randomizer data in memory yet, usually because no save file is loaded. */
export class ExtSaveDataNotFound extends Schema.TaggedError<ExtSaveDataNotFound>()(
  'ExtSaveDataNotFound',
  {}
) {}

/** The randomizer's `ExtSaveData`, laid out as in mm3dr's `rnd/savefile.h`. */
export const extSaveDataSize = 4296;
const extSaveDataVersion = 19;

/** Where each field this reads starts in the block. Offsets are listed in `docs/research.md`. */
const offsets = {
  version: 0,
  isNewFile: 8,
  itemCollected: 44,
  chestRewarded: 556,
  collectedTradeItems: 4268
} as const;

/** One byte per seed location, the same 512 slots as the seed's location table. */
const itemCollectedSize = 512;

/**
 * The trade items the player holds, one slot each in this order. A slot holds its item's ID while
 * the player has it, and is emptied when it's traded away (mm3dr's `SaveFile_InitExtSaveData`).
 */
const tradeItems: ReadonlyArray<InventoryItem> = [
  'MoonTear',
  'LandTitleDeed',
  'SwampTitleDeed',
  'MountainTitleDeed',
  'OceanTitleDeed',
  'RoomKey',
  'LetterToKafei',
  'PendantOfMemories',
  'LetterToMama'
];

/** What a trade slot holds when the player doesn't have its item: `game::ItemId::None`. */
const emptyTradeSlot = 0xff;

/** One byte per chest flag, for every scene. */
const sceneCount = 116;
const chestFlagsPerScene = 32;
const chestRewardedSize = sceneCount * chestFlagsPerScene;

/** The randomizer's code section. The linker places the block somewhere in it. */
const scanStart = 0x7d0000;
const scanEnd = 0xa00000;
/** The block is 4-byte aligned, so only every fourth address can be its start. */
const scanStep = 4;

/**
 * Gets the collected flags from a randomizer data block.
 *
 * @param block - A whole `ExtSaveData` block.
 * @returns One byte per seed location, 1 once collected, indexed like the seed's location table.
 */
const readItemCollected = (block: Uint8Array) =>
  block.subarray(offsets.itemCollected, offsets.itemCollected + itemCollectedSize);

/**
 * Checks whether a block is the randomizer data.
 *
 * @param block - Candidate bytes, `extSaveDataSize` long.
 * @returns `false` if any part of the block doesn't fit the data's layout.
 */
const isExtSaveData = (block: Uint8Array) => {
  if (block.length !== extSaveDataSize) return false;

  // Plenty of memory happens to hold a 19 where the version goes, so every field has to fit.
  // Cheap checks first, since the scan runs this at every 4-byte step.
  const view = new DataView(block.buffer, block.byteOffset, block.byteLength);
  if (view.getUint32(offsets.version, true) !== extSaveDataVersion) return false;
  if (view.getUint32(offsets.isNewFile, true) > 1) return false;

  const itemCollected = readItemCollected(block);
  const chestRewarded = block.subarray(
    offsets.chestRewarded,
    offsets.chestRewarded + chestRewardedSize
  );

  // Both are arrays of one-byte booleans, so any byte above 1 means this isn't the real block.
  return (
    itemCollected.every((value) => value <= 1) &&
    chestRewarded.every((value) => value <= 1) &&
    // Each trade slot is empty or holds its own item, which rules out blocks of zeros. A new file
    // has no checks collected yet, so this can't rely on those.
    tradeItems.every((item, slot) => {
      const itemId = block[offsets.collectedTradeItems + slot];
      return itemId === emptyTradeSlot || itemId === inventoryItems.indexOf(item);
    })
  );
};

/**
 * Finds where the randomizer data is in memory. Reads about 2.3 MB, so call it once per loaded
 * file.
 *
 * @returns The data's address. Fails with `ExtSaveDataNotFound` if no block matches.
 */
export const findExtSaveData = Effect.fn('findExtSaveData')(function* () {
  // The data has no fixed address, so read the whole section it can be in and search it.
  const rpc = yield* AzaharRpc;
  const region = yield* rpc.readMemory(scanStart, scanEnd - scanStart);

  for (let offset = 0; offset + extSaveDataSize <= region.length; offset += scanStep) {
    if (isExtSaveData(region.subarray(offset, offset + extSaveDataSize))) {
      return scanStart + offset;
    }
  }

  return yield* new ExtSaveDataNotFound();
});

/**
 * Gets the trade items the player holds from a randomizer data block.
 *
 * @param block - A whole `ExtSaveData` block.
 * @returns The trade items held, in slot order.
 */
const readTradeItems = (block: Uint8Array) =>
  tradeItems.filter(
    (item, slot) => inventoryItems[block[offsets.collectedTradeItems + slot] ?? -1] === item
  );

/**
 * Reads which seed locations are collected, and the trade items the player holds. The game's own
 * item screen shows only one trade item per slot, so these come from the randomizer's list.
 *
 * @param address - The randomizer data's address, from `findExtSaveData`.
 * @returns One byte per seed location, 1 once collected, and the trade items held. Fails with
 * `ExtSaveDataNotFound` if the block no longer looks like the data, for example after a reset.
 */
export const readRandomizerData = Effect.fn('readRandomizerData')(function* (address: number) {
  const rpc = yield* AzaharRpc;
  const block = yield* rpc.readMemory(address, extSaveDataSize);
  if (!isExtSaveData(block)) return yield* new ExtSaveDataNotFound();

  return { collected: readItemCollected(block), tradeItems: readTradeItems(block) };
});
