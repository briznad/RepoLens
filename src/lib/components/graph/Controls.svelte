<script lang="ts">
  import { download, eye, eyeOff, refresh } from 'ionicons/icons';

  interface View {
    value: string;
    label: string;
  }

  interface Props {
    title?: string;
    subtitle: string;
    views: View[];
    selectedView: string;
    showLegend: boolean;
    onViewChange: (event: any) => void;
    onDownload: () => void;
    onToggleLegend: () => void;
    onRefresh: () => void;
  }

  let { 
    title = "Repository Architecture",
    subtitle,
    views,
    selectedView,
    showLegend,
    onViewChange,
    onDownload,
    onToggleLegend,
    onRefresh
  }: Props = $props();
</script>

<ion-card class="controls-card">
  <ion-card-header>
    <ion-card-title>{title}</ion-card-title>
    <ion-card-subtitle>{subtitle}</ion-card-subtitle>
  </ion-card-header>

  <ion-card-content>
    <ion-item>
      <ion-select
        label="View Type"
        label-placement="stacked"
        value={selectedView}
        onionChange={onViewChange}
      >
        {#each views as view}
          <ion-select-option value={view.value}>
            {view.label}
          </ion-select-option>
        {/each}
      </ion-select>
    </ion-item>

    <div class="control-buttons">
      <ion-button size="small" fill="outline" onclick={onDownload}>
        <ion-icon icon={download} slot="start"></ion-icon>
        Export PNG
      </ion-button>
      <ion-button size="small" fill="outline" onclick={onToggleLegend}>
        <ion-icon icon={showLegend ? eyeOff : eye} slot="start"></ion-icon>
        {showLegend ? "Hide" : "Show"} Legend
      </ion-button>
      <ion-button size="small" fill="outline" onclick={onRefresh}>
        <ion-icon icon={refresh} slot="start"></ion-icon>
        Refresh
      </ion-button>
    </div>
  </ion-card-content>
</ion-card>

<style lang="scss">
  .controls-card {
    margin-bottom: 20px;
  }

  .control-buttons {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    flex-wrap: wrap;

    @media (max-width: 768px) {
      justify-content: center;
    }
  }
</style>