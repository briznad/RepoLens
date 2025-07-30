<script lang="ts">
  import {
    logoGithub,
    hourglassOutline,
    timeOutline,
    checkmarkCircleOutline,
    codeOutline,
    documentTextOutline,
    starOutline,
    gitBranchOutline,
    syncOutline,
    warningOutline,
  } from "ionicons/icons";
  import type { FirestoreRepo, AnalysisStatus } from "$types/repository";
  import type { AnalysisResult } from "$types/analysis";

  interface Props {
    repo: FirestoreRepo;
    analysis: AnalysisResult;
    formatTimestamp: (timestamp: string) => string;
  }

  let { repo, analysis, formatTimestamp }: Props = $props();

  // Calculate analysis age for display
  const analysisAge = $derived(() => {
    if (!repo?.lastAnalyzed) return "Unknown";

    const lastAnalyzed = new Date(repo.lastAnalyzed);
    const now = new Date();
    const ageMs = now.getTime() - lastAnalyzed.getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);

    if (ageDays > 0) {
      return `${ageDays} day${ageDays > 1 ? "s" : ""} ago`;
    } else if (ageHours > 0) {
      return `${ageHours} hour${ageHours > 1 ? "s" : ""} ago`;
    } else {
      return "Recently";
    }
  });

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
</script>

<header>
  <h1>{repo.fullName}</h1>

  {#if repo.description}
    <p class="description">{repo.description}</p>
  {/if}

  <div class="meta">
    {#if analysis?.framework}
      <ion-chip color={getFrameworkColor(analysis.framework)}>
        <ion-icon icon={codeOutline}></ion-icon>
        <ion-label>{analysis.framework}</ion-label>
      </ion-chip>
    {:else if repo.language}
      <ion-chip color="medium">
        <ion-label>{repo.language}</ion-label>
      </ion-chip>
    {/if}

    <ion-chip color="medium">
      <ion-icon icon={starOutline}></ion-icon>
      <ion-label>{repo.stars}</ion-label>
    </ion-chip>

    <ion-chip color="medium">
      <ion-icon icon={gitBranchOutline}></ion-icon>
      <ion-label>{repo.forks}</ion-label>
    </ion-chip>
  </div>

  <ion-button color="dark" fill="outline" href={repo.url} target="_blank">
    <ion-icon icon={logoGithub} slot="start"></ion-icon>
    View on GitHub
  </ion-button>

  <div class="key-value">
    <span class="key">Total Files:</span>
    <span class="value">{analysis.fileCount}</span>
  </div>

  <div class="key-value">
    <span class="key">Subsystems:</span>
    <span class="value">{analysis.subsystems.length}</span>
  </div>

  <div class="key-value">
    <span class="key">Last Updated:</span>
    <span class="value"
      >{formatTimestamp(repo.githubPushedAt).split(",")[0]}</span
    >
  </div>

  <div class="key-value">
    <span class="key">Last Analyzed:</span>
    <span class="value">{analysisAge()}</span>
  </div>

  {#if repo.analysisStatus === "analyzing"}
    <ion-chip color="primary" size="small">
      <ion-icon icon={syncOutline}></ion-icon>
      <ion-label>Analysis in progress</ion-label>
    </ion-chip>
  {/if}
</header>

<style lang="scss">
  header {
    padding: 16px;
    border-bottom: 2px solid var(--ion-color-light);
  }

  .meta,
  ion-button {
    margin-bottom: 12px;
  }

  .key-value {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 0.8rem;

    .key {
      color: var(--ion-color-medium);
    }

    .value {
      color: var(--ion-color-dark);
      font-weight: 500;
    }
  }
</style>
