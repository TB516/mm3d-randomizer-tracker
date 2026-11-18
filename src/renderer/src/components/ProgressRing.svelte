<script lang="ts">
  import type { CheckStatus } from '../lib/checks';

  let {
    left,
    total,
    status,
    size = 14
  }: {
    left: number;
    total: number;
    /** Colors the lit arc, as on the map's pins. */
    status: CheckStatus;
    size?: number;
  } = $props();
</script>

<!-- The same ring as a map pin: the lit arc is the share of checks still left. -->
<i
  class="ring {status}"
  style:--left="{total ? (left / total) * 100 : 0}%"
  style:width="{size}px"
  style:height="{size}px"
  aria-hidden="true"
></i>

<style>
  .ring {
    --state: var(--available);
    flex: none;
    display: inline-block;
    border-radius: 50%;
    background:
      radial-gradient(
        closest-side,
        var(--ring-hole, var(--night)) calc(100% - 3px),
        transparent calc(100% - 2.5px)
      ),
      conic-gradient(var(--state) var(--left), var(--ring-track) 0);
  }

  .blocked {
    --state: var(--blocked);
  }
</style>
