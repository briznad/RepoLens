<script lang="ts">
  import { alertCircle, arrowBackOutline, refreshOutline } from 'ionicons/icons';

  interface Props {
    title?: string;
    error: string;
    onGoHome: () => void;
    onRetry?: () => void;
    showRetry?: boolean;
  }

  let { 
    title = "Analysis Failed",
    error,
    onGoHome,
    onRetry,
    showRetry = false
  }: Props = $props();
</script>

<div class="error-section">
  <ion-icon icon={alertCircle} color="danger" class="error-icon"></ion-icon>
  <h3 class="error-title">{title}</h3>
  <p class="error-message">{error}</p>
  <div class="error-actions">
    <ion-button
      fill="outline"
      color="primary"
      onclick={onGoHome}
      class="retry-button"
    >
      <ion-icon icon={arrowBackOutline} slot="start"></ion-icon>
      Try Another Repository
    </ion-button>
    {#if showRetry && onRetry}
      <ion-button
        fill="clear"
        color="medium"
        onclick={onRetry}
        class="retry-button"
      >
        <ion-icon icon={refreshOutline} slot="start"></ion-icon>
        Retry Analysis
      </ion-button>
    {/if}
  </div>
</div>

<style lang="scss">
  .error-section {
    text-align: center;
    padding: 20px;
  }

  .error-icon {
    font-size: 4rem;
    margin-bottom: 20px;
  }

  .error-title {
    color: var(--ion-color-danger);
    margin-bottom: 16px;
    font-size: 1.5rem;
  }

  .error-message {
    color: var(--ion-color-medium);
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .error-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 16px;
  }

  .retry-button {
    margin-top: 8px;
  }
</style>