<script lang="ts">
  import { libraryOutline, bookOutline } from 'ionicons/icons';

  interface Props {
    title?: string;
    description?: string;
    subsystemCount: number;
    onNavigate: () => void;
  }

  let { 
    title = "Repository Documentation",
    description,
    subsystemCount,
    onNavigate
  }: Props = $props();

  const defaultDescription = `Comprehensive documentation for ${subsystemCount} subsystems`;
</script>

<ion-card class="docs-shortcut-card">
  <ion-card-content>
    <div class="docs-shortcut">
      <div class="docs-info">
        <ion-icon icon={libraryOutline} class="docs-icon"></ion-icon>
        <div>
          <h4>{title}</h4>
          <p>{description || defaultDescription}</p>
        </div>
      </div>
      <ion-button fill="outline" onclick={onNavigate}>
        <ion-icon icon={bookOutline} slot="start"></ion-icon>
        View Docs
      </ion-button>
    </div>
  </ion-card-content>
</ion-card>

<style lang="scss">
  .docs-shortcut-card {
    margin-bottom: 24px;
    --background: linear-gradient(
      135deg,
      var(--ion-color-primary-tint),
      var(--ion-color-secondary-tint)
    );
    border: none;
  }

  .docs-shortcut {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;

    @media (max-width: 600px) {
      flex-direction: column;
      align-items: stretch;
      text-align: center;
    }
  }

  .docs-info {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;

    @media (max-width: 600px) {
      flex-direction: column;
      gap: 8px;
    }

    .docs-icon {
      font-size: 2rem;
      color: var(--ion-color-primary);
      flex-shrink: 0;
    }

    h4 {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin: 0 0 4px 0;
    }

    p {
      font-size: 0.9rem;
      color: var(--ion-color-medium);
      margin: 0;
    }
  }
</style>