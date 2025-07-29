<script lang="ts">
  import { logoGithub, hourglassOutline, timeOutline, checkmarkCircleOutline } from 'ionicons/icons';
  import type { FirestoreRepo, AnalysisStatus } from '$types/repository';
  import type { AnalysisResult } from '$types/analysis';

  interface Props {
    repo: FirestoreRepo;
    analysis: AnalysisResult;
    analysisStale: boolean;
    analysisAge: string;
    onOpenRepository?: () => void;
    getFrameworkColor: (framework: string) => string;
    formatTimestamp: (timestamp: string) => string;
  }

  let { 
    repo,
    analysis,
    analysisStale,
    analysisAge,
    onOpenRepository = () => window.open(repo.url, "_blank"),
    getFrameworkColor,
    formatTimestamp
  }: Props = $props();
</script>

<div class="repo-info-section">
  <div class="repo-header">
    <div class="repo-title">
      <h3>{repo.name}</h3>
      <ion-button
        fill="clear"
        size="small"
        onclick={onOpenRepository}
      >
        <ion-icon icon={logoGithub} slot="icon-only"></ion-icon>
      </ion-button>
    </div>
    <div class="repo-meta">
      <ion-chip
        color={getFrameworkColor(analysis.framework)}
        size="small"
      >
        <ion-label>{analysis.framework}</ion-label>
      </ion-chip>
      <div class="analysis-status">
        {#if repo.analysisStatus === "analyzing"}
          <ion-chip color="warning" size="small">
            <ion-icon icon={hourglassOutline}></ion-icon>
            <ion-label>Analyzing...</ion-label>
          </ion-chip>
        {:else if analysisStale}
          <ion-chip color="medium" size="small">
            <ion-icon icon={timeOutline}></ion-icon>
            <ion-label>Stale</ion-label>
          </ion-chip>
        {:else}
          <ion-chip color="success" size="small">
            <ion-icon icon={checkmarkCircleOutline}></ion-icon>
            <ion-label>Fresh</ion-label>
          </ion-chip>
        {/if}
      </div>
    </div>
    <div class="repo-stats">
      <span class="stat">{analysis.fileCount} files</span>
      <span class="stat">{analysis.subsystems.length} subsystems</span>
    </div>
    <div class="timestamp-info">
      <div class="timestamp">
        <span class="label">Analyzed:</span>
        <span class="value">{analysisAge}</span>
      </div>
      <div class="timestamp">
        <span class="label">Updated:</span>
        <span class="value"
          >{formatTimestamp(repo.githubPushedAt).split(",")[0]}</span
        >
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .repo-info-section {
    padding: 16px;
    border-bottom: 2px solid var(--ion-color-light);
    margin-bottom: 16px;
    background: var(--ion-color-light-tint);
  }

  .repo-header {
    .repo-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;

      h3 {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        margin: 0;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      ion-button {
        --color: var(--ion-color-medium);
        margin-left: 8px;

        &:hover {
          --color: var(--ion-color-primary);
        }
      }
    }

    .repo-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .analysis-status {
      display: flex;
      align-items: center;
    }

    .repo-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      font-size: 0.9rem;

      .stat {
        color: var(--ion-color-medium);
        font-weight: 500;
      }
    }

    .timestamp-info {
      font-size: 0.8rem;
      
      .timestamp {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;

        .label {
          color: var(--ion-color-medium);
        }

        .value {
          color: var(--ion-color-dark);
          font-weight: 500;
        }
      }
    }
  }
</style>