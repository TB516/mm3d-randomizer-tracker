<script lang="ts">
  import type { Inventory } from '../../../shared/inventory';
  import termina from '../assets/termina.png';
  import { summarize, type ZoneGroup } from '../lib/checks';
  import { dungeonTiles } from '../lib/inventory-tiles';
  import { mapImage, mapPins } from '../lib/map-pins';
  import CheckList from './CheckList.svelte';
  import ItemTile from './ItemTile.svelte';
  import ProgressRing from './ProgressRing.svelte';

  let {
    group,
    neighbors,
    inventory,
    onselect,
    onclose
  }: {
    group: ZoneGroup;
    /** The other zones in the same region, listed below for quick switching. */
    neighbors: ReadonlyArray<ZoneGroup>;
    /** For a temple's keys, fairies, and dungeon items. Null until tracking. */
    inventory: Inventory | null;
    onselect: (zone: ZoneGroup['zone']['id']) => void;
    /** Goes back to the route. */
    onclose: () => void;
  } = $props();

  /** How much bigger the header's view of the map is than the map image itself. */
  const zoom = 1.5;

  /** Where the paper ends inside the map image, past its torn edges. */
  const paper = { left: 40, top: 40, right: 1295, bottom: 900 };

  const summary = $derived(summarize(group.checks));
  const dungeon = $derived('temple' in group.zone && dungeonTiles(inventory, group.zone.temple));
  const pin = $derived(mapPins[group.zone.id]);

  // Where the zoomed map's corner goes: centered on the pin, but kept inside the paper so its torn
  // edges never show.
  const view = $derived(
    pin && {
      x: `clamp(100% - ${paper.right * zoom}px, 50% - ${pin[0] * zoom}px, ${-paper.left * zoom}px)`,
      y: `clamp(100% - ${paper.bottom * zoom}px, 45% - ${pin[1] * zoom}px, ${-paper.top * zoom}px)`
    }
  );
</script>

