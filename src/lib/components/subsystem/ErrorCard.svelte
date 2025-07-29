<script lang="ts">
  import { arrowBack, home } from 'ionicons/icons';

  interface Props {
    title?: string;
    error: string;
    repoId: string;
    onBackToDocs?: () => void;
    onReturnHome?: () => void;
  }

  let { 
    title = "Error",
    error,
    repoId,
    onBackToDocs = () => window.location.href = `/repo/${repoId}/docs`,
    onReturnHome = () => window.location.href = "/"
  }: Props = $props();
</script>

<ion-card class="error-card">
  <ion-card-header>
    <ion-card-title color="danger">{title}</ion-card-title>
  </ion-card-header>
  <ion-card-content>
    <p>{error}</p>
    <div class="error-actions">
      <ion-button fill="outline" onclick={onBackToDocs}>
        <ion-icon icon={arrowBack} slot="start"></ion-icon>
        Back to Docs
      </ion-button>
      <ion-button fill="outline" onclick={onReturnHome}>
        <ion-icon icon={home} slot="start"></ion-icon>
        Return Home
      </ion-button>
    </div>
  </ion-card-content>
</ion-card>

<style lang="scss">
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