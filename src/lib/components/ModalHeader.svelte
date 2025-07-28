<script lang="ts" module>
  import { closeOutline } from "ionicons/icons";

  import Button from "$components/Button.svelte";

  interface Props {
    title: string;
    type?: undefined | "form";
    canDismiss?: boolean;
    submitLabel?: string;
    submitDisabled?: boolean;
    dismiss: () => void;
  }
</script>

<script lang="ts">
  let {
    title,
    type,
    canDismiss = true,
    submitLabel,
    submitDisabled = false,
    dismiss,
  }: Props = $props();
</script>

<ion-header>
  <ion-toolbar>
    {#if canDismiss}
      <ion-buttons slot="start">
        <Button
          color="medium"
          ariaLabel="close modal"
          triggered={dismiss}
          style="--padding-start: 0; --padding-end: 0; margin: 0;"
          icon={closeOutline}
        />
      </ion-buttons>
    {/if}

    <ion-title>{title}</ion-title>

    {#if type === "form" && submitLabel}
      <ion-buttons slot="end">
        <Button
          type="submit"
          strong={true}
          disabled={submitDisabled}
          size="default"
          text={submitLabel}
        />
      </ion-buttons>
    {/if}
  </ion-toolbar>
</ion-header>

<style lang="scss">
  ion-header {
    ion-toolbar {
      padding-top: 0;
    }
  }

  ion-title {
    text-transform: capitalize;
  }
</style>
