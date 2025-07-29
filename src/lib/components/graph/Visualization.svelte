<script lang="ts">
  interface Props {
    diagramContainer: HTMLElement;
    mermaidDiagram: string;
  }

  let { diagramContainer, mermaidDiagram }: Props = $props();
</script>

<ion-card class="graph-card">
  <div class="diagram-container" bind:this={diagramContainer}>
    {#if !mermaidDiagram}
      <div class="diagram-placeholder">
        <ion-spinner name="dots"></ion-spinner>
        <p>Generating architecture diagram...</p>
      </div>
    {/if}
  </div>
</ion-card>

<style lang="scss">
  .graph-card {
    margin-bottom: 20px;
    min-height: 500px;
  }

  .diagram-container {
    min-height: 500px;
    padding: 20px;

    :global(svg) {
      width: 100%;
      height: auto;
      max-width: 100%;
    }

    @media (max-width: 768px) {
      padding: 12px;
      min-height: 400px;
    }
  }

  .diagram-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 460px;
    text-align: center;
    color: var(--ion-color-medium);

    ion-spinner {
      margin-bottom: 16px;
    }

    p {
      margin: 0;
      font-size: 1rem;
    }
  }
</style>