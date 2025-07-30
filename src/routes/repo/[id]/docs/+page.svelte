<script lang="ts">
  import { goto } from "$app/navigation";
  import type { FirestoreRepo } from "$types/repository";
  import type {
    AnalysisResult,
    Subsystem,
    SubsystemDescription,
    Framework,
  } from "$types/analysis";

  import StatCard from "$components/StatCard.svelte";
  import LanguageDistribution from "$components/LanguageDistribution.svelte";
  import SearchAndFilter from "$components/SearchAndFilter.svelte";
  import SubsystemGrid from "$components/subsystem/Grid.svelte";
  import SectionHeader from "$components/subsystem/SectionHeader.svelte";
  import { layersOutline, analyticsOutline } from "ionicons/icons";

  interface Props {
    data: {
      repo: FirestoreRepo;
      analysis: AnalysisResult | null;
      repoId: string;
    };
  }

  let { data }: Props = $props();

  const { repo, analysis, repoId } = data;

  // Search and filter state
  let searchQuery = $state("");
  let selectedFramework = $state<Framework | "all">("all");
  let sortBy = $state<"name" | "files" | "alphabetical">("name");
  let filteredSubsystems = $state<
    (Subsystem & { description: SubsystemDescription })[]
  >([]);

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
          subsystem.files.some((filePath) =>
            filePath.toLowerCase().includes(query)
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
  {#if repo && analysis}
    <SectionHeader title="Repository Overview" icon={analyticsOutline} />

    <StatCard
      stats={[
        { label: "Total Files", value: analysis.fileCount },
        { label: "Subsystems", value: analysis.subsystems.length },
        { label: "Languages", value: Object.keys(analysis.languages).length },
        { label: "Total Size", value: formatFileSize(getTotalSize()) },
      ]}
    />

    <!-- Language Distribution -->
    {#if analysis.languages && Object.keys(analysis.languages).length > 0}
      <LanguageDistribution languages={analysis.languages} />
    {/if}

    <!-- Search and Filter Section -->
    <SearchAndFilter
      {searchQuery}
      searchPlaceholder="Search subsystems, files, or descriptions..."
      {sortBy}
      sortOptions={[
        { value: "name", label: "Default Order" },
        { value: "alphabetical", label: "Alphabetical" },
        { value: "files", label: "File Count" },
      ]}
      onSearchChange={(query) => (searchQuery = query)}
      onSortChange={(sort) => (sortBy = sort)}
    />

    <SectionHeader
      title="Subsystems & Components"
      icon={layersOutline}
      subtitle="{filteredSubsystems.length} subsystem{filteredSubsystems.length !==
      1
        ? 's'
        : ''} found"
    />

    <!-- Subsystems Grid -->
    <SubsystemGrid
      subsystems={filteredSubsystems}
      {searchQuery}
      onSubsystemClick={handleSubsystemClick}
      onClearSearch={() => (searchQuery = "")}
    />
  {/if}
</ion-content>

<style></style>
