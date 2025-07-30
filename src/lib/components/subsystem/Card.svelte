<script lang="ts">
  import type { Subsystem, SubsystemDescription } from "$types/analysis";
  import { arrowForwardOutline } from "ionicons/icons";

  interface Props {
    subsystem: Subsystem & { description?: SubsystemDescription };
    onSubsystemClick: (name: string) => void;
  }

  let { subsystem, onSubsystemClick }: Props = $props();

  function handleClick() {
    onSubsystemClick(subsystem.name);
  }
</script>

<ion-card class="subsystem-card" button onclick={handleClick}>
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
                <ion-label>{keyFile.split("/").pop()}</ion-label>
              </ion-chip>
            {/each}
            {#if subsystem.description.keyFiles.length > 3}
              <ion-chip size="small" color="light">
                <ion-label
                  >+{subsystem.description.keyFiles.length - 3} more</ion-label
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
                <ion-label>{file.path.split("/").pop()}</ion-label>
              </ion-chip>
            {/each}
            {#if subsystem.files.length > 3}
              <ion-chip size="small" color="light">
                <ion-label>+{subsystem.files.length - 3} more</ion-label>
              </ion-chip>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <div class="subsystem-footer">
      <ion-button fill="clear" size="small" class="view-details-btn">
        <ion-label>View Details</ion-label>
        <ion-icon icon={arrowForwardOutline} slot="end"></ion-icon>
      </ion-button>
    </div>
  </ion-card-content>
</ion-card>

<style lang="scss">
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

  .key-files {
    margin-bottom: 16px;

    h4 {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin: 0 0 8px 0;
    }
  }

  .file-chips {
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
</style>
