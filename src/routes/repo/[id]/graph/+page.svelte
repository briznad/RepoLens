<script lang="ts">
  import { page } from '$app/stores';
  
  const repoId = $derived($page.params.id);
  
  let selectedView = $state('architecture');
  
  const views = [
    { value: 'architecture', label: 'Architecture Overview' },
    { value: 'dependencies', label: 'Dependencies' },
    { value: 'modules', label: 'Module Structure' },
    { value: 'files', label: 'File Relationships' }
  ];
  
  const handleViewChange = (event: CustomEvent) => {
    selectedView = event.detail.value;
  };
</script>

<ion-content class="ion-padding">
  <div class="graph-container">
    <!-- Header Controls -->
    <ion-card class="controls-card">
      <ion-card-header>
        <ion-card-title>Repository Architecture</ion-card-title>
        <ion-card-subtitle>Visual representation of code structure</ion-card-subtitle>
      </ion-card-header>
      
      <ion-card-content>
        <ion-item>
          <ion-select
            label="View Type"
            label-placement="stacked"
            value={selectedView}
            onionChange={handleViewChange}
          >
            {#each views as view}
              <ion-select-option value={view.value}>{view.label}</ion-select-option>
            {/each}
          </ion-select>
        </ion-item>
        
        <div class="control-buttons">
          <ion-button size="small" fill="outline">
            <ion-icon name="download" slot="start"></ion-icon>
            Export
          </ion-button>
          <ion-button size="small" fill="outline">
            <ion-icon name="expand" slot="start"></ion-icon>
            Fullscreen
          </ion-button>
          <ion-button size="small" fill="outline">
            <ion-icon name="refresh" slot="start"></ion-icon>
            Refresh
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
    
    <!-- Graph Visualization Area -->
    <ion-card class="graph-card">
      <div class="graph-placeholder">
        <div class="placeholder-content">
          <ion-icon name="git-network" size="large"></ion-icon>
          <h3>{views.find(v => v.value === selectedView)?.label}</h3>
          <p>Graph visualization will be rendered here</p>
          <p class="graph-info">
            Current view: <strong>{selectedView}</strong><br>
            Repository: <strong>{repoId}</strong>
          </p>
        </div>
      </div>
    </ion-card>
    
    <!-- Legend and Information -->
    <ion-card class="legend-card">
      <ion-card-header>
        <ion-card-title>Legend</ion-card-title>
      </ion-card-header>
      
      <ion-card-content>
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-color" style="background-color: var(--ion-color-primary);"></div>
            <span>Core Components</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background-color: var(--ion-color-secondary);"></div>
            <span>Utilities</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background-color: var(--ion-color-tertiary);"></div>
            <span>External Dependencies</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background-color: var(--ion-color-success);"></div>
            <span>Configuration</span>
          </div>
        </div>
      </ion-card-content>
    </ion-card>
  </div>
</ion-content>

<style lang="scss">
  .graph-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .controls-card {
    margin-bottom: 20px;
  }

  .control-buttons {
    display: flex;
    gap: 8px;
    margin-top: 16px;
    flex-wrap: wrap;
  }

  .graph-card {
    margin-bottom: 20px;
    min-height: 500px;
  }

  .graph-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 500px;
    background: linear-gradient(45deg, 
      var(--ion-color-light-tint) 0%, 
      var(--ion-color-light) 100%);
    border-radius: 8px;
  }

  .placeholder-content {
    text-align: center;
    color: var(--ion-color-medium);
    
    ion-icon {
      margin-bottom: 20px;
      color: var(--ion-color-primary);
    }
    
    h3 {
      margin: 0 0 10px 0;
      color: var(--ion-color-dark);
    }
    
    p {
      margin: 5px 0;
    }
    
    .graph-info {
      margin-top: 20px;
      font-size: 0.9rem;
      line-height: 1.5;
    }
  }

  .legend-card {
    margin-bottom: 20px;
  }

  .legend-items {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
  }

  .legend-color {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--ion-color-light-shade);
  }
</style>