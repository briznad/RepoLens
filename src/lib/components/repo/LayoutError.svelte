<script lang="ts">
  import { warningOutline, home, refresh } from 'ionicons/icons';

  interface Props {
    title?: string;
    error: string;
    onReturnHome?: () => void;
    onRetry?: () => void;
  }

  let { 
    title = "Repository Error",
    error,
    onReturnHome = () => window.location.href = "/",
    onRetry = () => window.location.reload()
  }: Props = $props();
</script>

<div class="error-layout">
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
            <ion-button fill="outline" onclick={onReturnHome}>
              <ion-icon icon={home} slot="start"></ion-icon>
              Return Home
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
</div>

<style lang="scss">
  .error-layout {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .error-container {
    max-width: 500px;
    width: 100%;
  }

  .error-card {
    text-align: center;

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