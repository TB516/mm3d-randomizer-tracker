<script lang="ts">
  import { zoneById } from '../lib/checks';
  import { getFoundItems } from '../lib/found-items';
  import type { Tile } from '../lib/inventory-tiles';

  let { tile }: { tile: Tile } = $props();

  const found = getFoundItems();

  const where = $derived(tile.sourceId ? found.where(tile.sourceId) : undefined);
  const first = $derived(where?.checks[0]);

  /** How many found-at checks the hover names before summing up the rest. */
  const namedChecks = 3;

  const title = $derived.by(() => {
    if (!tile.has && !tile.badge) return `${tile.name} (not yet)`;
    if (!where) return tile.name;

    const places = where.checks.map((check) => `${check.name}, ${zoneById(check.zone).name}`);
    const more = places.length - namedChecks;
    const named = places.slice(0, namedChecks).join('; ') + (more > 0 ? `; and ${more} more` : '');

    // Click to open where it was found. A tile found in several places opens the first.
    if (places.length > 0) return `${tile.name}: found at ${named}. Click to show it`;
    if (where.starting) return `${tile.name}: a starting item`;
    return `${tile.name}: in your inventory`;
  });
</script>

{#snippet contents()}
  <img src={tile.icon} alt={tile.name} style:filter={tile.tint} />
  {#if tile.badge}<span class="badge">{tile.badge}</span>{/if}
{/snippet}

{#if first}
  <button class="tile" class:missing={!tile.has} {title} onclick={() => found.show(first)}>
    {@render contents()}
  </button>
{:else}
  <span class="tile" class:missing={!tile.has} {title}>{@render contents()}</span>
{/if}

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

  button.tile {
    width: 100%;
    padding: 0;
    border: 0;
    color: inherit;
    font: inherit;
  }

  /* A found tile opens where it was found, so hovering it shows it can be clicked. */
  button.tile:hover {
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 0 0 2px rgba(244, 195, 90, 0.55);
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
