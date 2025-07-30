<script lang="ts">
  import type { AnalysisResult } from "$types/analysis";

  import {
    libraryOutline,
    chatbubblesOutline,
    gitNetworkOutline,
  } from "ionicons/icons";

  import NavigationItem from "$components/NavigationItem.svelte";

  interface Props {
    repoId: string;
    currentPath: string;
    analysis: AnalysisResult;
  }

  let { repoId, currentPath, analysis }: Props = $props();

  // Get subsystems for documentation menu
  const subitems = $derived(
    (analysis?.subsystems ?? []).map((subsystem) => ({
      title: subsystem.name,
      href: `/repo/${repoId}/docs/${encodeURIComponent(subsystem.name)}`,
      metadata: `${subsystem.files.length} files`,
    }))
  );

  // Navigation structure prioritizing documentation
  const items = $derived([
    {
      title: "Chat with Iris",
      href: `/repo/${repoId}`,
      type: "chat",
      primary: false,
    },
    {
      title: "Architecture Overview",
      href: `/repo/${repoId}/graph`,
      type: "architecture",
      primary: false,
    },
    {
      title: "Files",
      href: `/repo/${repoId}/docs`,
      type: "documentation",
      primary: true,
      subitems,
    },
  ]);

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

<ion-list>
  <ion-list-header>
    <ion-label>Navigation</ion-label>
  </ion-list-header>

  {#each items as item}
    <NavigationItem {item} selected={currentPath === item.href} />

    <!-- Subitems (subsystems) -->
    {#if item.subitems && item.subitems.length > 0}
      <ion-item-group>
        {#each item.subitems as subitem}
          <NavigationItem
            {subitem}
            selected={isCurrentSubsystem(subitem.title)}
          />
        {/each}
      </ion-item-group>
    {/if}
  {/each}
</ion-list>

<style lang="scss">
  ion-list {
    background: transparent;
  }

  ion-list-header {
    padding-left: 16px;
    padding-right: 16px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ion-color-medium);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  ion-item-group {
    margin-top: 4px;
    margin-left: 16px;
  }

</style>
