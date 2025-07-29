<script lang="ts">
  import { warningOutline, libraryOutline, refresh } from 'ionicons/icons';

  interface Props {
    title?: string;
    error: string;
    repoId: string;
    onRetry?: () => void;
  }

  let { 
    title = "Chat Unavailable",
    error,
    repoId,
    onRetry = () => window.location.reload()
  }: Props = $props();

  function navigateToDocs() {
    window.location.href = `/repo/${repoId}/docs`;
  }
</script>

<ion-content class="ion-padding">
  <div class="error-container">
    <ion-card class="error-card">
      <ion-card-header>
        <ion-card-title color="danger">
          <ion-icon icon={warningOutline}></ion-icon>
          {title}
        </ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>{error}</p>
        <div class="error-actions">
          <ion-button fill="outline" onclick={navigateToDocs}>
            <ion-icon icon={libraryOutline} slot="start"></ion-icon>
            View Documentation
          </ion-button>
          <ion-button fill="solid" onclick={onRetry}>
            <ion-icon icon={refresh} slot="start"></ion-icon>
            Retry
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  </div>
</ion-content>

<style lang="scss">
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;

    p {
      color: var(--ion-color-medium);
      font-size: 1rem;
      margin-top: 16px;
    }
  }

  .error-card {
    max-width: 500px;
    width: 100%;

    ion-card-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
  }

  .error-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 16px;

    @media (max-width: 480px) {
      flex-direction: column;
    }
  }
</style>