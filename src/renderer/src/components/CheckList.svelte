<script lang="ts">
  import type { CheckState } from '../../../shared/tracker-state';
  import { watchNeeds } from '../lib/check-needs.svelte';
  import { statusOf } from '../lib/checks';
  import { getRoute } from '../lib/route.svelte';
  import BookmarkIcon from './BookmarkIcon.svelte';
  import ItemIcon from './ItemIcon.svelte';
  import NeededItems from './NeededItems.svelte';

  let {
    checks,
    lit = null
  }: {
    checks: ReadonlyArray<CheckState>;
    /** A check to light up and scroll to, after clicking an inventory tile found there. */
    lit?: number | null;
  } = $props();

  /**
   * Scrolls a lit-up row into view.
   *
   * @param row - The row.
   */
  const reveal = (row: HTMLElement) => row.scrollIntoView({ block: 'nearest' });

  const route = getRoute();

  // What's left comes first, so it's never buried under what's done.
  const sorted = $derived(
    checks
      .map((check) => ({ check, status: statusOf(check) }))
      .toSorted((a, b) => Number(a.status === 'done') - Number(b.status === 'done'))
  );

  const needs = watchNeeds(() =>
    checks.filter((check) => statusOf(check) === 'blocked').map((check) => check.id)
  );
</script>

<ul>
  {#each sorted as { check, status }, index (index)}
    {@const shown = status === 'blocked' ? needs.current[check.id] : undefined}
    {@const number = route.numberOf(check.id)}
    <!-- A check left can be clicked anywhere on its row to bookmark it. The bookmark button is
         the keyboard's way, and its clicks reach the row too. -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <li
      class={status}
      class:lit={check.id === lit}
      onclick={status === 'done' ? undefined : () => route.toggle(check.id)}
      {@attach check.id === lit ? reveal : undefined}
    >
      {#if status === 'done'}
        <svg viewBox="0 0 16 16" aria-label="Done"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
      {:else}
        <i aria-hidden="true"></i>
      {/if}

      <span class="name">
        {check.name}
        {#if shown}<NeededItems needs={shown} />{/if}
      </span>

      <!-- A done check shows what it gave. Bookmarked checks show their place in the route, and the
           rest show the bookmark on hover. -->
      {#if status === 'done'}
        {#if check.item}<span class="got"><ItemIcon {...check.item} /></span>{/if}
      {:else}
        <button
          class="mark"
          class:on={number}
          title={number ? 'Remove from route' : 'Add to route'}
          aria-label={number ? `Stop ${number} on the route. Remove it` : 'Add to route'}
        >
          <BookmarkIcon filled={Boolean(number)} />{number}
        </button>
      {/if}
    </li>
  {/each}
</ul>

<style>
  ul {
    list-style: none;
    padding: 0;
  }

  li {
    display: flex;
    align-items: baseline;
    column-gap: 9px;
    margin: 0 -6px;
    padding: 3px 6px;
    border-radius: 6px;
    break-inside: avoid;
  }

  li:not(.done) {
    cursor: pointer;
  }

  li:not(.done):hover {
    background: var(--row-hover);
  }

  i,
  svg {
    flex: none;
    width: 10px;
    height: 10px;
    transform: translateY(1px);
  }

  i {
    border-radius: 50%;
    background: var(--available);
  }

  .blocked i {
    background: var(--blocked);
  }

  /* Hollow, so it doesn't read as done or as either logic state. */
  .unknown i {
    background: none;
    box-shadow: inset 0 0 0 2px var(--unknown);
  }

  .done {
    color: var(--done);
  }

  svg {
    fill: none;
    stroke: var(--done);
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .name {
    flex: 1;
    min-width: 0;
  }

  .name > :global(.needs) {
    margin-left: 6px;
  }

  .mark {
    flex: none;
    align-self: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    min-width: 26px;
    height: 20px;
    padding: 0 4px;
    border: 0;
    border-radius: 99px;
    background: none;
    color: var(--dim);
    opacity: 0;
  }

  li:hover .mark,
  .mark:focus-visible {
    opacity: 1;
  }

  /* The whole row is the button, so hovering it lights the bookmark as if hovering that. */
  li:hover .mark {
    background: var(--surface-raised);
    color: var(--ink);
  }

  /* A moon badge with the check's place in the route. */
  .mark.on {
    padding: 0 7px 0 5px;
    background: rgba(244, 195, 90, 0.14);
    color: var(--moon);
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    opacity: 1;
  }

  li:hover .mark.on {
    background: rgba(244, 195, 90, 0.24);
    color: var(--moon);
  }

  .mark.on :global(svg) {
    width: 11px;
    height: 11px;
  }

  /* The check an inventory tile was found at, as the route lights up its next stop. */
  .lit {
    background: linear-gradient(90deg, rgba(244, 195, 90, 0.13), rgba(244, 195, 90, 0.02));
    box-shadow: inset 2px 0 0 var(--moon);
    color: var(--ink);
  }

  .lit svg {
    stroke: var(--moon);
  }

  .got {
    flex: none;
    align-self: center;
    display: flex;
  }

  /* A gap between the last check left and the first one done. */
  li:not(.done) + .done {
    margin-top: 8px;
  }
</style>
