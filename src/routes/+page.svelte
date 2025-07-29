<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import {
    getRecentRepositories,
    checkRepositoryByUrl,
    findOrCreateRepo,
  } from "$services/repository";
  import type { FirestoreRepo } from "$types/repository";
  import { parseGitHubUrl } from "$utilities/github-utils";
  import HeroSection from "$components/HeroSection.svelte";
  import RepositoryUrlInput from "$components/RepositoryUrlInput.svelte";
  import RecentRepositoriesList from "$components/RecentRepositoriesList.svelte";
  import FeatureGrid from "$components/FeatureGrid.svelte";

  let repoUrl = $state("");
  let isLoading = $state(false);
  let error = $state("");
  let recentRepos = $state<FirestoreRepo[]>([]);
  let loadingRecent = $state(true);

  // Load recent repositories on mount
  onMount(async () => {
    try {
      recentRepos = await getRecentRepositories(5);
    } catch (err) {
      console.error("Failed to load recent repositories:", err);
    } finally {
      loadingRecent = false;
    }
  });

  const validateGitHubUrl = (
    url: string
  ): { isValid: boolean; error?: string } => {
    if (!url.trim()) {
      return { isValid: false, error: "Please enter a repository URL" };
    }

    try {
      parseGitHubUrl(url);

      return { isValid: true };
    } catch (err) {
      return {
        isValid: false,
        error:
          err instanceof Error
            ? err.message
            : "Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)",
      };
    }
  };

  const handleSubmit = async () => {
    error = "";
    const validation = validateGitHubUrl(repoUrl);

    if (!validation.isValid) {
      error = validation.error || "Invalid URL";
      return;
    }

    isLoading = true;

    try {
      // Check if repository already exists
      const existingRepo = await checkRepositoryByUrl(repoUrl);

      if (existingRepo && existingRepo.analysisStatus === "completed") {
        // Repository exists and is analyzed, redirect directly to results
        goto(`/repo/${existingRepo.id}`);
        return;
      }

      // Find or create repository and start analysis
      const docId = await findOrCreateRepo(repoUrl);
      goto(`/analyze?url=${encodeURIComponent(repoUrl)}&docId=${docId}`);
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to process repository URL";
    } finally {
      isLoading = false;
    }
  };

  const handleRecentRepoClick = (repo: FirestoreRepo) => {
    goto(`/repo/${repo.id}`);
  };

</script>

<ion-content class="ion-padding">
  <div class="landing-container">
    <!-- Hero Section -->
    <HeroSection />

    <!-- URL Input Section -->
    <RepositoryUrlInput 
      {repoUrl}
      {isLoading}
      {error}
      onSubmit={handleSubmit}
      onUrlChange={(url) => repoUrl = url}
    />

    <!-- Recent Repositories Section -->
    {#if !loadingRecent}
      <RecentRepositoriesList 
        repositories={recentRepos}
        onRepoClick={handleRecentRepoClick}
      />
    {/if}

    <!-- Features Section -->
    <FeatureGrid />
  </div>
</ion-content>

<style lang="scss">
  .landing-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
  }

</style>
