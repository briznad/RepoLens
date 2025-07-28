<script lang="ts" module>
  import type { Snippet } from "svelte";

  interface Props {
    triggerId?: string;
    dismissOnSelect?: boolean;
    children: Snippet;
    willPresent?: () => void;
    willDismiss?: () => void;
  }
</script>

<script lang="ts">
  let {
    triggerId,
    dismissOnSelect = true,
    children,
    willPresent,
    willDismiss,
  }: Props = $props();

  let popoverElement: undefined | HTMLIonPopoverElement = $state();

  export function present(): void {
    popoverElement?.present();
  }

  export function dismiss(): void {
    popoverElement?.dismiss();
  }
</script>

{#if children}
  <ion-popover
    bind:this={popoverElement}
    trigger={triggerId}
    dismiss-on-select={dismissOnSelect}
    onionPopoverWillPresent={() => willPresent?.()}
    onionPopoverWillDismiss={() => willDismiss?.()}
  >
    <ion-list>
      {@render children()}
    </ion-list>
  </ion-popover>
{/if}

<style lang="scss">
  ion-popover {
    --width: fit-content;

    :global(.popover-list-header) {
      white-space: nowrap;
    }
  }
</style>
