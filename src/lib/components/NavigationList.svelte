<script lang="ts">
  import type { NavigationItem } from "$types/navigation";

  import {
    libraryOutline,
    chatbubblesOutline,
    gitNetworkOutline,
  } from "ionicons/icons";

  interface Props {
    items: NavigationItem[];
    currentPath: string;
  }

  let { items, currentPath }: Props = $props();

  $effect(() => {
    console.debug(currentPath);
  });

  // Determine if a subsystem is currently selected
  const isCurrentSubsystem = (subsystemName: string): boolean => {
    const pathParts = currentPath.split("/");
    const currentSubsystem = pathParts[pathParts.length - 1];
    return decodeURIComponent(currentSubsystem) === subsystemName;
  };

  const iconMap: Record<string, any> = {
    documentation: libraryOutline,
    chat: chatbubblesOutline,
    architecture: gitNetworkOutline,
  };
</script>

<ion-list class="navigation-list">
  {#each items as section}
    {@const itemIcon = iconMap[section.type]}

    <div class="nav-section">
      <ion-item
        href={section.href}
        class:selected={currentPath === section.href}
        color={currentPath === section.href ? "medium" : undefined}
      >
        {#if itemIcon}
          <ion-icon icon={itemIcon} slot="start"></ion-icon>
        {/if}

        <ion-label class="nav-label">
          <div class="nav-title">{section.title}</div>

          {#if section.subitems}
            <div class="nav-subtitle">
              {section.subitems.length} subsystems
            </div>
          {/if}
        </ion-label>
      </ion-item>

      <!-- Subitems (subsystems) -->
      {#if section.subitems && section.subitems.length > 0}
        <div class="subitems-menu">
          {#each section.subitems as subitem}
            <ion-item
              class="subitem"
              class:selected={isCurrentSubsystem(subitem.title)}
              href={subitem.href}
            >
              <ion-icon icon={libraryOutline} slot="start"></ion-icon>

              <ion-label>
                <div class="subitem-name">{subitem.title}</div>

                {#if subitem.metadata}
                  <div class="subitem-info">{subitem.metadata}</div>
                {/if}
              </ion-label>
            </ion-item>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</ion-list>

<style lang="scss">
  .navigation-list {
    margin-bottom: 20px;
  }

  .nav-section {
    margin-bottom: 4px;

    ion-item {
      --padding-start: 16px;
      --padding-end: 16px;
      --background: transparent;
      --border-radius: 8px;
      margin: 0 8px;
      font-weight: 500;

      &.selected {
        pointer-events: none;
        font-weight: 600;
      }

      &:hover:not(.selected) {
        --background: var(--ion-color-light-shade);
      }
    }
  }

  .nav-label {
    .nav-title {
      font-size: 1rem;
      font-weight: inherit;
    }

    .nav-subtitle {
      font-size: 0.85rem;
      color: var(--ion-color-medium);
      margin-top: 2px;
    }
  }

  .nav-arrow {
    font-size: 0.9rem;
    color: var(--ion-color-medium);
  }

  .subitems-menu {
    background: var(--ion-color-light-shade);
    border-radius: 8px;
    margin: 8px 16px 0 16px;
    overflow: hidden;
  }

  .subitem {
    --padding-start: 20px;
    --padding-end: 16px;
    --background: transparent;
    font-size: 0.9rem;
    border-bottom: 1px solid var(--ion-color-light);

    &:last-child {
      border-bottom: none;
    }

    &.selected {
      --background: var(--ion-color-primary-tint);
      --color: var(--ion-color-primary);
      font-weight: 600;
    }

    &:hover:not(.selected) {
      --background: var(--ion-color-light);
    }

    .subitem-name {
      font-weight: 500;
      line-height: 1.2;
    }

    .subitem-info {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
      margin-top: 2px;
    }
  }
</style>
