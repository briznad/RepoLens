<script lang="ts">
  interface LegendItem {
    icon: string;
    description: string;
  }

  interface Props {
    title?: string;
    note?: string;
    items?: LegendItem[];
  }

  const defaultItems: LegendItem[] = [
    { icon: "🚪", description: "Entry Points - Routes, Pages, Endpoints" },
    { icon: "🎨", description: "UI Components - Views, Templates" },
    { icon: "⚙️", description: "Services - APIs, Stores, Business Logic" },
    { icon: "📁", description: "Other Subsystems - Utils, Config, Tests" }
  ];

  let { 
    title = "Diagram Legend",
    note = "Click on any subsystem node to view its detailed documentation.",
    items = defaultItems
  }: Props = $props();
</script>

<ion-card class="legend-card">
  <ion-card-header>
    <ion-card-title>{title}</ion-card-title>
  </ion-card-header>

  <ion-card-content>
    <div class="legend-items">
      {#each items as item}
        <div class="legend-item">
          <div class="legend-icon">{item.icon}</div>
          <span>{item.description}</span>
        </div>
      {/each}
    </div>
    {#if note}
      <p class="legend-note">{note}</p>
    {/if}
  </ion-card-content>
</ion-card>

<style lang="scss">
  .legend-card {
    margin-bottom: 20px;
  }

  .legend-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;

    @media (max-width: 768px) {
      gap: 8px;
    }
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.95rem;

    .legend-icon {
      font-size: 1.2rem;
      width: 24px;
      text-align: center;
      flex-shrink: 0;
    }

    span {
      color: var(--ion-color-dark);
    }
  }

  .legend-note {
    font-size: 0.85rem;
    color: var(--ion-color-medium);
    font-style: italic;
    margin: 0;
    padding-top: 12px;
    border-top: 1px solid var(--ion-color-light);
  }
</style>