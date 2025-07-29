<script lang="ts">
  import { layersOutline, codeOutline, logoGithub } from 'ionicons/icons';
  import type { SubsystemDescription } from '$types/analysis';

  interface Props {
    subsystemName: string;
    fileCount: number;
    framework: string;
    subsystemDescription?: SubsystemDescription | null;
    fallbackDescription: string;
    repoUrl?: string;
    onViewRepository?: () => void;
  }

  let { 
    subsystemName,
    fileCount,
    framework,
    subsystemDescription,
    fallbackDescription,
    repoUrl,
    onViewRepository = () => window.open(repoUrl || "", "_blank")
  }: Props = $props();
</script>

<div class="header-section">
  <ion-card class="header-card">
    <ion-card-content>
      <div class="subsystem-header">
        <div class="header-info">
          <h1 class="subsystem-title">{subsystemName}</h1>
          <div class="subsystem-meta">
            <ion-chip color="primary">
              <ion-icon icon={layersOutline}></ion-icon>
              <ion-label>{fileCount} files</ion-label>
            </ion-chip>
            <ion-chip color="secondary">
              <ion-icon icon={codeOutline}></ion-icon>
              <ion-label>{framework}</ion-label>
            </ion-chip>
            {#if subsystemDescription?.technologies}
              {#each subsystemDescription.technologies.slice(0, 3) as tech}
                <ion-chip color="tertiary" size="small">
                  <ion-label>{tech}</ion-label>
                </ion-chip>
              {/each}
            {/if}
          </div>
          {#if subsystemDescription?.description}
            <p class="subsystem-intro">
              {subsystemDescription.description}
            </p>
          {:else}
            <p class="subsystem-intro fallback">
              {fallbackDescription}
            </p>
          {/if}
        </div>
        <div class="header-actions">
          <ion-button fill="outline" onclick={onViewRepository}>
            <ion-icon icon={logoGithub} slot="start"></ion-icon>
            View Repository
          </ion-button>
        </div>
      </div>
    </ion-card-content>
  </ion-card>
</div>

<style lang="scss">
  .header-section {
    margin-bottom: 20px;
  }

  .header-card {
    margin-bottom: 0;
  }

  .subsystem-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .header-info {
    flex: 1;
  }

  .subsystem-title {
    font-size: 2rem;
    font-weight: bold;
    color: var(--ion-color-primary);
    margin: 0 0 16px 0;

    @media (max-width: 768px) {
      font-size: 1.8rem;
    }
  }

  .subsystem-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .subsystem-intro {
    font-size: 1.1rem;
    line-height: 1.6;
    color: var(--ion-color-dark);
    margin: 0;

    &.fallback {
      color: var(--ion-color-medium);
      font-style: italic;
    }
  }

  .header-actions {
    flex-shrink: 0;

    @media (max-width: 768px) {
      align-self: flex-start;
    }
  }
</style>