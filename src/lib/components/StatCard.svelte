<script lang="ts">
  interface Props {
    stats: Array<{
      label: string;
      value: string | number;
    }>;
  }

  let { stats }: Props = $props();
</script>

<ion-card>
  <ion-card-content>
    {#each stats as stat}
      <div class="key-value">
        <span class="key">{stat.label}</span>

        <span class="value">{stat.value}</span>
      </div>
    {/each}
  </ion-card-content>
</ion-card>

<style lang="scss">
  ion-card-content {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .key-value {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
  }

  .key,
  .value {
    white-space: nowrap;
  }

  .value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--ion-color-primary);
  }

  .key {
    font-size: 0.9rem;
    color: var(--ion-color-medium);
    margin-top: 4px;
  }
</style>
