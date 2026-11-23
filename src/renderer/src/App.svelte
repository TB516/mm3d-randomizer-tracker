<script lang="ts">
  import type { TrackerState } from '../../shared/tracker-state';
  import type { ZoneId } from '../../shared/zones';
  import Inventory from './components/Inventory.svelte';
  import MapView from './components/MapView.svelte';
  import RoutePanel from './components/RoutePanel.svelte';
  import StatusBanner from './components/StatusBanner.svelte';
  import TopBar from './components/TopBar.svelte';
  import ZoneChecks from './components/ZoneChecks.svelte';
  import { groupByZone } from './lib/checks';
  import { Route, setRoute } from './lib/route.svelte';

  let tracker = $state<TrackerState>();
  /** The zone whose checks show beside the map. With none, the route shows instead. */
  let selected = $state<ZoneId | null>(null);

  $effect(() =>
    window.api.watchTracker((next) => {
      tracker = next;
    })
  );

  const route = setRoute(new Route(() => tracker?.checks ?? []));
  const seedPath = $derived(tracker?.seed.status === 'loaded' ? tracker.seed.path : null);
  $effect(() => route.open(seedPath));

  const groups = $derived(groupByZone(tracker?.checks ?? []));
  const selectedGroup = $derived(groups.find((group) => group.zone.id === selected));
  const neighbors = $derived(
    groups.filter(
      (group) => group.zone.region === selectedGroup?.zone.region && group.zone.id !== selected
    )
  );
</script>

<div class="app">
  <TopBar state={tracker} />

  <div class="body">
    <main>
      <!-- The status floats over the map instead of pushing it down. -->
      <MapView {groups} inventory={tracker?.inventory ?? null} bind:selected>
        {#snippet notice()}
          {#if tracker}<StatusBanner state={tracker} />{/if}
        {/snippet}
      </MapView>
      <div class="panel">
        <Inventory
          inventory={tracker?.inventory ?? null}
          tradeItemsFound={tracker?.tradeItemsFound ?? []}
        />
      </div>
    </main>

    <aside class="panel">
      {#if selectedGroup}
        <ZoneChecks
          group={selectedGroup}
          {neighbors}
          inventory={tracker?.inventory ?? null}
          onselect={(zone) => (selected = zone)}
          onclose={() => (selected = null)}
        />
      {:else if groups.length > 0}
        <RoutePanel onselect={(zone) => (selected = zone)} />
      {:else}
        <p class="empty">Each area's checks show here once a seed is loaded.</p>
      {/if}
    </aside>
  </div>
</div>

<style>
  .app {
    /* How wide the map's column is for the window's height: the map's shape, plus the inventory
       under it, which grows with the column. */
    --map-width: 113vh;
    height: 100vh;
    display: grid;
    grid-template-rows: 56px 1fr;
  }

  /* The map and the inventory under it, then the selected zone's checks at full height. The map's
     column is about as wide as the map is at the window's height, and the checks column takes the
     rest, so the map keeps its shape with no empty bands beside it. */
  .body {
    display: grid;
    grid-template-columns: 1fr clamp(300px, 100vw - 48px - var(--map-width), 50vw);
    gap: 16px;
    padding: 0 16px 16px;
    min-height: 0;
  }

  main {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
  }

  .panel {
    border-radius: 14px;
    background: var(--surface);
    padding: 14px 18px 16px;
  }

  .empty {
    align-self: center;
    padding: 24px;
    color: var(--dim);
    text-align: center;
  }

  aside.panel {
    display: grid;
    min-height: 0;
    padding: 0;
    container: checks / inline-size;
  }
</style>
