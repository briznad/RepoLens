<script lang="ts">
  import type { AnalysisResult } from "$types/analysis";
  import type { RepoData } from "$types/repository";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { parseGitHubUrl } from "$utilities/github-utils";
  import { fetchRepo } from "$services/github-api";
  import {
    findOrCreateRepo,
    checkRepoFreshness,
    updateRepoWithAnalysis,
    getRepoById,
    updateAnalysisStatus,
  } from "$services/repository";
  import AnalysisProgress from '$components/analysis/Progress.svelte';
  import AnalysisStatus from '$components/analysis/Status.svelte';
  import AnalysisSteps from '$components/analysis/Steps.svelte';
  import AnalysisError from '$components/analysis/Error.svelte';

  let repoUrl = $state("");
  let repoDocId = $state("");
  let analysisStep = $state("Initializing...");
  let progress = $state(0);
  let error = $state("");
  let isComplete = $state(false);
  let skipAnalysis = $state(false);

  const analysisSteps = [
    "Checking repository freshness...",
    "Fetching latest data from GitHub...",
    "Detecting framework...",
    "Analyzing file structure...",
    "Generating insights...",
    "Saving analysis results...",
  ];

  const updateProgress = (stepIndex: number, message?: string) => {
    analysisStep = message || analysisSteps[stepIndex];
    progress = ((stepIndex + 1) / analysisSteps.length) * 100;
  };

  const performAnalysis = async () => {
    try {
      const { owner, repo } = parseGitHubUrl(repoUrl);

      // Step 1: Check repository freshness
      updateProgress(0);
      await updateAnalysisStatus(repoDocId, "analyzing");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Fetch latest GitHub data
      updateProgress(1);
      const analysisResult: AnalysisResult = await fetchRepo(owner, repo);
      const githubData: RepoData = analysisResult.metadata;

      // Check if we need fresh analysis
      const isFresh = await checkRepoFreshness(repoDocId, githubData);
      if (isFresh) {
        skipAnalysis = true;
        updateProgress(5, "Repository is up to date!");
        isComplete = true;

        // Redirect to results
        setTimeout(() => {
          goto(`/repo/${repoDocId}`);
        }, 800);
        return;
      }

      // Step 3: Detect framework
      updateProgress(2, `Detected framework: ${analysisResult.framework}`);
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Step 4: Analyze file structure
      updateProgress(3, `Analyzing ${analysisResult.fileTree.length} files...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 5: Generate insights
      updateProgress(
        4,
        `Processing ${Object.keys(analysisResult.languages).length} languages...`
      );
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Step 6: Save analysis results
      updateProgress(5);
      await updateRepoWithAnalysis(repoDocId, githubData, analysisResult);
      await new Promise((resolve) => setTimeout(resolve, 500));

      isComplete = true;

      // Redirect to results
      setTimeout(() => {
        goto(`/repo/${repoDocId}`);
      }, 1000);
    } catch (err) {
      // Handle specific error types
      if (err instanceof Error) {
        if (
          err.message.includes("Repository not found") ||
          err.message.includes("404")
        ) {
          error =
            "Repository not found or is private. Please check that the repository exists and is publicly accessible.";
        } else if (
          err.message.includes("rate limit") ||
          err.message.includes("403")
        ) {
          error =
            "GitHub API rate limit exceeded. Please try again in a few minutes.";
        } else if (
          err.message.includes("network") ||
          err.message.includes("fetch")
        ) {
          error =
            "Network error occurred. Please check your connection and try again.";
        } else if (err.message.includes("timeout")) {
          error =
            "Request timed out. The repository might be too large. Please try again.";
        } else if (err.message.includes("Invalid GitHub URL")) {
          error = "Invalid repository URL. Please check the URL format.";
        } else {
          error = `Analysis failed: ${err.message}`;
        }
      } else {
        error = "Analysis failed due to an unexpected error. Please try again.";
      }

      analysisStep = "Analysis failed";

      // Update Firestore with failure status
      try {
        if (repoDocId) {
          await updateAnalysisStatus(repoDocId, "failed", error);
        }
      } catch (firestoreErr) {
        console.error("Failed to update Firestore status:", firestoreErr);
        // Don't overwrite the original error message
      }
    }
  };

  const initializeAnalysis = async () => {
    try {
      // Get URL and docId from query params
      repoUrl = $page.url.searchParams.get("url") || "";
      repoDocId = $page.url.searchParams.get("docId") || "";

      if (!repoUrl) {
        error =
          "No repository URL provided. Please return to the home page and enter a valid GitHub repository URL.";
        return;
      }

      // Validate GitHub URL format
      try {
        parseGitHubUrl(repoUrl);
      } catch (err) {
        error =
          err instanceof Error
            ? err.message
            : "Invalid GitHub repository URL format";
        return;
      }

      // If no docId, find or create repository
      if (!repoDocId) {
        try {
          analysisStep = "Setting up repository...";
          repoDocId = await findOrCreateRepo(repoUrl);
        } catch (err) {
          if (err instanceof Error) {
            if (err.message.includes("Invalid GitHub URL")) {
              error =
                "Invalid repository URL. Please check the URL format and try again.";
            } else if (err.message.includes("rate limit")) {
              error = "GitHub API rate limit exceeded. Please try again later.";
            } else {
              error = `Failed to initialize repository: ${err.message}`;
            }
          } else {
            error = "Failed to initialize repository. Please try again.";
          }
          return;
        }
      }

      // Verify repository exists in Firestore
      const firestoreRepo = await getRepoById(repoDocId);
      if (!firestoreRepo) {
        error =
          "Repository not found in database. This may be a system error - please try again.";
        return;
      }

      // Check if analysis is already in progress by another process
      if (firestoreRepo.analysisStatus === "analyzing") {
        analysisStep = "Analysis already in progress...";
        // Wait a bit and redirect to results page
        setTimeout(() => {
          goto(`/repo/${repoDocId}`);
        }, 2000);
        return;
      }

      // Start analysis
      performAnalysis();
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("network") || err.message.includes("fetch")) {
          error = "Network error. Please check your connection and try again.";
        } else if (
          err.message.includes("permission") ||
          err.message.includes("auth")
        ) {
          error = "Database access error. Please try again later.";
        } else {
          error = `Initialization failed: ${err.message}`;
        }
      } else {
        error = "Failed to initialize analysis. Please try again.";
      }
    }
  };

  onMount(() => {
    initializeAnalysis();
  });
</script>

<ion-content class="ion-padding">
  <div class="analysis-container">
    <ion-card>
      <ion-card-header>
        <ion-card-title>Analyzing Repository</ion-card-title>
        <ion-card-subtitle>{repoUrl}</ion-card-subtitle>
      </ion-card-header>

      <ion-card-content>
        {#if error}
          <AnalysisError 
            {error}
            onGoHome={() => goto("/")}
            onRetry={() => initializeAnalysis()}
            showRetry={error.includes("rate limit") || error.includes("API")}
          />
        {:else}
          <AnalysisProgress {progress} {isComplete} />
          <AnalysisStatus {analysisStep} {isComplete} />
          <AnalysisSteps steps={analysisSteps} {progress} />
        {/if}
      </ion-card-content>
    </ion-card>
  </div>
</ion-content>

<style lang="scss">
  .analysis-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
  }

  ion-card {
    max-width: 600px;
    width: 100%;
  }

  ion-card-title {
    text-align: center;
    color: var(--ion-color-primary);
  }

  ion-card-subtitle {
    text-align: center;
    word-break: break-all;
    margin-bottom: 20px;
  }

</style>
