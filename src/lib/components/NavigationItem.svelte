<script lang="ts">
  import type { NavigationItem, NavigationSubItem } from "$types/navigation";

  import {
    libraryOutline,
    chatbubblesOutline,
    gitNetworkOutline,
    gitCommitOutline,
  } from "ionicons/icons";

  interface Props {
    item?: NavigationItem;
    subitem?: NavigationSubItem;
    selected: boolean;
  }

  let { item, subitem, selected }: Props = $props();

  const iconMap: Record<string, any> = {
    documentation: libraryOutline,
    chat: chatbubblesOutline,
    architecture: gitNetworkOutline,
  };

  let currentItem: NavigationItem | NavigationSubItem | undefined = $derived(
    item ?? subitem
  );

  let icon: string | undefined = $derived(
    subitem ? gitCommitOutline : iconMap[item?.type ?? ""]
  );

  let subitems: NavigationSubItem[] | undefined = $derived(item?.subitems);

  let metadata: string | undefined = $derived(subitem?.metadata);
</script>

{#if currentItem}
  <ion-item
    href={currentItem.href}
    class:selected
    class:subitem
    color={selected ? "medium" : undefined}
  >
    {#if icon}
      <ion-icon {icon} slot="start"></ion-icon>
    {/if}

    <ion-label>
      <div class="title">{currentItem.title}</div>

      {#if subitems && subitems.length > 0}
        <div class="subtitle">
          {subitems.length} subsystem{subitems.length === 1 ? "" : "s"}
        </div>
      {:else if metadata}
        <div class="subtitle">{metadata}</div>
      {/if}
    </ion-label>
  </ion-item>
{/if}

<style lang="scss">
  ion-item {
    --border-radius: 8px;
    --background: transparent;

    margin: 2px 8px;
    font-size: 1rem;
    font-weight: 500;

    &.selected {
      pointer-events: none;
      font-weight: 600;
    }

    &:hover {
      --background: var(--ion-color-light-shade);
    }

    &:not(.selected) {
      .subtitle {
        color: var(--ion-color-medium);
      }
    }
  }

  .subtitle {
    font-size: 0.85em;
  }

  .subitem {
    font-size: 0.9rem;
  }
</style>
