import type { BossRemains, InventoryItem, Shield, Song, Sword, Temple } from './items';

/** One temple's own items. */
export type DungeonItems = {
  /** Keys held now. Opening a locked door uses one up. */
  readonly smallKeys: number;
  readonly bossKey: boolean;
  readonly map: boolean;
  readonly compass: boolean;
  /** Stray fairies held for the temple's Great Fairy, out of 15. */
  readonly strayFairies: number;
};

/** What the player has, read from the game's save data. */
export type Inventory = {
  /** Contents of the item and mask screens, without empty slots. */
  readonly items: ReadonlyArray<InventoryItem>;
  readonly masks: ReadonlyArray<InventoryItem>;
  /** Trade items held, such as the title deeds. The item screen only ever shows one at a time. */
  readonly tradeItems: ReadonlyArray<InventoryItem>;
  readonly songs: ReadonlyArray<Song>;
  /** Whether the player has the Goron Lullaby's intro, the first half of the full song. */
  readonly lullabyIntro: boolean;
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

  readonly dungeons: Readonly<Record<Temple, DungeonItems>>;
};
