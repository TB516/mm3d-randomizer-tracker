<script lang="ts">
  import type { ZoneId } from '../../../shared/zones';
  import { watchNeeds } from '../lib/check-needs.svelte';
  import { statusOf, zoneById } from '../lib/checks';
  import { getRoute } from '../lib/route.svelte';
  import BookmarkIcon from './BookmarkIcon.svelte';
  import ItemIcon from './ItemIcon.svelte';
  import NeededItems from './NeededItems.svelte';

  let { onselect }: { onselect: (zone: ZoneId) => void } = $props();

  const route = getRoute();

  const stops = $derived(
    route.left.map((check, at) => ({ check, status: statusOf(check), number: at + 1 }))
  );
  const ready = $derived(stops.filter((stop) => stop.status === 'available').length);
  const blocked = $derived(stops.filter((stop) => stop.status === 'blocked').length);

  /** The stops split wherever the route moves to a new zone, each part shown under its zone. */
  const legs = $derived.by(() => {
    const legs: Array<{ zone: ZoneId; stops: typeof stops }> = [];
    for (const stop of stops) {
      const last = legs.at(-1);
      if (last?.zone === stop.check.zone) last.stops.push(stop);
      else legs.push({ zone: stop.check.zone, stops: [stop] });
    }
    return legs;
  });

  const needs = watchNeeds(() =>
    stops.filter((stop) => stop.status === 'blocked').map((stop) => stop.check.id)
  );

  /** The stop being dragged, and where it would land if dropped now. */
  let dragged = $state<number>();
  let dropAt = $state<{ id: number; after: boolean }>();

  const dragOver = (event: DragEvent & { currentTarget: HTMLElement }, id: number) => {
    if (dragged === undefined) return;

    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    dropAt = { id, after: event.clientY > box.top + box.height / 2 };
  };

  const drop = () => {
    if (dragged !== undefined && dropAt) route.move(dragged, dropAt.id, dropAt.after);
    dragged = undefined;
    dropAt = undefined;
  };
</script>

