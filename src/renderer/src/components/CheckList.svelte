<script lang="ts">
  import type { CheckState } from '../../../shared/tracker-state';
  import { statusOf } from '../lib/checks';

  let { checks }: { checks: ReadonlyArray<CheckState> } = $props();

  // What's left comes first, so it's never buried under what's done.
  const sorted = $derived(
    checks
      .map((check) => ({ check, status: statusOf(check) }))
      .toSorted((a, b) => Number(a.status === 'done') - Number(b.status === 'done'))
  );
</script>

<ul>
  {#each sorted as { check, status }, index (index)}
    <li class={status}>
      {#if status === 'done'}
        <svg viewBox="0 0 16 16" aria-label="Done"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
      {:else}
        <i aria-hidden="true"></i>
      {/if}
      {check.name}
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
    gap: 9px;
    padding: 3px 0;
    break-inside: avoid;
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

  /* A gap between the last check left and the first one done. */
  li:not(.done) + .done {
    margin-top: 8px;
  }
</style>
