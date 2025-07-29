<script lang="ts">
  import type { FirestoreRepo } from '$types/repository';
  import type { AnalysisResult } from '$types/analysis';
  import type { Framework } from '$types/analysis';
  import { codeOutline, documentTextOutline, starOutline, gitBranchOutline, logoGithub } from 'ionicons/icons';

  interface Props {
    repo: FirestoreRepo;
    analysis?: AnalysisResult | null;
    showActions?: boolean;
  }

  let { repo, analysis, showActions = true }: Props = $props();

  function getFrameworkColor(framework: Framework): string {
    const colors: Record<Framework, string> = {
      'react': 'primary',
      'nextjs': 'secondary', 
      'svelte': 'tertiary',
      'flask': 'success',
      'fastapi': 'warning',
      'unknown': 'medium'
    };
    return colors[framework] || 'medium';
  }

  function handleGitHubClick() {
    if (repo?.url) {
      window.open(repo.url, '_blank');
    }
  }
</script>

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
            {#if analysis?.framework}
              <ion-chip color={getFrameworkColor(analysis.framework)}>
                <ion-icon icon={codeOutline}></ion-icon>
                <ion-label>{analysis.framework}</ion-label>
              </ion-chip>
            {/if}
            {#if repo.language}
              <ion-chip color="medium">
                <ion-icon icon={documentTextOutline}></ion-icon>
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
        </div>
        {#if showActions}
          <div class="repo-actions">
            <ion-button fill="outline" onclick={handleGitHubClick}>
              <ion-icon icon={logoGithub} slot="start"></ion-icon>
              View on GitHub
            </ion-button>
          </div>
        {/if}
      </div>
    </ion-card-content>
  </ion-card>
</div>

<style lang="scss">
  .header-section {
    margin-bottom: 24px;
  }

  .repo-header-card {
    --background: linear-gradient(135deg, var(--ion-color-primary-tint), var(--ion-color-secondary-tint));
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

    @media (max-width: 768px) {
      font-size: 1.5rem;
    }
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

  .repo-actions {
    display: flex;
    gap: 12px;
    flex-shrink: 0;
  }
</style>