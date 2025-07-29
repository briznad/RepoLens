<script lang="ts">
  import type { Snippet } from "svelte";
  import { goto } from "$app/navigation";
  import type { FirestoreRepo, AnalysisStatus } from "$types/repository";
  import type { AnalysisResult, Subsystem } from "$types/analysis";
  import type { NavigationSubItem, NavigationItem } from "$types/navigation";
  import { codeSlashOutline } from "ionicons/icons";

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
      analysisStale: boolean;
      repoId: string;
      currentPath: string;
    };
  }

  let { children, data }: Props = $props();

  // Extract data from load function
  let { repo, repoId, currentPath, analysis, analysisStale } = $derived(data);

  // State management
  let refreshing = $state(false);

  // Get subsystems for documentation menu
  const subitems = $derived(
    (analysis?.subsystems ?? []).map((subsystem) => ({
      title: subsystem.name,
      href: `/repo/${repoId}/docs/${encodeURIComponent(subsystem.name)}`,
      metadata: `${subsystem.files.length} files`,
    }))
  );

  // Navigation structure prioritizing documentation
  const navItems = $derived([
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
      title: "Documentation",
      href: `/repo/${repoId}/docs`,
      type: "documentation",
      primary: true,
      subitems,
    },
  ]);

  const handleRefreshAnalysis = async () => {
    if (!repo || refreshing) return;

    refreshing = true;

    try {
      // Redirect to analyze page with the repository URL
      goto("/analyze", { state: { repositoryUrl: repo.url } });
    } catch (err) {
      console.error("Failed to refresh analysis:", err);
    } finally {
      refreshing = false;
    }
  };

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
        <ion-title>
          <ion-icon icon={codeSlashOutline}></ion-icon>

          RepoLens
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <RepoInfoSection {repo} {analysis} {analysisStale} {formatTimestamp} />

      <NavigationList items={navItems} {currentPath} />

      <QuickActions {refreshing} onRefreshAnalysis={handleRefreshAnalysis} />
    </ion-content>
  </ion-menu>

  <!-- Main Content Area -->
  <div class="ion-page" id="main-content">
    <ion-header>
      <RepoToolbar
        {repo}
        {analysisStale}
        {refreshing}
        onRefreshAnalysis={handleRefreshAnalysis}
      />
    </ion-header>

    {@render children()}
  </div>
</ion-split-pane>

<style lang="scss">
  // Split Pane Responsiveness
  ion-split-pane {
    --border: 1px solid var(--ion-color-light);
  }

  ion-menu {
    --width: 280px;

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

  ion-title ion-icon {
    vertical-align: middle;
  }
</style>
