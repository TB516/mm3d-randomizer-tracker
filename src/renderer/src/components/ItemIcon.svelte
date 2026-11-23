<script lang="ts">
  import { itemIcon } from '../lib/item-icons';

  let { key, name }: { key: string | null; name: string } = $props();

  const icon = $derived(key === null ? undefined : itemIcon(key));
</script>

<!-- An item's icon, named on hover, or its name for items without one. -->
{#if icon}
  <img src={icon.url} alt={name} title={name} style:filter={icon.filter} />
{:else}
  <span title={name}>{name}</span>
{/if}

<style>
  img {
    width: 22px;
    height: 22px;
    object-fit: contain;
  }

  span {
    color: var(--ink);
    font-size: 12px;
  }
</style>
