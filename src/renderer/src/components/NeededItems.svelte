<script lang="ts">
  import type { CheckNeeds } from '../../../shared/tracker-state';
  import { neededItemIcon } from '../lib/needed-items';

  let { needs }: { needs: CheckNeeds } = $props();
</script>

<!-- What a blocked check needs, after an em dash: items joined by "or" or "and". -->
<span class="needs">
  <span class="dash" aria-hidden="true">—</span>
  {#if needs.kind === 'unreachable'}
    <span class="word">not in logic with any item</span>
  {:else}
    {#each needs.items as item, at (item.key)}
      {#if at > 0}<span class="word">{needs.kind === 'anyOf' ? 'or' : 'and'}</span>{/if}
      {@const icon = neededItemIcon(item.key)}
      <span class="item" title={item.name}>
        {#if icon}<img src={icon} alt={item.name} />{:else}{item.name}{/if}
        {#if item.count > 1}<span class="count">×{item.count}</span>{/if}
      </span>
    {/each}
  {/if}
</span>

<style>
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
</style>
