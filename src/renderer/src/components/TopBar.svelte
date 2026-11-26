<script lang="ts">
  import type { TrackerState } from '../../../shared/tracker-state';

  let { state }: { state: TrackerState | undefined } = $props();

  // The folder and file name are enough to tell seeds apart. The full path shows on hover.
  const seedPath = $derived(state && state.seed.status !== 'none' ? state.seed.path : null);
  const seedLabel = $derived(seedPath?.split(/[\\/]/).slice(-2).join('/') ?? 'Choose a seed');
</script>

<header>
  <h1>MM3D Randomizer Tracker</h1>

  <button
    class="seed"
    title={seedPath ? `${seedPath}\nClick to choose another seed` : 'Choose a seed file'}
    onclick={() => window.api.chooseSeed()}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.6l2 2h8.4A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z"
      />
    </svg>
    <span>{seedLabel}</span>
  </button>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 0 16px;
  }

  h1 {
    flex: none;
    white-space: nowrap;
    font-size: 16px;
    letter-spacing: 0.01em;
  }

  /* The current seed, shown as a file: clicking it opens the picker. */
  .seed {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    padding: 5px 11px 5px 9px;
    border: 0;
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    font-size: 13px;
  }

  .seed:hover {
    background: var(--surface-raised);
  }

  .seed span {
    max-width: 320px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .seed svg {
    flex: none;
    width: 16px;
    height: 16px;
    fill: var(--moon);
  }
</style>
