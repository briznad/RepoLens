<script lang="ts">
  import { analyticsOutline } from 'ionicons/icons';

  interface Props {
    title: string;
    stats: Array<{
      label: string;
      value: string | number;
      icon?: string;
    }>;
  }

  let { title, stats }: Props = $props();
</script>

<ion-card class="overview-card">
  <ion-card-header>
    <ion-card-title>
      <ion-icon icon={analyticsOutline}></ion-icon>
      {title}
    </ion-card-title>
  </ion-card-header>
  <ion-card-content>
    <ion-grid>
      <ion-row>
        {#each stats as stat}
          <ion-col size="12" size-md={String(Math.floor(12 / Math.min(stats.length, 4)))}>
            <div class="stat-item">
              {#if stat.icon}
                <ion-icon name={stat.icon} class="stat-icon"></ion-icon>
              {/if}
              <div class="stat-number">{stat.value}</div>
              <div class="stat-label">{stat.label}</div>
            </div>
          </ion-col>
        {/each}
      </ion-row>
    </ion-grid>
  </ion-card-content>
</ion-card>

<style lang="scss">
  .overview-card {
    margin-bottom: 24px;

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  }

  .stat-item {
    text-align: center;
    padding: 16px;
    
    .stat-icon {
      font-size: 1.5rem;
      color: var(--ion-color-primary);
      margin-bottom: 8px;
    }
    
    .stat-number {
      font-size: 2rem;
      font-weight: bold;
      color: var(--ion-color-primary);
    }
    
    .stat-label {
      font-size: 0.9rem;
      color: var(--ion-color-medium);
      margin-top: 4px;
    }
  }
</style>