<section aria-label="Route">
  <h2>Route</h2>
  {#if stops.length > 0}
    <p class="summary">
      {#if ready + blocked > 0}
        <span><b>{ready}</b> ready</span> · <span><b>{blocked}</b> blocked</span>
      {:else}
        <span><b>{stops.length}</b> stops</span>
      {/if}
    </p>

    <!-- Each zone's stops on their own short trail, under the zone's name. -->
    {#each legs as leg, legAt (legAt)}
      <div class="leg">
        <h3>
          <button onclick={() => onselect(leg.zone)}>
            {zoneById(leg.zone).name}
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" /></svg>
          </button>
        </h3>
        <ol class="trail">
          {#each leg.stops as { check, status, number } (check.id)}
            {@const shown = status === 'blocked' ? needs.current[check.id] : undefined}
            <li
              class="stop {status}"
              class:next={number === 1}
              class:dragged={dragged === check.id}
              class:drop-before={dropAt?.id === check.id && !dropAt.after}
              class:drop-after={dropAt?.id === check.id && dropAt.after}
              draggable="true"
              ondragstart={(event) => {
                dragged = check.id;
                event.dataTransfer?.setData('text/plain', check.name);
              }}
              ondragover={(event) => dragOver(event, check.id)}
              ondrop={drop}
              ondragend={() => {
                dragged = undefined;
                dropAt = undefined;
              }}
            >
              <span class="node">{number}</span>
              <div class="body">
                {check.name}
                {#if number === 1}<span class="tag">Next</span>{/if}
                {#if shown}<NeededItems needs={shown} />{/if}
              </div>
              <button
                class="remove"
                title="Remove from route"
                aria-label="Remove from route"
                onclick={() => route.remove(check.id)}
              >
                <BookmarkIcon filled />
              </button>
            </li>
          {/each}
        </ol>
      </div>
    {/each}
  {:else}
    <p class="empty">
      <BookmarkIcon />
      Nothing planned yet. Pick a zone on the map and bookmark checks to build a route.
    </p>
  {/if}

  {#if route.completed.length > 0}
    <div class="completed">
      <header>
        <h3>Completed · {route.completed.length}</h3>
        <button onclick={() => route.clearCompleted()}>Clear</button>
      </header>
      <ul>
        {#each route.completed as check (check.id)}
          <li>
            <svg viewBox="0 0 16 16" aria-label="Done"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
            {check.name}
            <span class="zone">{zoneById(check.zone).name}</span>
            {#if check.item}<span class="got"><ItemIcon {...check.item} /></span>{/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>

<style>
  section {
    overflow: auto;
    min-height: 0;
    padding: 18px 20px 22px;
  }

  h2 {
    font-size: 24px;
    line-height: 1.2;
  }

  .summary {
    margin-top: 2px;
    color: var(--dim);
    font-size: 13px;
  }

  .summary b {
    color: var(--ink);
  }

  ol,
  ul {
    list-style: none;
    padding: 0;
  }

  /* Each zone's stops, with a gap between zones doing the grouping. */
  .leg {
    margin-top: 14px;
  }

  /* The zone's name, styled like the panel's other headings, and a button to open the zone. */
  .leg h3 {
    margin-bottom: 4px;
  }

  .leg h3 button {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-left: -6px;
    padding: 1px 4px 1px 6px;
    border: 0;
    border-radius: 6px;
    background: none;
    color: inherit;
    font: inherit;
  }

  .leg h3 button:hover {
    background: var(--surface-raised);
    color: var(--ink);
  }

  .leg h3 svg {
    width: 12px;
    height: 12px;
    fill: none;
    stroke: var(--dim);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .leg h3 button:hover svg {
    stroke: var(--moon);
  }

  /* The trail's line runs through the middle of the stops' numbers. */
  .trail {
    position: relative;
  }

  .trail::before {
    content: '';
    position: absolute;
    left: 10px;
    top: 14px;
    bottom: 14px;
    width: 2px;
    border-radius: 1px;
    background: var(--line);
  }

  .stop {
    --state: var(--available);
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    /* Room on the left, so a highlight reaches past the number instead of starting at its edge. */
    margin: 0 -6px;
    padding: 5px 6px;
    border-radius: 8px;
    cursor: grab;
  }

  .stop.blocked {
    --state: var(--blocked);
  }

  .stop.unknown {
    --state: var(--unknown);
  }

  .stop:hover {
    background: var(--row-hover);
  }

  .stop.dragged {
    opacity: 0.4;
  }

  /* A moon line where a dragged stop would land. */
  .drop-before {
    box-shadow: 0 -2px 0 var(--moon);
  }

  .drop-after {
    box-shadow: 0 2px 0 var(--moon);
  }

  .node {
    position: relative;
    z-index: 1;
    flex: none;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--surface);
    box-shadow: inset 0 0 0 2px var(--state);
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .body {
    flex: 1;
    min-width: 0;
    padding-top: 2px;
  }

  /* After the name on the same line, as in the zone list. */
  .body > :global(.needs) {
    margin-left: 6px;
  }

  /* The first stop is lit up, so a glance mid-run lands on what to do now. */
  .stop.next {
    background: linear-gradient(90deg, rgba(244, 195, 90, 0.13), rgba(244, 195, 90, 0.02));
  }

  .next .node {
    background: var(--moon);
    color: var(--night);
    box-shadow: 0 0 0 3px rgba(244, 195, 90, 0.25);
  }

  .tag {
    margin-left: 6px;
    padding: 0 6px;
    border-radius: 99px;
    background: var(--moon);
    color: var(--night);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    vertical-align: 1px;
  }

  /* The filled bookmark from the zone list, in a block the row's full height at its right edge,
     so it's easy to hit. Clicking it takes the stop off, like un-bookmarking it there. */
  .remove {
    align-self: stretch;
    display: grid;
    place-items: center;
    width: 44px;
    margin: -5px -6px -5px 0;
    border: 0;
    border-radius: 0 8px 8px 0;
    background: rgba(244, 195, 90, 0.14);
    color: var(--moon);
    opacity: 0;
  }

  .stop:hover .remove,
  .remove:focus-visible {
    opacity: 1;
  }

  .remove:hover {
    background: rgba(244, 195, 90, 0.24);
  }

  .remove :global(svg) {
    width: 13px;
    height: 13px;
  }

  .empty {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
    padding: 14px;
    border: 1px dashed var(--line);
    border-radius: 10px;
    color: var(--dim);
    font-size: 13px;
  }

  .empty :global(svg) {
    color: var(--moon);
  }

  .completed {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--line);
  }

  .completed header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h3 {
    color: var(--dim);
    font-size: 12px;
    font-weight: 600;
  }

  .completed button {
    padding: 2px 8px;
    border: 0;
    border-radius: 6px;
    background: none;
    color: var(--ink);
    font-size: 12px;
  }

  .completed button:hover {
    background: var(--surface-raised);
  }

  .completed li {
    display: flex;
    align-items: baseline;
    gap: 9px;
    padding: 2px 0;
    color: var(--done);
  }

  .completed li svg {
    flex: none;
    width: 10px;
    height: 10px;
    fill: none;
    stroke: var(--done);
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    transform: translateY(1px);
  }

  .completed .zone {
    margin-left: auto;
    font-size: 12px;
  }

  .completed .got {
    flex: none;
    align-self: center;
    display: flex;
  }
</style>
