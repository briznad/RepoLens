<script lang="ts">
  import type { Snippet } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { getRepoById } from "$lib/services/repository";
  import type { FirestoreRepo, AnalysisStatus } from "$types/repository";
  import type { AnalysisResult, Subsystem } from "$types/analysis";
  import { libraryOutline } from 'ionicons/icons';
  
  // Import components
  import RepoLayoutLoading from '$components/repo/LayoutLoading.svelte';
  import RepoLayoutError from '$components/repo/LayoutError.svelte';
  import RepoInfoSection from '$components/repo/InfoSection.svelte';
  import NavigationList from '$components/NavigationList.svelte';
  import QuickActions from '$components/QuickActions.svelte';
  import RepoToolbar from '$components/repo/Toolbar.svelte';

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();

  const repoId = $derived($page.params.id);
  const currentPath = $derived($page.url.pathname);

  // State management
  let repo = $state<FirestoreRepo | null>(null);
  let analysis = $state<AnalysisResult | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let sidebarOpen = $state(false);
  let subsystemsExpanded = $state(true);

  // Freshness checking
  let analysisStale = $state(false);
  let analysisAge = $state<string>("");
  let refreshing = $state(false);

  // Load repository data on mount
  onMount(async () => {
    if (!repoId) {
      error = "Repository ID not found";
      loading = false;
      return;
    }

    try {
      const repoData = await getRepoById(repoId);
      if (!repoData) {
        error = "Repository not found";
        // Redirect to home after a brief delay
        setTimeout(() => goto("/"), 2000);
        loading = false;
        return;
      }

      repo = repoData;
      analysis = repoData.analysisData || null;

      // Check analysis freshness
      checkAnalysisFreshness();

      // If no analysis or stale analysis, redirect to analyze page
      if (
        !analysis ||
        (analysisStale && repoData.analysisStatus !== "analyzing")
      ) {
        setTimeout(() => goto("/analyze"), 1000);
        return;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load repository";
      setTimeout(() => goto("/"), 3000);
    } finally {
      loading = false;
    }
  });

  // Check if analysis is fresh or stale
  function checkAnalysisFreshness() {
    if (!repo || !repo.lastAnalyzed) {
      analysisStale = true;
      return;
    }

    const lastAnalyzed = new Date(repo.lastAnalyzed);
    const githubUpdated = new Date(repo.githubPushedAt);
    const now = new Date();

    // Analysis is stale ONLY if GitHub repo was updated after our last analysis
    analysisStale = githubUpdated > lastAnalyzed;

    // Calculate age string for display purposes
    const ageMs = now.getTime() - lastAnalyzed.getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);

    if (ageDays > 0) {
      analysisAge = `${ageDays} day${ageDays > 1 ? "s" : ""} ago`;
    } else if (ageHours > 0) {
      analysisAge = `${ageHours} hour${ageHours > 1 ? "s" : ""} ago`;
    } else {
      analysisAge = "Recently";
    }
  }

  // Navigation structure prioritizing documentation
  const navigationSections = $derived([
    {
      title: "Documentation",
      url: `/repo/${repoId}/docs`,
      icon: "library-outline",
      primary: true,
      expandable: true,
      expanded: subsystemsExpanded,
    },
    {
      title: "Chat with Iris",
      url: `/repo/${repoId}`,
      icon: "chatbubbles-outline",
      primary: false,
    },
    {
      title: "Architecture",
      url: `/repo/${repoId}/graph`,
      icon: "git-network-outline",
      primary: false,
    },
  ]);

  // Get subsystems for documentation menu
  const subsystems = $derived(analysis?.subsystems || []);

  // Handle navigation
  const handleNavClick = (url: string) => {
    goto(url);
    if (window.innerWidth < 768) {
      sidebarOpen = false;
    }
  };

  const handleSubsystemClick = (subsystemName: string) => {
    const url = `/repo/${repoId}/docs/${encodeURIComponent(subsystemName)}`;
    goto(url);
    if (window.innerWidth < 768) {
      sidebarOpen = false;
    }
  };

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

  const toggleSubsystems = () => {
    subsystemsExpanded = !subsystemsExpanded;
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

  const getFrameworkColor = (framework: string): string => {
    const colors: Record<string, string> = {
      react: "primary",
      nextjs: "secondary",
      svelte: "tertiary",
      flask: "success",
      fastapi: "warning",
      unknown: "medium",
    };
    return colors[framework] || "medium";
  };

  const isCurrentSubsystem = (subsystemName: string): boolean => {
    const pathParts = currentPath.split("/");
    const currentSubsystem = pathParts[pathParts.length - 1];
    return decodeURIComponent(currentSubsystem) === subsystemName;
  };
</script>

{#if loading}
  <RepoLayoutLoading />
{:else if error}
  <RepoLayoutError 
    {error} 
    onReturnHome={() => goto("/")} 
    onRetry={() => window.location.reload()} 
  />
{:else if repo && analysis}
  <ion-split-pane content-id="main-content" when="md">
    <!-- Sidebar Menu -->
    <ion-menu content-id="main-content">
      <ion-header>
        <ion-toolbar>
          <ion-title>
            <ion-icon icon={libraryOutline}></ion-icon>
            RepoLens
          </ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content>
        <RepoInfoSection 
          {repo}
          {analysis}
          {analysisStale}
          {analysisAge}
          {getFrameworkColor}
          {formatTimestamp}
        />

        <NavigationList 
          {navigationSections}
          {subsystems}
          {subsystemsExpanded}
          {currentPath}
          onNavClick={handleNavClick}
          onToggleSubsystems={toggleSubsystems}
          onSubsystemClick={handleSubsystemClick}
          {isCurrentSubsystem}
        />

        <QuickActions 
          {refreshing}
          onRefreshAnalysis={handleRefreshAnalysis}
          onAnalyzeNew={() => goto("/")}
        />
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
{/if}

<style lang="scss">
  // Split Pane Responsiveness
  ion-split-pane {
    --border: 1px solid var(--ion-color-light);
  }

  ion-menu {
    --width: 280px;

    @media (max-width: 768px) {
      --width: 260px;
    }
  }
</style>
