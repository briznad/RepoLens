<script lang="ts" module>
  import type { Color } from "$types/color";

  import { chevronBack } from "ionicons/icons";

  import { HEK } from "$utilities/helper";

  interface Props {
    hideText?: boolean;
    color?: Color;
  }
</script>

<script lang="ts">
  let { hideText, color }: Props = $props();

  function triggered() {
    history?.back();
  }
</script>

<ion-button
  class="back-button"
  class:icon-only={hideText}
  fill="clear"
  onclick={triggered}
  onkeydown={HEK(triggered)}
  role="button"
  tabindex="0"
  aria-label="navigate back"
  {color}
>
  <ion-icon slot={hideText ? "icon-only" : "start"} icon={chevronBack}
  ></ion-icon>

  {#if !hideText}
    Back
  {/if}
</ion-button>

<style lang="scss">
  ion-button {
    --padding-start: 0;

    margin-left: 0;
  }

  .icon-only {
    margin-right: 0;
    margin-right: 6px;
    margin-left: -12px;
  }

  ion-icon {
    &[slot="start"] {
      margin-right: 0;
      margin-left: -4px;
      font-size: var(--icon-font-size, 1.6em);
    }

    &[slot="icon-only"] {
      font-size: var(--icon-font-size, 1.8em);
    }
  }
</style>
