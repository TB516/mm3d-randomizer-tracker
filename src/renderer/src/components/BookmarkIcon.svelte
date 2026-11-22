<script lang="ts">
  let { filled = false }: { filled?: boolean } = $props();
</script>

<svg viewBox="0 0 16 16" aria-hidden="true" class:filled>
  <path d="M4 2.5h8v11l-4-3-4 3z" />
</svg>

<style>
  svg {
    flex: none;
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linejoin: round;
  }

  .filled {
    fill: currentColor;
  }
</style>
