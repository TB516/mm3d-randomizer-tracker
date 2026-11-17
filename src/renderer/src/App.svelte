<script lang="ts">
  import './reset.css';
  import type { TrackerState } from '../../shared/tracker-state';

  // Temporary debug page: shows the raw tracker state until the real UI is designed.
  let state = $state<TrackerState>();

  $effect(() => window.api.watchTracker((next) => (state = next)));

  const gameText = {
    waitingForAzahar: 'Waiting for Azahar (is the RPC server on?)',
    waitingForGame: 'Waiting for Majora’s Mask to start',
    waitingForFile: 'Waiting for a save file to load',
    tracking: 'Tracking',
    failed: 'Tracking stopped'
  } satisfies Record<TrackerState['game']['status'], string>;
</script>

<main>
  <h1>MM3D Tracker (debug)</h1>

  {#if !state}
    <p>Connecting…</p>
  {:else}
    {@const { seed, game, inventory, checks } = state}
    {@const collected = checks.filter((check) => check.collected).length}

    <h2>Seed</h2>
    {#if seed.status === 'none'}
      <p>No seed chosen.</p>
    {:else if seed.status === 'loading'}
      <p>Loading {seed.path}…</p>
    {:else if seed.status === 'error'}
      <p><strong>Seed problem:</strong> {seed.message}</p>
      <p>{seed.path}</p>
    {:else}
      <p>{seed.path}</p>
    {/if}
    <button onclick={() => window.api.chooseSeed()}>Choose seed</button>

    <h2>Game</h2>
    <p><strong>{gameText[game.status]}</strong></p>
    {#if game.status === 'failed'}
      <p>{game.message}</p>
    {/if}
    <button onclick={() => window.api.restartTracking()}>Restart tracking</button>

    {#if inventory}
      <h2>Inventory</h2>
      <dl>
        <dt>Items</dt>
        <dd>{inventory.items.join(', ') || 'none'}</dd>
        <dt>Masks</dt>
        <dd>{inventory.masks.join(', ') || 'none'}</dd>
        <dt>Songs</dt>
        <dd>{inventory.songs.join(', ') || 'none'}</dd>
        <dt>Remains</dt>
        <dd>{inventory.bossRemains.join(', ') || 'none'}</dd>
        <dt>Sword / shield</dt>
        <dd>{inventory.sword ?? 'none'} / {inventory.shield ?? 'none'}</dd>
        <dt>Upgrades</dt>
        <dd>
          quiver {inventory.quiver}, bomb bag {inventory.bombBag}, wallet {inventory.wallet}, magic
          {inventory.magic}, double defense {inventory.doubleDefense}, notebook
          {inventory.bombersNotebook}
        </dd>
        <dt>Hearts</dt>
        <dd>{inventory.maxHearts} + {inventory.heartPieces}/4</dd>
        <dt>Tokens</dt>
        <dd>swamp {inventory.swampTokens}, ocean {inventory.oceanTokens}</dd>
      </dl>
    {/if}

    {#if checks.length > 0}
      <h2>Checks ({collected}/{checks.length})</h2>
      <ul>
        {#each checks as check}
          <li class:collected={check.collected}>{check.name}</li>
        {/each}
      </ul>
    {/if}
  {/if}
</main>

<style>
  main {
    padding: 1rem;
    font-family: system-ui, sans-serif;
  }

  dt {
    font-weight: bold;
  }

  dd {
    margin: 0 0 0.5rem;
  }

  ul {
    columns: 3;
  }

  li {
    opacity: 0.5;
  }

  li.collected {
    opacity: 1;
  }
</style>
