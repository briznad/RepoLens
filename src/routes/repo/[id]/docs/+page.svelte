<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { repositoryManager } from "$services/repository-manager";
  import { getRepoById } from "$lib/services/repository";
  import type { FirestoreRepo } from "$types/repository";
  import type {
    AnalysisResult,
    Subsystem,
    SubsystemDescription,
    Framework,
  } from "$types/analysis";
  
  import LoadingState from "$components/LoadingState.svelte";
  import ErrorCard from "$components/ErrorCard.svelte";
  import RepoHeader from "$components/RepoHeader.svelte";
  import StatCard from "$components/StatCard.svelte";
  import LanguageDistribution from "$components/LanguageDistribution.svelte";
  import SearchAndFilter from "$components/SearchAndFilter.svelte";
  import SubsystemGrid from "$components/SubsystemGrid.svelte";
  import FileList from "$components/FileList.svelte";
  import { documentOutline, settingsOutline, documentTextOutline, informationCircleOutline, home } from 'ionicons/icons';

  const repoId = $derived($page.params.id);

  // State management
  let repo = $state<FirestoreRepo | null>(null);
  let analysis = $state<AnalysisResult | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Search and filter state
  let searchQuery = $state("");
  let selectedFramework = $state<Framework | "all">("all");
  let sortBy = $state<"name" | "files" | "alphabetical">("name");
  let filteredSubsystems = $state<
    (Subsystem & { description?: SubsystemDescription })[]
  >([]);

  // Load repository data
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
        loading = false;
        return;
      }

      repo = repoData;
      analysis = repoData.analysisData || null;

      // Combine subsystems with their AI descriptions if available
      if (analysis) {
        filteredSubsystems = analysis.subsystems.map((subsystem) => {
          const description = analysis?.subsystemDescriptions?.find(
            (desc) => desc.name === subsystem.name
          );
          return { ...subsystem, description };
        });
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load repository";
    } finally {
      loading = false;
    }
  });

  // Filter and sort subsystems
  $effect(() => {
    if (!analysis) return;

    let filtered = analysis.subsystems.map((subsystem) => {
      const description = analysis?.subsystemDescriptions?.find(
        (desc) => desc.name === subsystem.name
      );
      return { ...subsystem, description };
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (subsystem) =>
          subsystem.name.toLowerCase().includes(query) ||
          subsystem.description?.description?.toLowerCase().includes(query) ||
          subsystem.files.some((file) =>
            file.path.toLowerCase().includes(query)
          )
      );
    }

    // Apply framework filter
    if (selectedFramework !== "all") {
      // This is a simple filter - in reality you might want more sophisticated filtering
      filtered = filtered.filter(
        (subsystem) => analysis?.framework === selectedFramework
      );
    }

    // Apply sorting
    switch (sortBy) {
      case "alphabetical":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "files":
        filtered.sort((a, b) => b.files.length - a.files.length);
        break;
      case "name":
      default:
        // Keep original order or sort by priority if available
        break;
    }

    filteredSubsystems = filtered;
  });

  // Helper functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getTotalSize = (): number => {
    if (!analysis?.languages) return 0;
    return Object.values(analysis.languages).reduce(
      (sum, size) => sum + size,
      0
    );
  };

  const handleSubsystemClick = (subsystemName: string) => {
    goto(`/repo/${repoId}/docs/${encodeURIComponent(subsystemName)}`);
  };

</script>

<ion-content class="ion-padding">
  {#if loading}
    <LoadingState message="Loading repository documentation..." />
  {:else if error}
    <ErrorCard 
      title="Error" 
      message={error} 
      actions={[
        {
          label: "Return Home",
          icon: home,
          handler: () => goto("/"),
          fill: "outline"
        }
      ]}
    />
  {:else if repo && analysis}
    <div class="docs-container">
      <!-- Header Section -->
      <RepoHeader {repo} {analysis} />

      <!-- Overview Section -->
      <StatCard 
        title="Repository Overview" 
        stats={[
          { label: "Total Files", value: analysis.fileCount },
          { label: "Subsystems", value: analysis.subsystems.length },
          { label: "Languages", value: Object.keys(analysis.languages).length },
          { label: "Total Size", value: formatFileSize(getTotalSize()) }
        ]}
      />
      
      <!-- Language Distribution -->
      {#if analysis.languages && Object.keys(analysis.languages).length > 0}
        <ion-card>
          <ion-card-content>
            <LanguageDistribution languages={analysis.languages} />
          </ion-card-content>
        </ion-card>
      {/if}

      <!-- Search and Filter Section -->
      <SearchAndFilter 
        {searchQuery}
        searchPlaceholder="Search subsystems, files, or descriptions..."
        sortBy={sortBy}
        sortOptions={[
          { value: "name", label: "Default Order" },
          { value: "alphabetical", label: "Alphabetical" },
          { value: "files", label: "File Count" }
        ]}
        onSearchChange={(query) => searchQuery = query}
        onSortChange={(sort) => sortBy = sort}
      />

      <!-- Subsystems Grid -->
      <SubsystemGrid 
        subsystems={filteredSubsystems}
        {searchQuery}
        onSubsystemClick={handleSubsystemClick}
        onClearSearch={() => searchQuery = ""}
      />

      <!-- Additional Information -->
      <ion-card class="additional-info-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon icon={informationCircleOutline}></ion-icon>
            Additional Information
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="12" size-md="4">
                <FileList 
                  files={analysis.mainFiles}
                  title="Main Files"
                  icon={documentOutline}
                  emptyMessage="No main files detected"
                />
              </ion-col>
              <ion-col size="12" size-md="4">
                <FileList 
                  files={analysis.configFiles}
                  title="Configuration"
                  icon={settingsOutline}
                  emptyMessage="No config files detected"
                />
              </ion-col>
              <ion-col size="12" size-md="4">
                <FileList 
                  files={analysis.documentationFiles}
                  title="Documentation"
                  icon={documentTextOutline}
                  emptyMessage="No documentation files detected"
                />
              </ion-col>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>
    </div>
  {/if}
</ion-content>

<style lang="scss">
  .docs-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 16px;
  }


  // Additional Information
  .additional-info-card {
    margin-bottom: 32px;
  }

  // Responsive adjustments
  @media (max-width: 768px) {
    .docs-container {
      padding: 0 8px;
    }
  }
</style>
