<script lang="ts">
  import type { TrackerState } from '../../../shared/tracker-state';

  let { state }: { state: TrackerState } = $props();
</script>

<!-- One line about whatever is stopping tracking, with the fix when there is one. Seed problems
     come first, since tracking a game is no use without a seed. -->
{#if state.seed.status === 'none'}
  <div class="banner">
    <p>Choose your seed's <code>code.ips</code> to start tracking.</p>
    <button onclick={() => window.api.chooseSeed()}>Choose seed</button>
  </div>
{:else if state.seed.status === 'loading'}
  <div class="banner"><p>Loading the seed…</p></div>
{:else if state.seed.status === 'error'}
  <div class="banner problem">
    <p><b>Couldn't load the seed.</b> {state.seed.message}</p>
    <button onclick={() => window.api.chooseSeed()}>Choose seed</button>
  </div>
{:else if state.game.status === 'waitingForAzahar'}
  <div class="banner">
    <p><b>Waiting for Azahar.</b> Start Azahar and turn on its RPC server in the settings.</p>
  </div>
{:else if state.game.status === 'waitingForGame'}
  <div class="banner"><p><b>Waiting for the game.</b> Start Majora's Mask 3D in Azahar.</p></div>
{:else if state.game.status === 'waitingForFile'}
  <div class="banner"><p><b>Waiting for a save.</b> Load a save file in the game.</p></div>
{:else if state.game.status === 'failed'}
  <div class="banner problem">
    <p><b>Tracking stopped:</b> {state.game.message}</p>
    <button onclick={() => window.api.restartTracking()}>Restart tracking</button>
  </div>
{/if}

<style>
  .banner {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-left: 3px solid var(--moon);
    border-radius: 10px;
    background: rgba(21, 20, 44, 0.94);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    font-size: 13px;
    line-height: 1.4;
  }

  .problem {
    border-left-color: var(--blocked);
  }

  button {
    margin-left: auto;
    flex: none;
    padding: 5px 11px;
    border: 0;
    border-radius: 7px;
    background: var(--moon);
    color: var(--night);
    font-weight: 700;
  }
</style>
