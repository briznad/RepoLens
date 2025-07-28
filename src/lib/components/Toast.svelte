<script lang="ts" module>
  import type { Color } from "$types/color";

  export interface Props {
    message: string;
    color?: Color;
    duration?: number | undefined;
    anchor?: string;
  }
</script>

<script lang="ts">
  let {
    message,
    color = "dark",
    duration = 5000,
    anchor = "stickyHeader",
  }: Props = $props();

  let toastElement: undefined | HTMLIonToastElement = $state();

  export async function present(): Promise<void> {
    await toastElement?.present();

    return;
  }

  export async function dismiss(): Promise<void> {
    await toastElement?.dismiss();

    return;
  }
</script>

<ion-toast
  bind:this={toastElement}
  {message}
  {color}
  {duration}
  swipe-gesture="vertical"
  position="top"
  position-anchor={anchor}
></ion-toast>

<style></style>
