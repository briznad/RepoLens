<script lang="ts">
  import { checkmarkCircle } from 'ionicons/icons';

  interface Props {
    progress: number;
    isComplete: boolean;
  }

  let { progress, isComplete }: Props = $props();
</script>

<div class="progress-section">
  <ion-progress-bar
    value={progress / 100}
    color={isComplete ? "success" : "primary"}
  ></ion-progress-bar>
  <p class="progress-text">
    {Math.round(progress)}% Complete
    {#if isComplete}
      <ion-icon
        icon={checkmarkCircle}
        color="success"
        class="complete-icon"
      ></ion-icon>
    {/if}
  </p>
</div>

<style lang="scss">
  .progress-section {
    margin-bottom: 30px;
  }

  .progress-text {
    text-align: center;
    margin-top: 10px;
    font-weight: 500;
  }

  .complete-icon {
    margin-left: 8px;
    font-size: 1.2rem;
  }
</style>