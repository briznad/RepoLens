<script lang="ts">
  import { sparklesOutline } from 'ionicons/icons';

  interface Props {
    title?: string;
    description: string;
    isGenerating: boolean;
    loadingMessage?: string;
  }

  let { 
    title = "Architecture Analysis",
    description,
    isGenerating,
    loadingMessage = "Generating AI-powered architecture description..."
  }: Props = $props();
</script>

{#if description || isGenerating}
  <ion-card class="description-card">
    <ion-card-header>
      <ion-card-title>
        <ion-icon icon={sparklesOutline}></ion-icon>
        {title}
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      {#if isGenerating}
        <div class="generating-description">
          <ion-spinner name="dots"></ion-spinner>
          <p>{loadingMessage}</p>
        </div>
      {:else}
        <div class="architecture-description">
          {description}
        </div>
      {/if}
    </ion-card-content>
  </ion-card>
{/if}

<style lang="scss">
  .description-card {
    margin-bottom: 20px;

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .generating-description {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--ion-color-medium);

    p {
      margin: 0;
    }
  }

  .architecture-description {
    line-height: 1.6;
    white-space: pre-wrap;

    :global(strong) {
      font-weight: 600;
      color: var(--ion-color-dark);
    }
  }
</style>