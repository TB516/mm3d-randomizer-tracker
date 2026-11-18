<script lang="ts">
  import type { Inventory } from '../../../shared/inventory';
  import { inventoryTiles } from '../lib/inventory-tiles';
  import ItemTile from './ItemTile.svelte';

  let { inventory }: { inventory: Inventory | null } = $props();

  const tiles = $derived(inventoryTiles(inventory));
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
    <h2>Ocarina, songs and remains</h2>
    <div class="grid songs">
      {#each tiles.songs as tile (tile.name)}<ItemTile {tile} />{/each}
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
