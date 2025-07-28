<script lang="ts" module>
  import type { Snippet } from "svelte";

  import type { Color } from "$types/color";

  import { informationCircle } from "ionicons/icons";

  import { createId } from "briznads-helpers";

  import OptionTriggerButton from "$components/OptionTriggerButton.svelte";

  interface Props {
    children: Snippet;
    color?: Color;
  }
</script>

<script lang="ts">
  let { children, color = "tertiary" }: Props = $props();

  // create unique hash to append to html id
  // to avoid conflicts with other components
  const triggerId = `tooltipPopoverTrigger_${createId("html_id")}`;
</script>

{#if children}
  <div class="tooltip-wrapper">
    <OptionTriggerButton
      id={triggerId}
      icon={informationCircle}
      title="hover or click to learn more"
      size="default"
      {color}
    />

    <ion-popover trigger={triggerId} trigger-action="hover">
      <ion-content class="ion-padding">
        {@render children()}
      </ion-content>
    </ion-popover>
  </div>
{/if}

<style lang="scss">
  .tooltip-wrapper {
    display: flex;
    align-items: center;

    :global(.option-trigger-button) {
      --padding-top: 0.5em;
      --padding-end: 0.5em;
      --padding-bottom: 0.5em;
      --padding-start: 0.5em;

      margin: 0;
      height: auto;

      &::part(native) {
        height: auto;
      }
    }

    :global(.option-trigger-button ion-icon) {
      margin: 0;
    }
  }

  ion-content {
    font-size: 14px;

    &::part(scroll) {
      overflow-y: hidden;
    }
  }
</style>
