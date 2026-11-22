<script lang="ts">
  import type { CheckState, ChecksNeeds } from '../../../shared/tracker-state';
  import { statusOf } from '../lib/checks';
  import { neededItemIcon } from '../lib/needed-items';

  let { checks }: { checks: ReadonlyArray<CheckState> } = $props();

  // What's left comes first, so it's never buried under what's done.
  const sorted = $derived(
    checks
      .map((check) => ({ check, status: statusOf(check) }))
      .toSorted((a, b) => Number(a.status === 'done') - Number(b.status === 'done'))
  );

  /** What the blocked checks need, by ID. Kept until new answers arrive, so rows don't flicker. */
  let needs = $state<ChecksNeeds>({});

  const blockedIds = $derived(
    checks.filter((check) => statusOf(check) === 'blocked').map((check) => check.id)
  );

  // Asks again whenever the state changes, since a new item can change what a check needs.
  $effect(() => {
    const ids = blockedIds;
    if (ids.length === 0) return;

    let current = true;
    void window.api.findChecksNeeds(ids).then((result) => {
      if (current) needs = result;
    });

    return () => {
      current = false;
    };
  });
</script>

<ul>
  {#each sorted as { check, status }, index (index)}
    {@const shown = status === 'blocked' ? needs[check.id] : undefined}
    <li class={status}>
      {#if status === 'done'}
        <svg viewBox="0 0 16 16" aria-label="Done"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
      {:else}
        <i aria-hidden="true"></i>
      {/if}

      {check.name}

      {#if shown}
        <span class="needs">
          <span class="dash" aria-hidden="true">—</span>
          {#if shown.kind === 'unreachable'}
            <span class="word">not in logic with any item</span>
          {:else}
            {#each shown.items as item, at (item.key)}
              {#if at > 0}<span class="word">{shown.kind === 'anyOf' ? 'or' : 'and'}</span>{/if}
              {@const icon = neededItemIcon(item.key)}
              <span class="item" title={item.name}>
                {#if icon}<img src={icon} alt={item.name} />{:else}{item.name}{/if}
                {#if item.count > 1}<span class="count">×{item.count}</span>{/if}
              </span>
            {/each}
          {/if}
        </span>
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
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 9px;
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

  /* What the check needs, on its row after an em dash: items joined by "or" or "and". */
  .needs {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px 5px;
    color: var(--dim);
    font-size: 12px;
  }

  .dash {
    margin-right: 2px;
    font-size: 14px;
  }

  .word {
    padding: 0 1px;
  }

  .item {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    color: var(--ink);
  }

  .item img {
    width: 22px;
    height: 22px;
    object-fit: contain;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.6));
  }

  .count {
    color: var(--dim);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  /* A gap between the last check left and the first one done. */
  li:not(.done) + .done {
    margin-top: 8px;
  }
</style>
