<script lang="ts">
  import type { Snippet } from "svelte";
  import type { FirestoreRepo } from "$types/repository";
  import type { AnalysisResult } from "$types/analysis";
  import { closeOutline } from "ionicons/icons";

  // Import components
  import RepoInfoSection from "$components/repo/InfoSection.svelte";
  import NavigationList from "$components/NavigationList.svelte";
  import QuickActions from "$components/QuickActions.svelte";
  import RepoToolbar from "$components/repo/Toolbar.svelte";

  interface Props {
    children: Snippet;
    data: {
      repo: FirestoreRepo;
      analysis: AnalysisResult;
      repoId: string;
      currentPath: string;
    };
  }

  let { children, data }: Props = $props();

  // Extract data from load function
  let { repo, repoId, currentPath, analysis } = $derived(data);

  // State management
  let refreshing = $state(false);

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
</script>

<ion-split-pane content-id="main-content" when="md">
  <!-- Sidebar Menu -->
  <ion-menu content-id="main-content">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-toggle>
            <ion-button color="dark">
              <ion-icon slot="icon-only" icon={closeOutline}></ion-icon>
            </ion-button>
          </ion-menu-toggle>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      {#if repo}
        <RepoInfoSection {repo} {analysis} {formatTimestamp} />

        <NavigationList {repoId} {analysis} {currentPath} />

        <QuickActions {repo} {refreshing} />
      {/if}
    </ion-content>
  </ion-menu>

  <!-- Main Content Area -->
  <div class="ion-page" id="main-content">
    <ion-header>
      <RepoToolbar />
    </ion-header>

    {@render children()}
  </div>
</ion-split-pane>

<style lang="scss">
  // Split Pane Responsiveness
  ion-split-pane {
    --border: 1px solid var(--ion-color-light);
  }

  ion-content {
    --background: var(--ion-color-light-tint);
  }

  ion-menu {
    --width: 280px;

    max-width: 375px;
    view-transition-name: menu;

    @media (max-width: 768px) {
      --width: 260px;
    }
  }

  .ion-page {
    > ion-header {
      view-transition-name: layout-header;
    }
  }
</style>
