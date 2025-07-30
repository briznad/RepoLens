<script lang="ts">
  import type { Subsystem, SubsystemDescription } from "$types/analysis";
  import SubsystemCard from "./Card.svelte";
  import { folderOpenOutline } from "ionicons/icons";

  interface Props {
    subsystems: Array<Subsystem & { description?: SubsystemDescription }>;
    searchQuery: string;
    onSubsystemClick: (name: string) => void;
    onClearSearch: () => void;
  }

  let { subsystems, searchQuery, onSubsystemClick, onClearSearch }: Props =
    $props();
</script>

<div class="subsystems-section">
  {#if subsystems.length === 0}
    <ion-card class="empty-state-card">
      <ion-card-content>
        <div class="empty-state">
          <ion-icon icon={folderOpenOutline} class="empty-icon"></ion-icon>
          <h3>No subsystems found</h3>
          <p>
            {searchQuery
              ? "Try adjusting your search criteria."
              : "This repository doesn't have clearly defined subsystems."}
          </p>
          {#if searchQuery}
            <ion-button fill="outline" onclick={onClearSearch}>
              Clear Search
            </ion-button>
          {/if}
        </div>
      </ion-card-content>
    </ion-card>
  {:else}
    <ion-grid class="subsystems-grid">
      <ion-row>
        {#each subsystems as subsystem}
          <ion-col size="12" size-md="6" size-lg="4">
            <SubsystemCard {subsystem} {onSubsystemClick} />
          </ion-col>
        {/each}
      </ion-row>
    </ion-grid>
  {/if}
</div>

<style lang="scss">
  .subsystems-section {
    margin-bottom: 32px;
  }

  .subsystems-grid {
    --ion-grid-padding: 0;
  }

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
</style>
