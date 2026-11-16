import type { BossRemains, InventoryItem, Shield, Song, Sword } from './items';

/** What the player has, read from the game's save data. */
export type Inventory = {
  /** Contents of the item and mask screens, without empty slots. */
  readonly items: ReadonlyArray<InventoryItem>;
  readonly masks: ReadonlyArray<InventoryItem>;
  readonly songs: ReadonlyArray<Song>;
  readonly bossRemains: ReadonlyArray<BossRemains>;
  readonly bombersNotebook: boolean;

  readonly sword: Sword | null;
  readonly shield: Shield | null;

  /** Upgrade levels, 0 for none. */
  readonly quiver: number;
  readonly bombBag: number;
  readonly wallet: number;
  /** 0 for none, 1 for the normal meter, 2 for double. */
  readonly magic: number;
  readonly doubleDefense: boolean;

  /** Whole hearts in the life meter, including the three you start with. */
  readonly maxHearts: number;
  readonly heartPieces: number;
  readonly swampTokens: number;
  readonly oceanTokens: number;
};
