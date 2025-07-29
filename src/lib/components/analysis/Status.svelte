<script lang="ts">
  import { checkmarkCircle } from 'ionicons/icons';

  interface Props {
    analysisStep: string;
    isComplete: boolean;
  }

  let { analysisStep, isComplete }: Props = $props();
</script>

<div class="status-section">
  <ion-item>
    {#if isComplete}
      <ion-icon icon={checkmarkCircle} color="success" slot="start"></ion-icon>
    {:else}
      <ion-spinner name="crescent" slot="start"></ion-spinner>
    {/if}
    <ion-label>{analysisStep}</ion-label>
  </ion-item>
</div>

<style lang="scss">
  .status-section {
    margin-bottom: 30px;
  }
</style>