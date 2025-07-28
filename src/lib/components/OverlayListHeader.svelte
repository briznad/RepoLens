<script lang="ts" module>
  import type { Snippet } from "svelte";

  import type { Color } from "$types/color";

  import ChunkyLabel from "$components/ChunkyLabel.svelte";

  interface Props {
    allcaps?: boolean;
    children: Snippet;
    allowWordWrap?: boolean;
    center?: boolean;
    color?: Color;
  }
</script>

<script lang="ts">
  let {
    allcaps = true,
    children,
    allowWordWrap = false,
    center = false,
    color,
  }: Props = $props();
</script>

<ion-item class="popover-list-header" lines="full" {color}>
  <ion-label class:no-wrap={!allowWordWrap}>
    <ChunkyLabel {allcaps} {center}>
      {@render children()}
    </ChunkyLabel>
  </ion-label>
</ion-item>

<style lang="scss">
  .popover-list-header {
    --min-height: 0;
  }

  ion-label {
    &.no-wrap {
      white-space: nowrap;
    }

    :global(.chunky-label) {
      opacity: 0.75;
    }
  }
</style>