<section class="zone" aria-label={group.zone.name}>
  <header>
    <button class="back" onclick={onclose}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8 10 12.5" /></svg>
      Route
    </button>

    <!-- A close-up of the zone's spot on the map, centered on its pin. -->
    {#if pin}
      <div class="view" aria-hidden="true" style:--x={view?.x} style:--y={view?.y}>
        <img
          src={termina}
          alt=""
          style:width="{mapImage.width * zoom}px"
          style:left="var(--x)"
          style:top="var(--y)"
        />
        <span
          class="marker"
          style:left="calc(var(--x) + {pin[0] * zoom}px)"
          style:top="calc(var(--y) + {pin[1] * zoom}px)"
        >
          <ProgressRing
            left={summary.left}
            total={summary.total}
            status={summary.status}
            size={34}
          />
          <b>
            {#if summary.left}{summary.left}{:else}
              <svg viewBox="-8 -8 16 16"><path d="M-5 0 L-1.5 3.5 L5 -3.5" /></svg>
            {/if}
          </b>
        </span>
      </div>
    {/if}

    <div class="title" class:plain={!pin}>
      {#if group.zone.region !== group.zone.name}
        <p class="region">{group.zone.region}</p>
      {/if}
      <h2>{group.zone.name}</h2>
      <p class="progress">
        {#if summary.left}
          <span><b>{summary.left}</b> of {summary.total} left</span>
        {:else}
          <span><b>All done</b></span>
        {/if}
        <span class="bar" aria-hidden="true">
          <span style:width="{((summary.total - summary.left) / summary.total) * 100}%"></span>
        </span>
      </p>

      {#if dungeon}
        <div class="dungeon" aria-label="Dungeon items">
          {#each dungeon.items as tile (tile.name)}
            <ItemTile {tile} />
          {/each}
          <span class="divider" aria-hidden="true"></span>
          <ItemTile tile={dungeon.fairies} />
        </div>
      {/if}
    </div>
  </header>

  <div class="checks" class:long={group.checks.length > 16}>
    <CheckList checks={group.checks} />
  </div>

  {#if neighbors.length > 0}
    <nav aria-label="Also in {group.zone.region}">
      <h3>Also in {group.zone.region}</h3>
      {#each neighbors as neighbor (neighbor.zone.id)}
        {@const neighborSummary = summarize(neighbor.checks)}
        <button onclick={() => onselect(neighbor.zone.id)}>
          <ProgressRing
            left={neighborSummary.left}
            total={neighborSummary.total}
            status={neighborSummary.status}
          />
          {neighbor.zone.name}
          <span>{neighborSummary.left || ''}</span>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" /></svg>
        </button>
      {/each}
    </nav>
  {/if}
</section>

<style>
  /* The other zones sit at the bottom of the panel, under however many checks there are. */
  .zone {
    display: flex;
    flex-direction: column;
    overflow: auto;
    min-height: 0;
  }

  /* The close-up runs to the panel's edges and fades into it under the zone's name. */
  .view {
    position: relative;
    height: clamp(120px, 19vh, 170px);
    overflow: hidden;
    border-radius: 14px 14px 0 0;
  }

  .view img {
    position: absolute;
    max-width: none;
  }

  .view::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(transparent 25%, var(--surface) 88%);
  }

  /* A copy of the zone's map pin, so the close-up reads as "you're looking here". */
  .marker {
    --ring-hole: rgba(21, 20, 44, 0.94);
    position: absolute;
    z-index: 1;
    display: grid;
    border-radius: 50%;
    box-shadow:
      0 0 0 2px var(--night),
      0 0 0 4px var(--moon),
      0 3px 12px rgba(0, 0, 0, 0.5);
    transform: translate(-50%, -50%);
  }

  .marker > :global(*) {
    grid-area: 1 / 1;
  }

  .marker b {
    display: grid;
    place-items: center;
    font-size: 14px;
  }

  .marker svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: var(--done);
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  header {
    position: relative;
  }

  /* Over the close-up's corner, back to the route. */
  .back {
    position: absolute;
    z-index: 2;
    top: 12px;
    left: 12px;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 4px 10px 4px 6px;
    border: 0;
    border-radius: 99px;
    background: rgba(21, 20, 44, 0.85);
    color: var(--ink);
    font-size: 12px;
    font-weight: 600;
  }

  .back:hover {
    background: var(--surface-raised);
  }

  .back:hover svg {
    stroke: var(--moon);
  }

  .back svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: var(--dim);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .title {
    position: relative;
    margin-top: -34px;
    padding: 0 20px;
  }

  /* Zones without a close-up leave room for the back button above their name. */
  .title.plain {
    margin-top: 0;
    padding-top: 50px;
  }

  .region {
    color: var(--dim);
    font-size: 12px;
  }

  h2 {
    font-size: 24px;
    line-height: 1.2;
  }

  .progress {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
    color: var(--dim);
    font-size: 13px;
  }

  .progress b {
    color: var(--ink);
  }

  .bar {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--well);
    overflow: hidden;
  }

  .bar span {
    display: block;
    height: 100%;
    background: var(--moon);
  }

  /* The temple's items in slots like the inventory's, with the fairies set apart. */
  .dungeon {
    display: grid;
    grid-template-columns: repeat(4, 40px) auto 40px;
    justify-content: start;
    gap: 6px;
    margin-top: 12px;
  }

  .divider {
    width: 1px;
    margin: 4px 4px;
    background: var(--line);
  }

  .checks {
    padding: 12px 20px 22px;
  }

  nav {
    margin: auto 20px 18px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }

  h3 {
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--dim);
  }

  /* Each row is a button to that zone, so it looks like one even without hovering. */
  nav button {
    --ring-hole: var(--well);
    display: flex;
    width: 100%;
    align-items: center;
    gap: 10px;
    padding: 7px 8px 7px 10px;
    margin-bottom: 4px;
    border: 0;
    border-radius: 8px;
    background: var(--well);
    text-align: left;
  }

  nav button:hover {
    --ring-hole: var(--surface-raised);
    background: var(--surface-raised);
  }

  nav span {
    margin-left: auto;
    color: var(--dim);
    font-variant-numeric: tabular-nums;
  }

  nav svg {
    flex: none;
    width: 14px;
    height: 14px;
    fill: none;
    stroke: var(--dim);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  nav button:hover svg {
    stroke: var(--moon);
  }

  .zone :global(li) {
    padding-block: 1px;
  }

  /* The Spider Houses split into two columns once the panel is wide enough that their names don't
     wrap. */
  @container checks (min-width: 480px) {
    .long {
      columns: 2;
      column-gap: 20px;
    }
  }
</style>
