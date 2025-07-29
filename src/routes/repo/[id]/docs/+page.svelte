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

  const getFrameworkColor = (framework: Framework): string => {
    const colors: Record<Framework, string> = {
      react: "primary",
      nextjs: "secondary",
      svelte: "tertiary",
      flask: "success",
      fastapi: "warning",
      unknown: "medium",
    };
    return colors[framework] || "medium";
  };

  const getLanguagePercentage = (
    language: string,
    totalSize: number
  ): number => {
    if (!analysis?.languages || totalSize === 0) return 0;
    return (analysis.languages[language] / totalSize) * 100;
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

  const handleGitHubClick = () => {
    if (repo?.url) {
      window.open(repo.url, "_blank");
    }
  };
</script>

<ion-content class="ion-padding">
  {#if loading}
    <div class="loading-container">
      <ion-spinner name="dots"></ion-spinner>
      <p>Loading repository documentation...</p>
    </div>
  {:else if error}
    <ion-card class="error-card">
      <ion-card-header>
        <ion-card-title color="danger">Error</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>{error}</p>
        <ion-button fill="outline" onclick={() => goto("/")}>
          <ion-icon name="home" slot="start"></ion-icon>
          Return Home
        </ion-button>
      </ion-card-content>
    </ion-card>
  {:else if repo && analysis}
    <div class="docs-container">
      <!-- Header Section -->
      <div class="header-section">
        <ion-card class="repo-header-card">
          <ion-card-content>
            <div class="repo-header">
              <div class="repo-info">
                <h1 class="repo-title">{repo.fullName}</h1>
                {#if repo.description}
                  <p class="repo-description">{repo.description}</p>
                {/if}
                <div class="repo-meta">
                  <ion-chip color={getFrameworkColor(analysis.framework)}>
                    <ion-icon name="code-outline"></ion-icon>
                    <ion-label>{analysis.framework}</ion-label>
                  </ion-chip>
                  {#if repo.language}
                    <ion-chip color="medium">
                      <ion-icon name="document-text-outline"></ion-icon>
                      <ion-label>{repo.language}</ion-label>
                    </ion-chip>
                  {/if}
                  <ion-chip color="medium">
                    <ion-icon name="star-outline"></ion-icon>
                    <ion-label>{repo.stars}</ion-label>
                  </ion-chip>
                  <ion-chip color="medium">
                    <ion-icon name="git-branch-outline"></ion-icon>
                    <ion-label>{repo.forks}</ion-label>
                  </ion-chip>
                </div>
              </div>
              <div class="repo-actions">
                <ion-button fill="outline" onclick={handleGitHubClick}>
                  <ion-icon name="logo-github" slot="start"></ion-icon>
                  View on GitHub
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Overview Section -->
      <ion-card class="overview-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="analytics-outline"></ion-icon>
            Repository Overview
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="12" size-md="3">
                <div class="stat-item">
                  <div class="stat-number">{analysis.fileCount}</div>
                  <div class="stat-label">Total Files</div>
                </div>
              </ion-col>
              <ion-col size="12" size-md="3">
                <div class="stat-item">
                  <div class="stat-number">{analysis.subsystems.length}</div>
                  <div class="stat-label">Subsystems</div>
                </div>
              </ion-col>
              <ion-col size="12" size-md="3">
                <div class="stat-item">
                  <div class="stat-number">
                    {Object.keys(analysis.languages).length}
                  </div>
                  <div class="stat-label">Languages</div>
                </div>
              </ion-col>
              <ion-col size="12" size-md="3">
                <div class="stat-item">
                  <div class="stat-number">
                    {formatFileSize(getTotalSize())}
                  </div>
                  <div class="stat-label">Total Size</div>
                </div>
              </ion-col>
            </ion-row>
          </ion-grid>

          <!-- Language Distribution -->
          {#if analysis.languages && Object.keys(analysis.languages).length > 0}
            <div class="language-section">
              <h3>Language Distribution</h3>
              <div class="language-bars">
                {#each Object.entries(analysis.languages).sort(([, a], [, b]) => b - a) as [language, size]}
                  <div class="language-bar">
                    <div class="language-info">
                      <span class="language-name">{language}</span>
                      <span class="language-percentage"
                        >{getLanguagePercentage(
                          language,
                          getTotalSize()
                        ).toFixed(1)}%</span
                      >
                    </div>
                    <div class="progress-bar">
                      <div
                        class="progress-fill"
                        style="width: {getLanguagePercentage(
                          language,
                          getTotalSize()
                        )}%"
                      ></div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </ion-card-content>
      </ion-card>

      <!-- Search and Filter Section -->
      <ion-card class="filter-card">
        <ion-card-content>
          <div class="filter-section">
            <ion-searchbar
              placeholder="Search subsystems, files, or descriptions..."
              value={searchQuery}
              onionInput={(e: any) => (searchQuery = e.detail.value)}
              show-clear-button="focus"
            ></ion-searchbar>

            <div class="filter-controls">
              <ion-select
                placeholder="Sort by"
                value={sortBy}
                onionSelectionChange={(e: any) => (sortBy = e.detail.value)}
              >
                <ion-select-option value="name">Default Order</ion-select-option
                >
                <ion-select-option value="alphabetical"
                  >Alphabetical</ion-select-option
                >
                <ion-select-option value="files">File Count</ion-select-option>
              </ion-select>
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Subsystems Grid -->
      <div class="subsystems-section">
        <div class="section-header">
          <h2>
            <ion-icon name="layers-outline"></ion-icon>
            Subsystems & Components
          </h2>
          <p class="section-subtitle">
            {filteredSubsystems.length} subsystem{filteredSubsystems.length !==
            1
              ? "s"
              : ""} found
          </p>
        </div>

        {#if filteredSubsystems.length === 0}
          <ion-card class="empty-state-card">
            <ion-card-content>
              <div class="empty-state">
                <ion-icon name="folder-open-outline" class="empty-icon"
                ></ion-icon>
                <h3>No subsystems found</h3>
                <p>
                  {searchQuery
                    ? "Try adjusting your search criteria."
                    : "This repository doesn't have clearly defined subsystems."}
                </p>
                {#if searchQuery}
                  <ion-button fill="outline" onclick={() => (searchQuery = "")}>
                    Clear Search
                  </ion-button>
                {/if}
              </div>
            </ion-card-content>
          </ion-card>
        {:else}
          <ion-grid class="subsystems-grid">
            <ion-row>
              {#each filteredSubsystems as subsystem}
                <ion-col size="12" size-md="6" size-lg="4">
                  <ion-card
                    class="subsystem-card"
                    button
                    onclick={() => handleSubsystemClick(subsystem.name)}
                  >
                    <ion-card-header>
                      <div class="subsystem-header">
                        <ion-card-title class="subsystem-title">
                          {subsystem.name}
                        </ion-card-title>
                        <ion-chip class="file-count-chip" color="primary">
                          {subsystem.files.length} files
                        </ion-chip>
                      </div>
                    </ion-card-header>

                    <ion-card-content>
                      <div class="subsystem-content">
                        <!-- AI-Generated Description -->
                        {#if subsystem.description?.description}
                          <p class="subsystem-description">
                            {subsystem.description.description}
                          </p>
                        {:else}
                          <p class="subsystem-description fallback">
                            {subsystem.description}
                          </p>
                        {/if}

                        <!-- Key Files -->
                        {#if subsystem.description?.keyFiles && subsystem.description.keyFiles.length > 0}
                          <div class="key-files">
                            <h4>Key Files:</h4>
                            <div class="file-chips">
                              {#each subsystem.description.keyFiles.slice(0, 3) as keyFile}
                                <ion-chip size="small" color="medium">
                                  <ion-label
                                    >{keyFile.split("/").pop()}</ion-label
                                  >
                                </ion-chip>
                              {/each}
                              {#if subsystem.description.keyFiles.length > 3}
                                <ion-chip size="small" color="light">
                                  <ion-label
                                    >+{subsystem.description.keyFiles.length -
                                      3} more</ion-label
                                  >
                                </ion-chip>
                              {/if}
                            </div>
                          </div>
                        {:else}
                          <!-- Fallback to showing some actual files -->
                          <div class="key-files">
                            <h4>Sample Files:</h4>
                            <div class="file-chips">
                              {#each subsystem.files.slice(0, 3) as file}
                                <ion-chip size="small" color="medium">
                                  <ion-label
                                    >{file.path.split("/").pop()}</ion-label
                                  >
                                </ion-chip>
                              {/each}
                              {#if subsystem.files.length > 3}
                                <ion-chip size="small" color="light">
                                  <ion-label
                                    >+{subsystem.files.length - 3} more</ion-label
                                  >
                                </ion-chip>
                              {/if}
                            </div>
                          </div>
                        {/if}

                        <!-- Technologies -->
                        {#if subsystem.description?.technologies && subsystem.description.technologies.length > 0}
                          <div class="technologies">
                            <h4>Technologies:</h4>
                            <div class="tech-chips">
                              {#each subsystem.description.technologies as tech}
                                <ion-chip size="small" color="tertiary">
                                  <ion-label>{tech}</ion-label>
                                </ion-chip>
                              {/each}
                            </div>
                          </div>
                        {/if}
                      </div>

                      <div class="subsystem-footer">
                        <ion-button
                          fill="clear"
                          size="small"
                          class="view-details-btn"
                        >
                          <ion-label>View Details</ion-label>
                          <ion-icon name="arrow-forward-outline" slot="end"
                          ></ion-icon>
                        </ion-button>
                      </div>
                    </ion-card-content>
                  </ion-card>
                </ion-col>
              {/each}
            </ion-row>
          </ion-grid>
        {/if}
      </div>

      <!-- Additional Information -->
      <ion-card class="additional-info-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="information-circle-outline"></ion-icon>
            Additional Information
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-grid>
            <ion-row>
              <ion-col size="12" size-md="4">
                <div class="info-section">
                  <h4>Main Files</h4>
                  {#if analysis.mainFiles.length > 0}
                    <ion-list>
                      {#each analysis.mainFiles.slice(0, 5) as file}
                        <ion-item lines="none" class="file-item">
                          <ion-icon name="document-outline" slot="start"
                          ></ion-icon>
                          <ion-label>{file.path}</ion-label>
                        </ion-item>
                      {/each}
                    </ion-list>
                  {:else}
                    <p class="no-items">No main files detected</p>
                  {/if}
                </div>
              </ion-col>
              <ion-col size="12" size-md="4">
                <div class="info-section">
                  <h4>Configuration</h4>
                  {#if analysis.configFiles.length > 0}
                    <ion-list>
                      {#each analysis.configFiles.slice(0, 5) as file}
                        <ion-item lines="none" class="file-item">
                          <ion-icon name="settings-outline" slot="start"
                          ></ion-icon>
                          <ion-label>{file.path}</ion-label>
                        </ion-item>
                      {/each}
                    </ion-list>
                  {:else}
                    <p class="no-items">No config files detected</p>
                  {/if}
                </div>
              </ion-col>
              <ion-col size="12" size-md="4">
                <div class="info-section">
                  <h4>Documentation</h4>
                  {#if analysis.documentationFiles.length > 0}
                    <ion-list>
                      {#each analysis.documentationFiles.slice(0, 5) as file}
                        <ion-item lines="none" class="file-item">
                          <ion-icon name="document-text-outline" slot="start"
                          ></ion-icon>
                          <ion-label>{file.path}</ion-label>
                        </ion-item>
                      {/each}
                    </ion-list>
                  {:else}
                    <p class="no-items">No documentation files detected</p>
                  {/if}
                </div>
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

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;

    ion-spinner {
      margin-bottom: 16px;
    }

    p {
      color: var(--ion-color-medium);
      font-size: 1rem;
    }
  }

  .error-card {
    max-width: 500px;
    margin: 40px auto;
    text-align: center;
  }

  // Header Section
  .header-section {
    margin-bottom: 24px;
  }

  .repo-header-card {
    --background: linear-gradient(
      135deg,
      var(--ion-color-primary-tint),
      var(--ion-color-secondary-tint)
    );
    border: none;
  }

  .repo-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .repo-title {
    font-size: 2rem;
    font-weight: bold;
    color: var(--ion-color-primary);
    margin: 0 0 8px 0;
  }

  .repo-description {
    font-size: 1.1rem;
    color: var(--ion-color-dark);
    margin: 0 0 16px 0;
    line-height: 1.5;
  }

  .repo-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  // Overview Section
  .overview-card {
    margin-bottom: 24px;
  }

  .stat-item {
    text-align: center;
    padding: 16px;

    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      color: var(--ion-color-primary);
    }

    .stat-label {
      font-size: 0.9rem;
      color: var(--ion-color-medium);
      margin-top: 4px;
    }
  }

  .language-section {
    margin-top: 24px;

    h3 {
      font-size: 1.2rem;
      margin-bottom: 16px;
      color: var(--ion-color-dark);
    }
  }

  .language-bars {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .language-bar {
    .language-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 0.9rem;

      .language-name {
        font-weight: 500;
        color: var(--ion-color-dark);
      }

      .language-percentage {
        color: var(--ion-color-medium);
      }
    }

    .progress-bar {
      height: 6px;
      background: var(--ion-color-light);
      border-radius: 3px;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background: var(--ion-color-primary);
        transition: width 0.3s ease;
      }
    }
  }

  // Filter Section
  .filter-card {
    margin-bottom: 24px;
  }

  .filter-section {
    display: flex;
    gap: 16px;
    align-items: center;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .filter-controls {
    display: flex;
    gap: 12px;
    min-width: 200px;
  }

  // Subsystems Section
  .subsystems-section {
    margin-bottom: 32px;
  }

  .section-header {
    margin-bottom: 20px;

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.8rem;
      color: var(--ion-color-dark);
      margin: 0 0 8px 0;
    }

    .section-subtitle {
      color: var(--ion-color-medium);
      font-size: 1rem;
      margin: 0;
    }
  }

  .subsystems-grid {
    --ion-grid-padding: 0;
  }

  .subsystem-card {
    height: 100%;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
    cursor: pointer;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
  }

  .subsystem-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  .subsystem-title {
    font-size: 1.3rem;
    color: var(--ion-color-dark);
    margin: 0;
    flex: 1;
  }

  .file-count-chip {
    font-size: 0.8rem;
    height: 24px;
  }

  .subsystem-content {
    flex: 1;
  }

  .subsystem-description {
    font-size: 0.95rem;
    line-height: 1.5;
    color: var(--ion-color-dark);
    margin: 0 0 16px 0;

    &.fallback {
      color: var(--ion-color-medium);
      font-style: italic;
    }
  }

  .key-files,
  .technologies {
    margin-bottom: 16px;

    h4 {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin: 0 0 8px 0;
    }
  }

  .file-chips,
  .tech-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .subsystem-footer {
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid var(--ion-color-light);
  }

  .view-details-btn {
    --color: var(--ion-color-primary);
    font-weight: 500;
  }

  // Empty State
  .empty-state-card {
    margin: 40px 0;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;

    .empty-icon {
      font-size: 4rem;
      color: var(--ion-color-medium);
      margin-bottom: 16px;
    }

    h3 {
      color: var(--ion-color-dark);
      margin-bottom: 8px;
    }

    p {
      color: var(--ion-color-medium);
      margin-bottom: 24px;
    }
  }

  // Additional Information
  .additional-info-card {
    margin-bottom: 32px;
  }

  .info-section {
    h4 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--ion-color-primary);
      display: inline-block;
    }
  }

  .file-item {
    --padding-start: 0;
    --padding-end: 0;
    --min-height: 36px;

    ion-icon {
      color: var(--ion-color-medium);
      margin-right: 8px;
    }

    ion-label {
      font-size: 0.9rem;
      color: var(--ion-color-dark);
    }
  }

  .no-items {
    color: var(--ion-color-medium);
    font-style: italic;
    margin: 8px 0;
  }

  // Responsive adjustments
  @media (max-width: 768px) {
    .docs-container {
      padding: 0 8px;
    }

    .repo-title {
      font-size: 1.5rem;
    }

    .section-header h2 {
      font-size: 1.5rem;
    }
  }
</style>
