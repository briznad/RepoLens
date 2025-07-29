<script lang="ts">
  interface Props {
    isGenerating: boolean;
    message?: string;
  }

  let { 
    isGenerating,
    message = "Generating enhanced documentation with AI..."
  }: Props = $props();
</script>

{#if isGenerating}
  <ion-card class="ai-status-card">
    <ion-card-content>
      <div class="ai-status">
        <ion-spinner name="crescent"></ion-spinner>
        <span>{message}</span>
      </div>
    </ion-card-content>
  </ion-card>
{/if}

<style lang="scss">
  .ai-status-card {
    margin-bottom: 20px;
    --background: var(--ion-color-light-tint);
  }

  .ai-status {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--ion-color-medium);
    font-size: 0.95rem;

    ion-spinner {
      --color: var(--ion-color-primary);
    }
  }
</style>