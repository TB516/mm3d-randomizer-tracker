<script lang="ts">
  import type { Inventory } from '../../../shared/inventory';
  import type { InventoryItem } from '../../../shared/items';
  import { bottleContentsTiles, inventoryTiles } from '../lib/inventory-tiles';
  import ItemTile from './ItemTile.svelte';

  let {
    inventory,
    bottleContents
  }: {
    inventory: Inventory | null;
    /** What bottles held when checks gave them, in the order found. */
    bottleContents: ReadonlyArray<InventoryItem>;
  } = $props();

  const tiles = $derived(inventoryTiles(inventory));
  const contents = $derived(bottleContentsTiles(bottleContents));

  /** Rows in every section, so the band keeps its height. */
  const rows = 3;

  // Three columns of slots, and another column for each three past nine, so a seed with more
  // contents widens the section instead of making the band taller.
  const contentColumns = $derived(Math.max(3, Math.ceil(contents.length / rows)));
</script>

<section
  class="inventory"
  aria-label="Inventory"
  style:--content-columns={contentColumns}
  style:--content-width="{contentColumns}fr"
>
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

  <div>
    <h2>Bottle contents</h2>
    <!-- Each content found fills the next slot, so a seed's own mix shows without gaps. -->
    <div class="grid contents">
      {#each contents as tile (tile.name)}<ItemTile {tile} />{/each}
      {#each { length: contentColumns * rows - contents.length }, at (at)}
        <span class="slot"></span>
      {/each}
    </div>
  </div>
</section>

<style>
  /* One band under the map, three rows tall. Each section's width matches its column count, so
     every tile is the same size. */
  .inventory {
    display: grid;
    grid-template-columns: 6fr 8fr 5fr 3fr var(--content-width);
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

  .contents {
    grid-template-columns: repeat(var(--content-columns), 1fr);
  }

  /* An empty slot, sunken like a missing item's. */
  .slot {
    aspect-ratio: 1;
    border-radius: 8px;
    background: var(--well);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
  }
</style>
