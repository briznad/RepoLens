<script lang="ts" module>
  import type { Snippet } from "svelte";

  import { preventDefault, stopPropagation } from "$utilities/helper";

  import ModalHeader from "$components/ModalHeader.svelte";

  interface Props {
    title: string;
    type?: "form";
    triggerId?: string;
    canDismiss?: boolean;
    submitLabel?: string;
    submitDisabled?: boolean;
    height?: "33.333" | "50" | "66.666" | "100";
    scrollable?: boolean;
    isPopoverActive?: boolean;
    children: Snippet;
    popoverShouldDismiss?: (
      reason:
        | "modal will dismiss"
        | "modal backdrop tap"
        | "popover backdrop tap"
    ) => void | Promise<void>;
    submit?: () => void | Promise<void>;
    willPresent?: () => void | Promise<void>;
    presented?: () => void | Promise<void>;
    willDismiss?: () => void | Promise<void>;
    dismissed?: () => void | Promise<void>;
    additionalClass?: string;
  }
</script>

<script lang="ts">
  let {
    title,
    type,
    triggerId,
    canDismiss = true,
    submitLabel,
    submitDisabled = false,
    height = "33.333",
    scrollable = false,
    isPopoverActive = false,
    children,
    popoverShouldDismiss,
    submit,
    willPresent,
    presented,
    willDismiss,
    dismissed,
    additionalClass,
  }: Props = $props();

  let modalElement: undefined | HTMLIonModalElement = $state();

  let safeArea: string = $derived(
    `--safe-area: (var(--ion-safe-area-top)${height === "100" ? " + 25px" : ""});`
  );
  let style: string = $derived(`--height: ${height}vh; ${safeArea}`);

  export async function present(): Promise<void> {
    await modalElement?.present();

    return;
  }

  export async function dismiss(): Promise<void> {
    await modalElement?.dismiss();

    return;
  }

  function localWillDismiss(): void {
    willDismiss?.();

    popoverShouldDismiss?.("modal will dismiss");
  }
</script>

{#snippet modalContent(wrapList = false)}
  <ModalHeader
    {title}
    {type}
    {canDismiss}
    {submitLabel}
    {submitDisabled}
    {dismiss}
  ></ModalHeader>

  <ion-content scroll-y={scrollable}>
    {#if wrapList}
      <ion-list>
        {@render children?.()}
      </ion-list>
    {:else}
      {@render children?.()}
    {/if}
  </ion-content>
{/snippet}

<ion-modal
  bind:this={modalElement}
  trigger={triggerId}
  can-dismiss={canDismiss && !isPopoverActive}
  onwillPresent={() => willPresent?.()}
  ondidPresent={() => presented?.()}
  onwillDismiss={() => localWillDismiss()}
  ondidDismiss={() => dismissed?.()}
  onionBackdropTap={() => popoverShouldDismiss?.("modal backdrop tap")}
  class={additionalClass || ""}
>
  {#if type === "form"}
    <form
      class="modal-content"
      {style}
      onsubmit={preventDefault(() => submit?.())}
    >
      {@render modalContent(true)}
    </form>
  {:else}
    <div class="modal-content" {style}>
      {@render modalContent()}
    </div>
  {/if}

  <ion-backdrop
    class="popover-backdrop"
    class:popover-active={isPopoverActive}
    onionBackdropTap={stopPropagation(() =>
      popoverShouldDismiss?.("popover backdrop tap")
    )}
  ></ion-backdrop>
</ion-modal>

<style lang="scss">
  ion-modal {
    --height: auto;
    --border-radius: 10px 10px 0 0;

    align-items: flex-end;
  }

  .modal-content {
    display: flex;
    flex-direction: column;
    height: calc(var(--height) - var(--safe-area));
  }

  .popover-backdrop {
    pointer-events: none;
    background-color: #000;
    opacity: 0;
    z-index: 10;
    transition: opacity 200ms ease;

    &.popover-active {
      pointer-events: auto;
      opacity: 0.1;
    }
  }
</style>
