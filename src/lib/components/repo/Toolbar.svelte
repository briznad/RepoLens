<script lang="ts">
  import {
    logoGithub,
    warningOutline,
    syncOutline,
    refreshOutline,
  } from "ionicons/icons";
  import type { FirestoreRepo } from "$types/repository";

  interface Props {
    repo: FirestoreRepo;
    analysisStale: boolean;
    refreshing?: boolean;
    onRefreshAnalysis?: () => void;
  }

  let {
    repo,
    analysisStale,
    refreshing = false,
    onRefreshAnalysis = () => {},
  }: Props = $props();
</script>

<ion-toolbar>
  <ion-buttons slot="start">
    <ion-menu-button></ion-menu-button>
  </ion-buttons>

  <ion-title>
    <div class="header-title">
      <span class="repo-name">{repo.fullName}</span>
      <div class="header-meta">
        {#if analysisStale}
          <ion-chip color="warning" size="small">
            <ion-icon icon={warningOutline}></ion-icon>
            <ion-label>Analysis may be outdated</ion-label>
          </ion-chip>
        {/if}
        {#if repo.analysisStatus === "analyzing"}
          <ion-chip color="primary" size="small">
            <ion-icon icon={syncOutline}></ion-icon>
            <ion-label>Analysis in progress</ion-label>
          </ion-chip>
        {/if}
      </div>
    </div>
  </ion-title>

  <ion-buttons slot="end">
    <ion-button
      fill="clear"
      href={repo.url}
      target="_blank"
      title="View on GitHub"
    >
      <ion-icon icon={logoGithub} slot="icon-only"></ion-icon>
    </ion-button>

    {#if analysisStale && repo.analysisStatus !== "analyzing"}
      <ion-button
        fill="clear"
        color="warning"
        onclick={onRefreshAnalysis}
        title="Refresh Analysis"
        disabled={refreshing}
      >
        <ion-icon icon={refreshOutline} slot="icon-only"></ion-icon>
      </ion-button>
    {/if}
  </ion-buttons>
</ion-toolbar>

<style lang="scss">
  .header-title {
    display: flex;
    align-items: center;
    gap: 0.5em;

    .repo-name {
      font-size: 1.1rem;
      font-weight: 600;
    }

    .header-meta {
      display: flex;
      gap: 4px;
      margin-top: 2px;
    }

    @media (max-width: 768px) {
      .repo-name {
        font-size: 0.95rem;
      }

      .header-meta {
        ion-chip {
          font-size: 0.7rem;
          height: 20px;
        }
      }
    }
  }
</style>
