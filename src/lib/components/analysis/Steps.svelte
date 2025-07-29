<script lang="ts">
  import { checkmarkCircle, ellipseOutline } from 'ionicons/icons';

  interface Props {
    title?: string;
    steps: string[];
    progress: number;
  }

  let { 
    title = "Analysis Steps:",
    steps,
    progress 
  }: Props = $props();
</script>

<div class="steps-section">
  <h3>{title}</h3>
  {#each steps as step, index}
    {@const stepProgress = ((index + 1) / steps.length) * 100}
    {@const isStepComplete = progress >= stepProgress}
    {@const isCurrentStep =
      progress > (index / steps.length) * 100 &&
      progress < stepProgress}

    <ion-item>
      {#if isStepComplete}
        <ion-icon icon={checkmarkCircle} slot="start" color="success"></ion-icon>
      {:else if isCurrentStep}
        <ion-spinner name="crescent" slot="start"></ion-spinner>
      {:else}
        <ion-icon icon={ellipseOutline} slot="start" color="medium"></ion-icon>
      {/if}
      <ion-label
        color={isStepComplete
          ? "success"
          : isCurrentStep
            ? "primary"
            : "medium"}
      >
        {step}
      </ion-label>
    </ion-item>
  {/each}
</div>

<style lang="scss">
  .steps-section h3 {
    margin: 20px 0 10px 0;
    font-size: 1.2rem;
    color: var(--ion-color-dark);
  }
</style>