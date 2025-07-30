<script lang="ts">
  import {
    informationCircleOutline,
    arrowForwardCircleOutline,
    openOutline,
    chevronUp,
    chevronDown,
  } from "ionicons/icons";
  import type { SubsystemDescription } from "$types/analysis";

  interface Props {
    title?: string;
    subsystemDescription?: SubsystemDescription | null;
    architectureRole: string;
    expanded: boolean;
    onToggle: () => void;
    onCreateGitHubLink: (filePath: string) => string;
  }

  let {
    title = "Overview & Architecture Role",
    subsystemDescription,
    architectureRole,
    expanded,
    onToggle,
    onCreateGitHubLink,
  }: Props = $props();
</script>

<ion-card class="section-card">
  <ion-card-header>
    <div class="section-header" onclick={onToggle}>
      <ion-card-title>
        <ion-icon icon={informationCircleOutline}></ion-icon>
        {title}
      </ion-card-title>

      <ion-icon icon={expanded ? chevronUp : chevronDown}></ion-icon>
    </div>
  </ion-card-header>

  {#if expanded}
    <ion-card-content>
      {#if subsystemDescription}
        <div class="overview-content">
          <div class="overview-item">
            <h4>Purpose</h4>
            <p>{subsystemDescription.purpose}</p>
          </div>

          {#if architectureRole}
            <div class="overview-item">
              <h4>Architecture Role</h4>
              <p>{architectureRole}</p>
            </div>
          {/if}

          {#if subsystemDescription.entryPoints.length > 0}
            <div class="overview-item">
              <h4>Entry Points</h4>
              <div class="entry-points">
                {#each subsystemDescription.entryPoints as entryPoint}
                  <ion-chip color="success" class="entry-chip">
                    <ion-icon icon={arrowForwardCircleOutline}></ion-icon>
                    <ion-label>{entryPoint}</ion-label>
                    <a
                      href={onCreateGitHubLink(entryPoint)}
                      target="_blank"
                      rel="noopener"
                      aria-label="View {entryPoint} on GitHub"
                    >
                      <ion-icon icon={openOutline}></ion-icon>
                    </a>
                  </ion-chip>
                {/each}
              </div>
            </div>
          {/if}

          {#if subsystemDescription.dependencies.length > 0}
            <div class="overview-item">
              <h4>Key Dependencies</h4>
              <div class="dependencies">
                {#each subsystemDescription.dependencies as dep}
                  <ion-chip size="small" color="medium">
                    <ion-label>{dep}</ion-label>
                  </ion-chip>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <div class="loading-content">
          <p class="fallback-content">
            Analyzing subsystem structure and dependencies...
          </p>
          <ion-skeleton-text animated style="width: 100%; margin-top: 16px;"></ion-skeleton-text>
          <ion-skeleton-text animated style="width: 90%; margin-top: 8px;"></ion-skeleton-text>
          <ion-skeleton-text animated style="width: 70%; margin-top: 8px;"></ion-skeleton-text>
        </div>
      {/if}
    </ion-card-content>
  {/if}
</ion-card>

<style lang="scss">
  .section-card {
    margin-bottom: 20px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
    }

    &:hover {
      opacity: 0.8;
    }
  }

  .overview-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .overview-item {
    h4 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin: 0 0 8px 0;
    }

    p {
      line-height: 1.6;
      color: var(--ion-color-dark);
      margin: 0;
    }
  }

  .entry-points,
  .dependencies {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .entry-chip {
    --background: var(--ion-color-success-tint);
    --color: var(--ion-color-success);

    a {
      margin-left: 8px;
      text-decoration: none;
      color: inherit;
      display: flex;
      align-items: center;

      &:hover {
        opacity: 0.7;
      }
    }
  }

  .fallback-content {
    color: var(--ion-color-medium);
    font-style: italic;
  }
</style>
