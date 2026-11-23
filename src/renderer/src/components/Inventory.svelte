<script lang="ts">
  import type { Inventory } from '../../../shared/inventory';
  import type { TradeItem } from '../../../shared/items';
  import { inventoryTiles } from '../lib/inventory-tiles';
  import ItemTile from './ItemTile.svelte';

  let {
    inventory,
    tradeItemsFound
  }: {
    inventory: Inventory | null;
    /** Trade items found, held or not, so ones traded away show as such. */
    tradeItemsFound: ReadonlyArray<TradeItem>;
  } = $props();

  const tiles = $derived(inventoryTiles(inventory, tradeItemsFound));
</script>

<section class="inventory" aria-label="Inventory">
  <div>
    <h2>Items</h2>
    <div class="grid items">
      {#each tiles.items as tile (tile.name)}<ItemTile {tile} />{/each}
    </div>
  </div>

  <div>
    <h2>Masks</h2>
    <div class="grid masks">
      {#each tiles.masks as tile (tile.name)}<ItemTile {tile} />{/each}
    </div>
  </div>

  <div>
    <h2>Songs, ocarina and remains</h2>
    <!-- The ten songs fill two rows, and the ocarina leads the boss remains on the third. -->
    <div class="grid songs">
      {#each tiles.songs as tile (tile.name)}<ItemTile {tile} />{/each}
      <ItemTile tile={tiles.ocarina} />
      {#each tiles.remains as tile (tile.name)}<ItemTile {tile} />{/each}
    </div>
  </div>

  <div>
    <h2>Trade</h2>
    <div class="grid trade">
      {#each tiles.trade as tile (tile.name)}<ItemTile {tile} />{/each}
    </div>
  </div>
</section>

<style>
  /* One band under the map, three rows tall. Each section's width matches its column count, so
     every tile is the same size. */
  .inventory {
    display: grid;
    grid-template-columns: 6fr 8fr 5fr 3fr;
    gap: 22px;
    align-items: start;
  }

  h2 {
    font-size: 12px;
    font-weight: 600;
    color: var(--dim);
    margin-bottom: 6px;
  }

  .grid {
    display: grid;
    gap: 5px;
  }

  .items {
    grid-template-columns: repeat(6, 1fr);
  }

  .masks {
    grid-template-columns: repeat(8, 1fr);
  }

  .songs {
    grid-template-columns: repeat(5, 1fr);
  }

  .trade {
    grid-template-columns: repeat(3, 1fr);
  }
</style>
