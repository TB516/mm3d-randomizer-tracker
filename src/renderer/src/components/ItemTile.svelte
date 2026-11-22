<script lang="ts">
  import type { Tile } from '../lib/inventory-tiles';

  let { tile }: { tile: Tile } = $props();
</script>

<span
  class="tile"
  class:missing={!tile.has}
  title={tile.has || tile.badge ? tile.name : `${tile.name} (not yet)`}
>
  <img src={tile.icon} alt={tile.name} style:filter={tile.tint} />
  {#if tile.badge}<span class="badge">{tile.badge}</span>{/if}
</span>

<style>
  /* Slots like the pause menu's: owned items lit on a raised slot, missing ones as faint shapes
     in a sunken one. */
  .tile {
    position: relative;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: radial-gradient(circle at 50% 40%, #3a3670, var(--surface-raised) 70%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  img {
    width: 82%;
    height: 82%;
    object-fit: contain;
  }

  .missing {
    background: var(--well);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  /* A tile's tint replaces this filter, so each temple's fairy keeps its color when missing. */
  .missing img {
    filter: grayscale(1) brightness(0.9);
    opacity: 0.32;
  }

  .badge {
    position: absolute;
    right: 2px;
    bottom: 1px;
    padding: 0 3px;
    border-radius: 4px;
    background: rgba(21, 20, 44, 0.9);
    font-size: 10px;
    font-weight: 700;
    line-height: 1.4;
  }
</style>
