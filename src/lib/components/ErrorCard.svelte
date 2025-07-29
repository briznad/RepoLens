<script lang="ts">
  import { warningOutline } from 'ionicons/icons';

  interface Props {
    title?: string;
    message: string;
    actions?: Array<{
      label: string;
      icon: any; // Icon object from ionicons/icons
      handler: () => void;
      fill?: 'solid' | 'outline' | 'clear';
    }>;
  }

  let { title = 'Error', message, actions = [] }: Props = $props();
</script>

<ion-card class="error-card">
  <ion-card-header>
    <ion-card-title color="danger">
      <ion-icon icon={warningOutline}></ion-icon>
      {title}
    </ion-card-title>
  </ion-card-header>
  <ion-card-content>
    <p>{message}</p>
    {#if actions.length > 0}
      <div class="error-actions">
        {#each actions as action}
          <ion-button fill={action.fill || 'outline'} onclick={action.handler}>
            <ion-icon icon={action.icon} slot="start"></ion-icon>
            {action.label}
          </ion-button>
        {/each}
      </div>
    {/if}
  </ion-card-content>
</ion-card>

<style lang="scss">
  .error-card {
    max-width: 500px;
    margin: 40px auto;
    text-align: center;

    ion-card-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    p {
      margin: 0 0 16px 0;
      color: var(--ion-color-dark);
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
  }
</style>