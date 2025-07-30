<script lang="ts">
  import { add, remove, refresh } from "ionicons/icons";

  interface Props {
    mermaidDiagram: string;
    diagramContainer?: HTMLElement;
    selectedView: string;
    onViewChange: (event: any) => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetZoom?: () => void;
  }

  let {
    mermaidDiagram,
    diagramContainer = $bindable(),
    selectedView,
    onViewChange,
    onZoomIn,
    onZoomOut,
    onResetZoom,
  }: Props = $props();

  let isDragging = $state(false);
  let dragStart = $state({ x: 0, y: 0 });
  let dragOffset = $state({ x: 0, y: 0 });
  let totalOffset = $state({ x: 0, y: 0 });

  function handleMouseDown(event: MouseEvent) {
    if (event.button !== 0) return;
    isDragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  }

  function handleMouseMove(event: MouseEvent) {
    if (!isDragging) return;

    dragOffset = {
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    };

    updateDragTransform();
  }

  function handleMouseUp() {
    if (!isDragging) return;

    totalOffset = {
      x: totalOffset.x + dragOffset.x,
      y: totalOffset.y + dragOffset.y,
    };

    isDragging = false;
    dragOffset = { x: 0, y: 0 };
  }

  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    isDragging = true;
    dragStart = { x: touch.clientX, y: touch.clientY };
    event.preventDefault();
  }

  function handleTouchMove(event: TouchEvent) {
    if (!isDragging || event.touches.length !== 1) return;

    const touch = event.touches[0];
    dragOffset = {
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    };

    updateDragTransform();
  }

  function handleTouchEnd() {
    if (!isDragging) return;

    totalOffset = {
      x: totalOffset.x + dragOffset.x,
      y: totalOffset.y + dragOffset.y,
    };

    isDragging = false;
    dragOffset = { x: 0, y: 0 };
  }

  function updateDragTransform() {
    if (!diagramContainer || !isDragging) return;

    const svg = diagramContainer.querySelector("svg");
    if (!svg) return;

    // Apply drag directly to the SVG element for smooth, linear movement
    const dragX = totalOffset.x + dragOffset.x;
    const dragY = totalOffset.y + dragOffset.y;

    svg.style.transform = `translate(${dragX}px, ${dragY}px)`;
    svg.style.transformOrigin = "0 0";
  }

  function resetDragPosition() {
    totalOffset = { x: 0, y: 0 };
    dragOffset = { x: 0, y: 0 };

    if (diagramContainer) {
      const svg = diagramContainer.querySelector("svg");
      if (svg) {
        svg.style.transform = "translate(0px, 0px)";
      }
    }
  }

  $effect(() => {
    function globalMouseMove(event: MouseEvent) {
      handleMouseMove(event);
    }

    function globalMouseUp() {
      handleMouseUp();
    }

    if (isDragging) {
      document.addEventListener("mousemove", globalMouseMove);
      document.addEventListener("mouseup", globalMouseUp);

      return () => {
        document.removeEventListener("mousemove", globalMouseMove);
        document.removeEventListener("mouseup", globalMouseUp);
      };
    }
  });
</script>

<ion-card class="graph-card">
  <ion-card-header>
    <div class="header-content">
      <ion-segment value={selectedView} onionChange={onViewChange}>
        <ion-segment-button value="subsystems">
          <ion-label>Subsystem Overview</ion-label>
        </ion-segment-button>

        <ion-segment-button value="dependencies">
          <ion-label>Dependency Flow</ion-label>
        </ion-segment-button>
      </ion-segment>
    </div>
  </ion-card-header>

  <div class="diagram-wrapper">
    <div
      class="diagram-container"
      class:dragging={isDragging}
      bind:this={diagramContainer}
      onmousedown={handleMouseDown}
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
      ontouchcancel={handleTouchEnd}
    >
      {#if !mermaidDiagram}
        <div class="diagram-placeholder">
          <ion-spinner name="dots"></ion-spinner>
          <p>Generating architecture diagram...</p>
        </div>
      {/if}
    </div>

    <div class="zoom-controls">
      <ion-button
        size="small"
        fill="outline"
        onclick={onZoomOut}
        disabled={!onZoomOut}
        title="Zoom Out"
      >
        <ion-icon icon={remove} slot="icon-only"></ion-icon>
      </ion-button>
      <ion-button
        size="small"
        fill="outline"
        onclick={() => {
          onResetZoom?.();
          resetDragPosition();
        }}
        disabled={!onResetZoom}
        title="Reset Zoom"
      >
        <ion-icon icon={refresh} slot="icon-only"></ion-icon>
      </ion-button>
      <ion-button
        size="small"
        fill="outline"
        onclick={onZoomIn}
        disabled={!onZoomIn}
        title="Zoom In"
      >
        <ion-icon icon={add} slot="icon-only"></ion-icon>
      </ion-button>
    </div>
  </div>
</ion-card>

<style lang="scss">
  .graph-card {
    margin-bottom: 20px;
  }

  .header-content {
    display: flex;
    justify-content: center;
    align-items: center;

    @media (max-width: 768px) {
      justify-content: center;
    }
  }

  .diagram-wrapper {
    position: relative;
  }

  .zoom-controls {
    position: absolute;
    bottom: 16px;
    right: 16px;
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    z-index: 100;
    background: rgba(255, 255, 255, 0.95);
    padding: 8px;
    border-radius: 8px;

    @media (max-width: 768px) {
      bottom: 12px;
      right: 12px;
      padding: 6px;
      gap: 2px;
    }
  }

  .diagram-container {
    padding: 20px;
    min-height: 200px; // Minimal height for loading state
    overflow: visible; // Allow zoomed diagram to show beyond container
    position: relative;
    cursor: grab;
    user-select: none;

    &.dragging {
      cursor: grabbing;
    }

    :global(svg) {
      width: auto; // Allow SVG to size naturally when zoomed
      height: auto;
      min-width: 100%; // Ensure it fills container when not zoomed
      max-width: none; // Allow SVG to grow larger than container
      transition: transform 0.2s ease;
      pointer-events: none; // Prevent SVG from interfering with drag events
      transform-origin: center center; // Ensure zoom centers properly
    }

    &.dragging :global(svg) {
      transition: none; // Disable transition during drag for smoother movement
    }

    :global(g) {
      transition: transform 0.2s ease;
    }

    @media (max-width: 768px) {
      padding: 12px;
      min-height: 150px;
    }
  }

  .diagram-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 160px;
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
