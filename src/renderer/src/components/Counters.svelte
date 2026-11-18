<script lang="ts">
  import type { Inventory } from '../../../shared/inventory';
  import { inventoryTiles } from '../lib/inventory-tiles';

  let { inventory }: { inventory: Inventory | null } = $props();

  const tiles = $derived(inventoryTiles(inventory));

  const magicNames = ['No magic', 'Magic', 'Double magic'];
</script>

<!-- Hearts, magic, tokens and wallet: the numbers that aren't an item slot. -->
{#if tiles.counters}
  {@const counters = tiles.counters}
  <dl class="counters">
    <div
      title={counters.doubleDefense ? 'Heart containers, with double defense' : 'Heart containers'}
    >
      <dt>
        <img
          class:defense={counters.doubleDefense}
          src={tiles.counterIcons.heart}
          alt={counters.doubleDefense ? 'Hearts, with double defense' : 'Hearts'}
        />
      </dt>
      <dd>{counters.hearts}</dd>
    </div>
    <div title="Pieces of heart toward the next container">
      <dt><img src={tiles.counterIcons.heartPiece} alt="Heart pieces" /></dt>
      <dd>{counters.heartPieces}<span>/4</span></dd>
    </div>
    <!-- The meter as the game draws it: double magic is twice as long. -->
    <div class="magic" title={magicNames[counters.magic] ?? 'Magic'}>
      <dt>Magic</dt>
      <dd>
        <span
          class="meter"
          class:empty={counters.magic === 0}
          class:double={counters.magic === 2}
          aria-hidden="true"
        ></span>
        <span class="sr">{magicNames[counters.magic]}</span>
      </dd>
    </div>
    <div title="{counters.walletName}: holds {counters.wallet} rupees">
      <dt>
        <img class:missing={!counters.walletUpgraded} src={counters.walletIcon} alt="Wallet" />
      </dt>
      <dd>{counters.wallet}</dd>
    </div>
    <div title="Swamp Spider House tokens">
      <dt><img src={tiles.counterIcons.token} alt="Swamp tokens" /></dt>
      <dd>{counters.swampTokens} <span>swamp</span></dd>
    </div>
    <div title="Ocean Spider House tokens">
      <dt><img src={tiles.counterIcons.token} alt="Ocean tokens" /></dt>
      <dd>{counters.oceanTokens} <span>ocean</span></dd>
    </div>
  </dl>
{:else}
  <p class="waiting">Hearts, magic and tokens show once the game is found.</p>
{/if}

<style>
  .counters {
    display: grid;
    grid-template-columns: repeat(3, auto);
    justify-content: start;
    gap: 8px 18px;
    font-size: 13px;
  }

  .counters div {
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }

  img {
    flex: none;
    width: 22px;
    min-width: 22px;
    height: 22px;
    object-fit: contain;
  }

  /* Double defense draws a white outline around the hearts, as in the game. */
  img.defense {
    filter: drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff)
      drop-shadow(0 -2px 0 #fff);
  }

  img.missing {
    filter: grayscale(1);
    opacity: 0.45;
  }

  dd {
    margin: 0;
    font-weight: 700;
  }

  span {
    font-weight: 400;
    color: var(--dim);
  }

  .magic dt {
    color: var(--dim);
  }

  .magic dd {
    display: flex;
    align-items: center;
  }

  .meter {
    display: block;
    width: 34px;
    height: 9px;
    border: 2px solid #d9f5d0;
    border-radius: 5px;
    background: linear-gradient(#7fe07a, #2fa83f);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
  }

  .meter.empty {
    border-color: var(--dim);
    background: none;
    opacity: 0.5;
  }

  .meter.double {
    width: 68px;
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .waiting {
    font-size: 12px;
    color: var(--dim);
  }
</style>
