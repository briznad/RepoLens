<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getRepoById } from "$lib/services/repository";
  import { makeOpenAIRequest } from "$services/ai-analyzer";
  import type { FirestoreRepo } from "$types/repository";
  import type { AnalysisResult, Subsystem, SubsystemReference, Framework } from "$types/analysis";
  import GraphLoadingState from '$components/graph/LoadingState.svelte';
  import GraphErrorCard from '$components/graph/ErrorCard.svelte';
  import GraphControls from '$components/graph/Controls.svelte';
  import DiagramVisualization from '$components/graph/Visualization.svelte';
  import ArchitectureDescription from '$components/ArchitectureDescription.svelte';
  import DiagramLegend from '$components/graph/Legend.svelte';

  const repoId = $derived($page.params.id);

  // State management
  let repo = $state<FirestoreRepo | null>(null);
  let analysis = $state<AnalysisResult | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Diagram state
  let diagramContainer = $state<HTMLElement>();
  let mermaidDiagram = $state("");
  let diagramRendered = $state(false);
  let architectureDescription = $state("");
  let generatingDescription = $state(false);

  // UI state
  let showLegend = $state(true);
  let diagramType = $state<"subsystems" | "dependencies">("subsystems");

  // View configuration
  const views = [
    { value: "subsystems", label: "Subsystem Overview" },
    { value: "dependencies", label: "Dependency Flow" },
  ];
  let selectedView = $state<string>("subsystems");

  // Load repository data
  onMount(async () => {
    if (!repoId) {
      error = "Repository ID not found";
      loading = false;
      return;
    }

    try {
      const repoData = await getRepoById(repoId);
      if (!repoData) {
        error = "Repository not found";
        loading = false;
        return;
      }

      repo = repoData;
      analysis = repoData.analysisData || null;

      if (!analysis) {
        error = "Repository analysis not available";
        loading = false;
        return;
      }

      // Generate diagram
      generateDiagram();

      // Generate AI description
      generateArchitectureDescription();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load repository";
    } finally {
      loading = false;
    }
  });

  // Watch for diagram changes and render
  $effect(() => {
    if (mermaidDiagram && diagramContainer && !diagramRendered) {
      renderMermaidDiagram();
    }
  });

  // Generate Mermaid diagram
  function generateDiagram() {
    if (!analysis) return;

    if (diagramType === "subsystems") {
      generateSubsystemDiagram();
    } else {
      generateDependencyDiagram();
    }
  }

  // Generate basic subsystem overview diagram
  function generateSubsystemDiagram() {
    if (!analysis) return;

    const subsystems = analysis.subsystems;
    const framework = analysis.framework;

    let diagram = "graph TD\n";

    // Add nodes for each subsystem
    subsystems.forEach((subsystem, index) => {
      const nodeId = `S${index}`;
      const label = subsystem.name.replace(/[^a-zA-Z0-9]/g, "");
      const fileCount = subsystem.files.length;

      // Different styling based on subsystem type
      if (isEntryPointSubsystem(subsystem, framework)) {
        diagram += `  ${nodeId}["🚪 ${subsystem.name}<br/>${fileCount} files"]:::entry\n`;
      } else if (isUISubsystem(subsystem, framework)) {
        diagram += `  ${nodeId}["🎨 ${subsystem.name}<br/>${fileCount} files"]:::ui\n`;
      } else if (isServiceSubsystem(subsystem, framework)) {
        diagram += `  ${nodeId}["⚙️ ${subsystem.name}<br/>${fileCount} files"]:::service\n`;
      } else {
        diagram += `  ${nodeId}["📁 ${subsystem.name}<br/>${fileCount} files"]:::default\n`;
      }
    });

    // Add basic relationships based on framework patterns
    diagram += generateFrameworkRelationships(subsystems, framework);

    // Add styling
    diagram += `
  classDef entry fill:#e1f5fe,stroke:#0277bd,stroke-width:3px
  classDef ui fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
  classDef service fill:#e8f5e8,stroke:#388e3c,stroke-width:2px
  classDef default fill:#fff3e0,stroke:#f57c00,stroke-width:2px`;

    mermaidDiagram = diagram;
  }

  // Generate dependency diagram (simplified)
  function generateDependencyDiagram() {
    if (!analysis) return;

    const subsystems = analysis.subsystems;
    let diagram = "graph LR\n";

    // Simple dependency flow for common patterns
    subsystems.forEach((subsystem, index) => {
      const nodeId = `D${index}`;
      diagram += `  ${nodeId}["${subsystem.name}"]:::default\n`;
    });

    // Add basic flow arrows
    if (subsystems.length > 1) {
      for (let i = 0; i < subsystems.length - 1; i++) {
        diagram += `  D${i} --> D${i + 1}\n`;
      }
    }

    diagram += `
  classDef default fill:#fff3e0,stroke:#f57c00,stroke-width:2px`;

    mermaidDiagram = diagram;
  }

  // Framework-specific relationship generation
  function generateFrameworkRelationships(
    subsystems: SubsystemReference[],
    framework: Framework
  ): string {
    let relationships = "";

    const getNodeIndex = (name: string) =>
      subsystems.findIndex((s) => s.name === name);

    switch (framework) {
      case "react":
      case "nextjs":
        // Typical React flow: Routes -> Components -> Services
        const routesIdx = getNodeIndex("Pages/Routes");
        const componentsIdx = getNodeIndex("Components");
        const servicesIdx = getNodeIndex("Services/API");

        if (routesIdx >= 0 && componentsIdx >= 0) {
          relationships += `  S${routesIdx} --> S${componentsIdx}\n`;
        }
        if (componentsIdx >= 0 && servicesIdx >= 0) {
          relationships += `  S${componentsIdx} --> S${servicesIdx}\n`;
        }
        break;

      case "svelte":
        // SvelteKit flow: Routes -> Components -> Stores/Services
        const svelteRoutesIdx = getNodeIndex("Routes");
        const svelteComponentsIdx = getNodeIndex("Components");
        const storesIdx = getNodeIndex("Stores");

        if (svelteRoutesIdx >= 0 && svelteComponentsIdx >= 0) {
          relationships += `  S${svelteRoutesIdx} --> S${svelteComponentsIdx}\n`;
        }
        if (svelteComponentsIdx >= 0 && storesIdx >= 0) {
          relationships += `  S${svelteComponentsIdx} --> S${storesIdx}\n`;
        }
        break;

      case "flask":
      case "fastapi":
        // Python API flow: Routes -> Services -> Models
        const apiRoutesIdx = getNodeIndex("Routes/Endpoints");
        const apiServicesIdx = getNodeIndex("Services");
        const modelsIdx = getNodeIndex("Models");

        if (apiRoutesIdx >= 0 && apiServicesIdx >= 0) {
          relationships += `  S${apiRoutesIdx} --> S${apiServicesIdx}\n`;
        }
        if (apiServicesIdx >= 0 && modelsIdx >= 0) {
          relationships += `  S${apiServicesIdx} --> S${modelsIdx}\n`;
        }
        break;
    }

    return relationships;
  }

  // Helper functions to categorize subsystems
  function isEntryPointSubsystem(
    subsystem: SubsystemReference,
    framework: Framework
  ): boolean {
    const name = subsystem.name.toLowerCase();
    return (
      name.includes("routes") ||
      name.includes("pages") ||
      name.includes("endpoints")
    );
  }

  function isUISubsystem(subsystem: SubsystemReference, framework: Framework): boolean {
    const name = subsystem.name.toLowerCase();
    return name.includes("components") || name.includes("ui");
  }

  function isServiceSubsystem(
    subsystem: SubsystemReference,
    framework: Framework
  ): boolean {
    const name = subsystem.name.toLowerCase();
    return (
      name.includes("services") ||
      name.includes("api") ||
      name.includes("stores")
    );
  }

  // Render Mermaid diagram
  async function renderMermaidDiagram() {
    if (!diagramContainer || !mermaidDiagram) return;

    try {
      // Import Mermaid dynamically
      const mermaid = (await import("mermaid")) as any;

      mermaid.default.initialize({
        startOnLoad: false,
        theme: "default",
        themeVariables: {
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "14px",
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
        },
      });

      // Clear container
      diagramContainer.innerHTML = "";

      // Render diagram
      const { svg } = await mermaid.default.render(
        "architecture-diagram",
        mermaidDiagram
      );
      diagramContainer.innerHTML = svg;

      // Add click handlers
      addClickHandlers();

      diagramRendered = true;
    } catch (err) {
      console.error("Failed to render Mermaid diagram:", err);
      diagramContainer.innerHTML =
        '<p class="error">Failed to render diagram</p>';
    }
  }

  // Add click handlers to diagram nodes
  function addClickHandlers() {
    if (!diagramContainer || !analysis) return;

    const nodes = diagramContainer.querySelectorAll('[id^="flowchart-S"]');
    nodes.forEach((node, index) => {
      const subsystem = analysis?.subsystems?.[index];
      if (subsystem) {
        node.addEventListener("click", () => {
          goto(`/repo/${repoId}/docs/${encodeURIComponent(subsystem.name)}`);
        });

        // Add cursor pointer
        (node as HTMLElement).style.cursor = "pointer";
      }
    });
  }

  // Generate AI architecture description
  async function generateArchitectureDescription() {
    if (!repo || !analysis) return;

    generatingDescription = true;

    try {
      const prompt = `Analyze the architecture of this ${analysis.framework} repository called "${repo.fullName}":

Subsystems:
${analysis.subsystems.map((s) => {
  const fileCount = Array.isArray(s.files) ? s.files.length : 0;
  return `- ${s.name}: ${fileCount} files`;
}).join("\n")}

Framework: ${analysis.framework}
Total Files: ${analysis.fileCount}

Provide a clear, technical explanation of:
1. The overall architecture pattern used
2. How the subsystems interact with each other
3. The data flow through the application
4. Key architectural decisions and benefits
5. Areas where developers should focus for maintenance

Keep it practical and focused on helping developers understand the codebase structure.`;

      const response = await makeOpenAIRequest(prompt);

      if (response.success && response.data) {
        architectureDescription = response.data.trim();
      } else {
        architectureDescription = generateFallbackDescription();
      }
    } catch (err) {
      console.warn("Failed to generate AI description:", err);
      architectureDescription = generateFallbackDescription();
    } finally {
      generatingDescription = false;
    }
  }

  // Fallback description when AI fails
  function generateFallbackDescription(): string {
    if (!analysis) return "";

    return `This ${analysis.framework} repository is organized into ${analysis.subsystems.length} main subsystems:

${analysis.subsystems.map((s) => {
  const fileCount = Array.isArray(s.files) ? s.files.length : 0;
  return `**${s.name}**: Contains ${fileCount} files focused on ${s.description.toLowerCase()}`;
}).join("\n\n")}

The architecture follows common ${analysis.framework} patterns with clear separation of concerns. Each subsystem has a specific responsibility, making the codebase maintainable and scalable.`;
  }

  // Download diagram as PNG
  async function downloadDiagram() {
    if (!diagramContainer) return;

    try {
      const svg = diagramContainer.querySelector("svg");
      if (!svg) return;

      // Create canvas and draw SVG
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        // Download
        const link = document.createElement("a");
        link.download = `${repo?.name || "repository"}-architecture.png`;
        link.href = canvas.toDataURL();
        link.click();
      };

      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    } catch (err) {
      console.error("Failed to download diagram:", err);
    }
  }

  // Switch diagram type
  function switchDiagramType(type: "subsystems" | "dependencies") {
    diagramType = type;
    selectedView = type;
    diagramRendered = false;
    generateDiagram();
  }

  // Handle view change
  function handleViewChange(event: any) {
    const newView = event.detail.value;
    switchDiagramType(newView as "subsystems" | "dependencies");
  }
</script>

{#if loading}
  <GraphLoadingState />
{:else if error}
  <GraphErrorCard {error} {repoId} />
{:else if repo && analysis}
  <ion-content class="ion-padding">
    <div class="graph-container">
      <!-- Header Controls -->
      <GraphControls 
        subtitle="{repo.fullName} - {analysis.framework} ({analysis.subsystems.length} subsystems)"
        {views}
        {selectedView}
        {showLegend}
        onViewChange={handleViewChange}
        onDownload={downloadDiagram}
        onToggleLegend={() => showLegend = !showLegend}
        onRefresh={() => switchDiagramType(diagramType)}
      />

      <!-- Graph Visualization Area -->
      <DiagramVisualization bind:diagramContainer {mermaidDiagram} />

      <!-- AI Architecture Description -->
      <ArchitectureDescription 
        description={architectureDescription}
        isGenerating={generatingDescription}
      />

      <!-- Legend -->
      {#if showLegend}
        <DiagramLegend />
      {/if}
    </div>
  </ion-content>
{/if}

<style lang="scss">
  // Main Container
  .graph-container {
    max-width: 1200px;
    margin: 0 auto;
  }
</style>
