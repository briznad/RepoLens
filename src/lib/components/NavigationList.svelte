<script lang="ts">
  import { arrowForward, chevronUp, chevronDown, libraryOutline, chatbubblesOutline, gitNetworkOutline } from 'ionicons/icons';
  import SubsystemMenu from '$components/subsystem/Menu.svelte';
  import type { Subsystem } from '$types/analysis';

  interface NavigationSection {
    title: string;
    url: string;
    icon: string;
    primary: boolean;
    expandable?: boolean;
    expanded?: boolean;
  }

  const iconMap: Record<string, any> = {
    'library-outline': libraryOutline,
    'chatbubbles-outline': chatbubblesOutline,
    'git-network-outline': gitNetworkOutline
  };

  interface Props {
    navigationSections: NavigationSection[];
    subsystems: Subsystem[];
    subsystemsExpanded: boolean;
    currentPath: string;
    onNavClick: (url: string) => void;
    onToggleSubsystems: () => void;
    onSubsystemClick: (subsystemName: string) => void;
    isCurrentSubsystem: (subsystemName: string) => boolean;
  }

  let { 
    navigationSections,
    subsystems,
    subsystemsExpanded,
    currentPath,
    onNavClick,
    onToggleSubsystems,
    onSubsystemClick,
    isCurrentSubsystem
  }: Props = $props();
</script>

<ion-list class="navigation-list">
  {#each navigationSections as section}
    <div class="nav-section">
      <ion-item
        button
        onclick={() =>
          section.expandable
            ? onToggleSubsystems()
            : onNavClick(section.url)}
        class:selected={currentPath.startsWith(section.url)}
        class:primary={section.primary}
      >
        <ion-icon icon={iconMap[section.icon]} slot="start"></ion-icon>
        <ion-label class="nav-label">
          <div class="nav-title">{section.title}</div>
          {#if section.primary}
            <div class="nav-subtitle">
              {subsystems.length} subsystems
            </div>
          {/if}
        </ion-label>
        {#if section.expandable}
          <ion-icon
            icon={subsystemsExpanded ? chevronUp : chevronDown}
            slot="end"
          ></ion-icon>
        {:else}
          <ion-icon icon={arrowForward} slot="end" class="nav-arrow"></ion-icon>
        {/if}
      </ion-item>

      <!-- Subsystems submenu for Documentation -->
      {#if section.expandable && subsystemsExpanded && subsystems.length > 0}
        <SubsystemMenu 
          {subsystems}
          {onSubsystemClick}
          {isCurrentSubsystem}
        />
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
        --background: var(--ion-color-primary-tint);
        --color: var(--ion-color-primary);
        font-weight: 600;
      }

      &.primary {
        --background: var(--ion-color-light);
        border: 1px solid var(--ion-color-medium-tint);

        &.selected {
          --background: var(--ion-color-primary-tint);
          border-color: var(--ion-color-primary);
        }
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
</style>