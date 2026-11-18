<script lang="ts">
  import type { Snippet } from 'svelte';

  import type { Inventory } from '../../../shared/inventory';
  import type { ZoneId } from '../../../shared/zones';
  import termina from '../assets/termina.png';
  import { summarize, type ZoneGroup } from '../lib/checks';
  import { mapCrop, mapImage, mapPins } from '../lib/map-pins';
  import Counters from './Counters.svelte';
  import ProgressRing from './ProgressRing.svelte';

  let {
    groups,
    inventory,
    selected = $bindable(),
    notice
  }: {
    groups: ReadonlyArray<ZoneGroup>;
    inventory: Inventory | null;
    selected: ZoneId;
    /** A message to float over the top of the map, such as why tracking is waiting. */
    notice?: Snippet;
  } = $props();

  /**
   * Turns a position in the map image into CSS offsets from the middle of the stage, in units of
   * `--scale` (one image pixel), so pins stay on their spot at any window size.
   *
   * @param x - Pixels from the image's left edge.
   * @param y - Pixels from the image's top edge.
   * @returns CSS `left` and `top` values.
   */
  const place = (x: number, y: number) => ({
    left: `calc(50cqw + ${x - mapCenter.x} * var(--scale))`,
    top: `calc(50cqh + ${y - mapCenter.y} * var(--scale))`
  });

  // Only zones with a place on the map get a pin.
  const pins = $derived(
    groups.flatMap((group) => {
      const position = mapPins[group.zone.id];
      return position ? [{ group, at: place(...position), summary: summarize(group.checks) }] : [];
    })
  );

  const total = $derived(groups.reduce((sum, group) => sum + group.checks.length, 0));
  const collected = $derived(
    groups.reduce((sum, group) => sum + group.checks.filter((check) => check.collected).length, 0)
  );

  // The middle of the land, which stays in the middle of the stage.
  const mapCenter = { x: mapCrop.x + mapCrop.width / 2, y: mapCrop.y + mapCrop.height / 2 };
  const art = place(0, 0);
</script>

<div class="stage">
  <!-- One pixel of the map image is sized so the land (the crop) just fits. -->
  <div class="frame" style:--scale="min(100cqw / {mapCrop.width}, 100cqh / {mapCrop.height})">
    <img
      class="art"
      src={termina}
      alt=""
      style:width="calc({mapImage.width} * var(--scale))"
      style:left={art.left}
      style:top={art.top}
    />

    {#each pins as { group, at, summary } (group.zone.id)}
      <button
        class="pin {summary.status}"
        class:selected={group.zone.id === selected}
        style:left={at.left}
        style:top={at.top}
        style:--left="{(summary.left / summary.total) * 100}%"
        aria-label="{group.zone.name}, {summary.left} left"
        aria-pressed={group.zone.id === selected}
        onclick={() => (selected = group.zone.id)}
      >
        {#if summary.left > 0}
          {summary.left}
        {:else}
          <svg viewBox="-8 -8 16 16" aria-hidden="true"><path d="M-5 0 L-1.5 3.5 L5 -3.5" /></svg>
        {/if}
        <span class="label" aria-hidden="true">{group.zone.name}</span>
      </button>
    {/each}

    <!-- Status in the top-left corner, the legend in the bottom-right one. -->
    {#if total > 0}
      <div class="card tally">
        <p><b>{collected}</b> of {total} checks</p>
        <Counters {inventory} />
      </div>

      <ul class="card legend" aria-label="Legend">
        <li><ProgressRing left={2} total={3} status="available" />Checks left</li>
        <li><ProgressRing left={0} total={1} status="done" />All done</li>
      </ul>
    {/if}

    {#if notice}<div class="notice">{@render notice()}</div>{/if}
  </div>
</div>

<style>
  /* The map fills the stage: the land always fits, and on wider stages more of the paper shows
     at the sides, fading into the night where the paper ends. */
  .stage {
    flex: 1;
    min-height: 0;
    position: relative;
    container-type: size;
  }

  .frame {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 14px;
  }

  /* Fades the panel's left and right edges into the night, the same at every window size. It sits
     under the pins and cards, so they stay sharp. */
  .frame::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to right,
      var(--night),
      transparent 7%,
      transparent 93%,
      var(--night)
    );
    pointer-events: none;
  }

  .art {
    position: absolute;
    max-width: none;
    pointer-events: none;
    user-select: none;
    /* Hides the paper's torn black edges by fading the outer strip of the image. */
    mask-image:
      linear-gradient(to right, transparent 2.5%, #000 8%, #000 92%, transparent 97.5%),
      linear-gradient(to bottom, transparent 3%, #000 9.5%, #000 89%, transparent 95.5%);
    mask-composite: intersect;
  }

  /* Each pin's ring shows how much of the zone is left: the lit arc is what's still to do. */
  .pin {
    --state: var(--available);
    position: absolute;
    z-index: 1;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background:
      radial-gradient(
        closest-side,
        rgba(21, 20, 44, 0.94) calc(100% - 4px),
        transparent calc(100% - 3.5px)
      ),
      conic-gradient(var(--state) var(--left), var(--ring-track) 0);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
    color: var(--ink);
    font: 700 13px var(--font-body);
    transform: translate(-50%, -50%);
    transition: transform 0.12s;
  }

  .pin.done {
    --state: var(--done);
    background:
      radial-gradient(
        closest-side,
        rgba(21, 20, 44, 0.94) calc(100% - 4px),
        transparent calc(100% - 3.5px)
      ),
      var(--ring-track);
  }

  .pin.blocked {
    --state: var(--blocked);
  }

  .pin svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: var(--state);
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .pin:hover {
    transform: translate(-50%, -50%) scale(1.12);
  }

  .pin.selected {
    z-index: 2;
    box-shadow:
      0 0 0 2px var(--night),
      0 0 0 4px var(--moon),
      0 2px 10px rgba(0, 0, 0, 0.5);
  }

  .pin:hover,
  .pin:focus-visible {
    z-index: 3;
  }

  /* Names show on hover. The selected zone's name is already at the top of the sidebar. */
  .label {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 9px;
    border-radius: 7px;
    background: rgba(21, 20, 44, 0.95);
    font-size: 14px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
  }

  .pin:hover .label,
  .pin:focus-visible .label {
    opacity: 1;
  }

  .card {
    position: absolute;
    z-index: 2;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(21, 20, 44, 0.9);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  }

  .tally {
    top: 14px;
    left: 14px;
    display: grid;
    gap: 6px;
  }

  .tally p {
    font-size: 13px;
    color: var(--dim);
  }

  .tally b {
    font-size: 24px;
    color: var(--moon);
  }

  .legend {
    right: 14px;
    bottom: 14px;
    display: flex;
    gap: 14px;
    list-style: none;
    font-size: 12px;
    color: var(--dim);
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  /* Centered at the bottom, over the land's southern edge where no pins sit. */
  .notice {
    position: absolute;
    z-index: 4;
    bottom: 14px;
    left: 50%;
    max-width: 55%;
    transform: translateX(-50%);
  }
</style>
