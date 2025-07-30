<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getRepoById } from "$lib/services/repository";
  import { makeOpenAIRequest } from "$services/ai-analyzer";
  import { firestore } from "$services/firestore";
  import type { FirestoreRepo } from "$types/repository";
  import type {
    AnalysisResult,
    Subsystem,
    SubsystemReference,
    Framework,
  } from "$types/analysis";
  import GraphLoadingState from "$components/graph/LoadingState.svelte";
  import GraphErrorCard from "$components/graph/ErrorCard.svelte";
  import DiagramVisualization from "$components/graph/Visualization.svelte";
  import ArchitectureDescription from "$components/ArchitectureDescription.svelte";
  import SectionHeader from "$components/subsystem/SectionHeader.svelte";
  import { buildOutline } from "ionicons/icons";

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
  let zoomLevel = $state(1.0);
  let panX = $state(0);
  let panY = $state(0);

  // UI state
  let diagramType = $state<"subsystems" | "dependencies">("dependencies");

  // View configuration
  let selectedView = $state<string>("dependencies");

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

      // Check for existing architecture description
      if (analysis.architectureDescription) {
        architectureDescription = analysis.architectureDescription;
      }

      // Generate diagram
      generateDiagram();

      // Generate AI description if not already present
      if (!architectureDescription) {
        generateArchitectureDescription();
      }
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

  // Generate architectural subsystem overview (focuses on file organization and structure)
  function generateSubsystemDiagram() {
    if (!analysis) return;

    const subsystems = analysis.subsystems;
    const totalFiles = analysis.fileCount;

    let diagram = "graph LR\n";

    // Create a hierarchical file structure overview
    diagram += '  subgraph ProjectStructure["📁 Project Structure"]\n';
    diagram += "    direction TB\n";

    // Group by size and importance for structural overview
    const largeSubsystems = subsystems.filter((s) => s.files.length >= 10);
    const mediumSubsystems = subsystems.filter(
      (s) => s.files.length >= 5 && s.files.length < 10
    );
    const smallSubsystems = subsystems.filter((s) => s.files.length < 5);

    // Show project statistics
    diagram += `    STATS("📊 Project Overview<br/>${subsystems.length} subsystems<br/>${totalFiles} total files"):::stats\n`;

    if (largeSubsystems.length > 0) {
      diagram += '    subgraph LargeModules["🔴 Major Components"]\n';
      largeSubsystems.forEach((subsystem, idx) => {
        const nodeId = `L${idx}`;
        const fileCount = subsystem.files.length;
        const percentage = Math.round((fileCount / totalFiles) * 100);
        diagram += `      ${nodeId}("${subsystem.name}<br/>${fileCount} files (${percentage}%)"):::large\n`;
      });
      diagram += "    end\n";
      diagram += "    STATS --> LargeModules\n";
    }

    if (mediumSubsystems.length > 0) {
      diagram += '    subgraph MediumModules["🟡 Supporting Components"]\n';
      mediumSubsystems.forEach((subsystem, idx) => {
        const nodeId = `M${idx}`;
        const fileCount = subsystem.files.length;
        const percentage = Math.round((fileCount / totalFiles) * 100);
        diagram += `      ${nodeId}("${subsystem.name}<br/>${fileCount} files (${percentage}%)"):::medium\n`;
      });
      diagram += "    end\n";
      diagram += "    STATS --> MediumModules\n";
    }

    if (smallSubsystems.length > 0) {
      diagram += '    subgraph SmallModules["🟢 Utility Components"]\n';
      smallSubsystems.forEach((subsystem, idx) => {
        const nodeId = `S${idx}`;
        const fileCount = subsystem.files.length;
        diagram += `      ${nodeId}("${subsystem.name}<br/>${fileCount} files"):::small\n`;
      });
      diagram += "    end\n";
      diagram += "    STATS --> SmallModules\n";
    }

    diagram += "  end\n";

    // Add framework context
    diagram += `  FRAMEWORK("${getFrameworkIcon(analysis.framework)} ${analysis.framework.toUpperCase()}<br/>Framework"):::framework\n`;
    diagram += "  FRAMEWORK --> ProjectStructure\n";

    // Enhanced styling for structural overview
    diagram += `
  classDef stats fill:#e8eaf6,stroke:#3f51b5,stroke-width:3px,color:#1a237e
  classDef large fill:#ffebee,stroke:#f44336,stroke-width:3px,color:#b71c1c
  classDef medium fill:#fff3e0,stroke:#ff9800,stroke-width:2px,color:#e65100
  classDef small fill:#e8f5e8,stroke:#4caf50,stroke-width:2px,color:#1b5e20
  classDef framework fill:#f3e5f5,stroke:#9c27b0,stroke-width:3px,color:#4a148c`;

    mermaidDiagram = diagram;
  }

  // Generate runtime dependency flow diagram (focuses on data/control flow)
  function generateDependencyDiagram() {
    if (!analysis) return;

    const subsystems = analysis.subsystems;
    const framework = analysis.framework;

    let diagram = "graph TD\n";

    // Add user/client entry point
    diagram += `  USER(["👤 User<br/>Browser/Client"]):::user\n`;

    // Create main application flow based on framework patterns
    switch (framework) {
      case "svelte":
        diagram += generateSvelteFlow(subsystems);
        break;
      case "react":
      case "nextjs":
        diagram += generateReactFlow(subsystems);
        break;
      case "flask":
      case "fastapi":
        diagram += generatePythonAPIFlow(subsystems);
        break;
      default:
        diagram += generateGenericFlow(subsystems);
    }

    // Add external services and APIs
    diagram += generateExternalServicesFlow();

    // Enhanced styling for flow diagram
    diagram += `
  classDef user fill:#e1f5fe,stroke:#0277bd,stroke-width:4px,color:#01579b
  classDef entry fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px,color:#4a148c
  classDef ui fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#1b5e20
  classDef logic fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#e65100
  classDef data fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#880e4f
  classDef external fill:#ffebee,stroke:#d32f2f,stroke-width:2px,color:#b71c1c
  classDef api fill:#e0f2f1,stroke:#00695c,stroke-width:2px,color:#004d40`;

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
  function isEntryPointSubsystem(subsystem: SubsystemReference): boolean {
    const name = subsystem.name.toLowerCase();
    return (
      name.includes("routes") ||
      name.includes("pages") ||
      name.includes("endpoints")
    );
  }

  function isUISubsystem(subsystem: SubsystemReference): boolean {
    const name = subsystem.name.toLowerCase();
    return name.includes("components") || name.includes("ui");
  }

  function isServiceSubsystem(subsystem: SubsystemReference): boolean {
    const name = subsystem.name.toLowerCase();
    return (
      name.includes("services") ||
      name.includes("api") ||
      name.includes("stores") ||
      name.includes("utils") ||
      name.includes("helpers") ||
      name.includes("lib")
    );
  }

  function isDataSubsystem(subsystem: SubsystemReference): boolean {
    const name = subsystem.name.toLowerCase();
    return (
      name.includes("data") ||
      name.includes("models") ||
      name.includes("database") ||
      name.includes("schema") ||
      name.includes("entities") ||
      name.includes("types")
    );
  }

  function isConfigSubsystem(subsystem: SubsystemReference): boolean {
    const name = subsystem.name.toLowerCase();
    return (
      name.includes("config") ||
      name.includes("settings") ||
      name.includes("env") ||
      name.includes("constants")
    );
  }

  function isTestSubsystem(subsystem: SubsystemReference): boolean {
    const name = subsystem.name.toLowerCase();
    return (
      name.includes("test") ||
      name.includes("spec") ||
      name.includes("__test__") ||
      name.includes("e2e")
    );
  }

  function getSizeIndicator(fileCount: number): string {
    if (fileCount >= 20) return "🔴"; // Large
    if (fileCount >= 10) return "🟡"; // Medium
    if (fileCount >= 5) return "🟢"; // Small
    return "⚪"; // Tiny
  }

  function generateEnhancedRelationships(
    subsystems: SubsystemReference[],
    framework: Framework,
    groupedSubsystems: any
  ): string {
    let relationships = "";

    // Generate layer-to-layer relationships
    groupedSubsystems.entry.forEach(({ index: entryIdx }) => {
      // Entry points connect to UI
      groupedSubsystems.ui.forEach(({ index: uiIdx }) => {
        relationships += `  S${entryIdx} --> S${uiIdx}\n`;
      });

      // If no UI, connect directly to services
      if (groupedSubsystems.ui.length === 0) {
        groupedSubsystems.service.forEach(({ index: serviceIdx }) => {
          relationships += `  S${entryIdx} --> S${serviceIdx}\n`;
        });
      }
    });

    // UI connects to services
    groupedSubsystems.ui.forEach(({ index: uiIdx }) => {
      groupedSubsystems.service.forEach(({ index: serviceIdx }) => {
        relationships += `  S${uiIdx} --> S${serviceIdx}\n`;
      });
    });

    // Services connect to data
    groupedSubsystems.service.forEach(({ index: serviceIdx }) => {
      groupedSubsystems.data.forEach(({ index: dataIdx }) => {
        relationships += `  S${serviceIdx} --> S${dataIdx}\n`;
      });
    });

    // Framework-specific patterns
    relationships += generateFrameworkRelationships(subsystems, framework);

    return relationships;
  }

  function generateRealisticDependencies(
    subsystems: SubsystemReference[]
  ): string {
    let dependencies = "";

    // Analyze file names and paths to infer dependencies
    subsystems.forEach((subsystem, sourceIdx) => {
      subsystems.forEach((targetSubsystem, targetIdx) => {
        if (sourceIdx === targetIdx) return;

        // Check if source might depend on target based on naming patterns
        const sourceName = subsystem.name.toLowerCase();
        const targetName = targetSubsystem.name.toLowerCase();

        // Common dependency patterns
        const dependencyPatterns = [
          // API/Services depend on models/types
          {
            source: ["api", "service"],
            target: ["model", "type", "schema"],
            style: "solid",
          },
          // Components depend on services/stores
          {
            source: ["component", "page", "route"],
            target: ["service", "store", "api"],
            style: "solid",
          },
          // Tests depend on everything they test
          {
            source: ["test", "spec"],
            target: ["component", "service", "util"],
            style: "dashed",
          },
          // Utils are used by many things
          {
            source: ["component", "service", "api"],
            target: ["util", "helper", "lib"],
            style: "dotted",
          },
        ];

        dependencyPatterns.forEach((pattern) => {
          const sourceMatches = pattern.source.some((keyword) =>
            sourceName.includes(keyword)
          );
          const targetMatches = pattern.target.some((keyword) =>
            targetName.includes(keyword)
          );

          if (sourceMatches && targetMatches) {
            const arrow =
              pattern.style === "dashed"
                ? "-.->"
                : pattern.style === "dotted"
                  ? "-.->"
                  : "-->";
            dependencies += `  D${sourceIdx} ${arrow} D${targetIdx}\n`;
          }
        });
      });
    });

    return dependencies;
  }

  function getFrameworkIcon(framework: Framework): string {
    switch (framework) {
      case "svelte":
        return "🔥";
      case "react":
        return "⚛️";
      case "nextjs":
        return "▲";
      case "flask":
        return "🐍";
      case "fastapi":
        return "⚡";
      default:
        return "🔧";
    }
  }

  function generateSvelteFlow(subsystems: SubsystemReference[]): string {
    let flow = "";

    // Find relevant subsystems
    const routes = subsystems.find((s) =>
      s.name.toLowerCase().includes("route")
    );
    const components = subsystems.find((s) =>
      s.name.toLowerCase().includes("component")
    );
    const stores = subsystems.find((s) =>
      s.name.toLowerCase().includes("store")
    );
    const services = subsystems.find((s) =>
      s.name.toLowerCase().includes("service")
    );

    // Build SvelteKit-specific flow
    flow += `  ROUTES("🛣️ SvelteKit Routes<br/>Page Loading"):::entry\n`;
    flow += `  COMPONENTS("🎨 Svelte Components<br/>UI Rendering"):::ui\n`;
    flow += `  STORES("📦 Svelte Stores<br/>State Management"):::logic\n`;
    flow += `  SERVICES("⚙️ API Services<br/>Data Fetching"):::api\n`;
    flow += `  DATABASE[("💾 Firebase<br/>Database")]:::data\n`;

    // Flow connections
    flow += `  USER --> ROUTES\n`;
    flow += `  ROUTES --> COMPONENTS\n`;
    flow += `  COMPONENTS --> STORES\n`;
    flow += `  COMPONENTS --> SERVICES\n`;
    flow += `  SERVICES --> DATABASE\n`;
    flow += `  STORES -.-> COMPONENTS\n`;

    return flow;
  }

  function generateReactFlow(subsystems: SubsystemReference[]): string {
    let flow = "";

    flow += `  ROUTER("🛣️ React Router<br/>Navigation"):::entry\n`;
    flow += `  COMPONENTS("🎨 React Components<br/>UI Layer"):::ui\n`;
    flow += `  CONTEXT("📦 Context/Redux<br/>State Management"):::logic\n`;
    flow += `  API("⚙️ API Calls<br/>Data Layer"):::api\n`;
    flow += `  BACKEND[("💾 Backend API<br/>Database")]:::data\n`;

    flow += `  USER --> ROUTER\n`;
    flow += `  ROUTER --> COMPONENTS\n`;
    flow += `  COMPONENTS --> CONTEXT\n`;
    flow += `  COMPONENTS --> API\n`;
    flow += `  API --> BACKEND\n`;
    flow += `  CONTEXT -.-> COMPONENTS\n`;

    return flow;
  }

  function generatePythonAPIFlow(subsystems: SubsystemReference[]): string {
    let flow = "";

    flow += `  ENDPOINTS("🛣️ API Endpoints<br/>Request Handling"):::entry\n`;
    flow += `  SERVICES("⚙️ Business Logic<br/>Processing"):::logic\n`;
    flow += `  MODELS("📋 Data Models<br/>Validation"):::ui\n`;
    flow += `  DATABASE[("💾 Database<br/>Persistence")]:::data\n`;

    flow += `  USER --> ENDPOINTS\n`;
    flow += `  ENDPOINTS --> SERVICES\n`;
    flow += `  SERVICES --> MODELS\n`;
    flow += `  MODELS --> DATABASE\n`;
    flow += `  DATABASE -.-> MODELS\n`;
    flow += `  MODELS -.-> SERVICES\n`;
    flow += `  SERVICES -.-> ENDPOINTS\n`;

    return flow;
  }

  function generateGenericFlow(subsystems: SubsystemReference[]): string {
    let flow = "";

    // Create generic application flow
    flow += `  ENTRY("🚪 Entry Points<br/>Application Start"):::entry\n`;
    flow += `  UI("🎨 User Interface<br/>Presentation Layer"):::ui\n`;
    flow += `  LOGIC("⚙️ Business Logic<br/>Core Functionality"):::logic\n`;
    flow += `  DATA[("💾 Data Layer<br/>Storage & Retrieval")]:::data\n`;

    flow += `  USER --> ENTRY\n`;
    flow += `  ENTRY --> UI\n`;
    flow += `  UI --> LOGIC\n`;
    flow += `  LOGIC --> DATA\n`;
    flow += `  DATA -.-> LOGIC\n`;
    flow += `  LOGIC -.-> UI\n`;

    return flow;
  }

  function generateExternalServicesFlow(): string {
    if (!analysis) return "";

    let externals = "";
    const framework = analysis.framework;

    // Add external services based on framework
    switch (framework) {
      case "svelte":
        externals += `  FIREBASE("🔥 Firebase<br/>Authentication & DB"):::external\n`;
        externals += `  CDN("🌐 CDN<br/>Static Assets"):::external\n`;
        externals += `  DATABASE --> FIREBASE\n`;
        externals += `  SERVICES --> CDN\n`;
        break;
      case "react":
      case "nextjs":
        externals += `  API_SERVER("🌐 API Server<br/>Backend Services"):::external\n`;
        externals += `  BACKEND --> API_SERVER\n`;
        break;
    }

    return externals;
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
          fontSize: "16px",
        },
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: "basis",
          padding: 20,
        },
        // Make diagrams larger by default
        scale: 1.2,
      });

      // Clear container
      diagramContainer.innerHTML = "";

      // Render diagram
      const { svg } = await mermaid.default.render(
        "architecture-diagram",
        mermaidDiagram
      );
      diagramContainer.innerHTML = svg;

      // Resize container to fit content
      resizeDiagramContainer();

      // Add click handlers
      addClickHandlers();

      diagramRendered = true;
    } catch (err) {
      console.error("Failed to render Mermaid diagram:", err);
      diagramContainer.innerHTML =
        '<p class="error">Failed to render diagram</p>';
    }
  }

  // Resize diagram container to fit the actual content
  function resizeDiagramContainer() {
    if (!diagramContainer) return;

    const svgElement = diagramContainer.querySelector("svg");
    if (!svgElement) return;

    try {
      // Get the actual dimensions of the SVG content
      const bbox = svgElement.getBBox();
      const padding = 40; // Account for container padding (20px * 2)

      // Set a larger minimum height for better visibility
      const minHeight = 300;
      const contentHeight = Math.max(bbox.height + padding, minHeight);

      // Update the container's min-height to match content
      diagramContainer.style.minHeight = `${contentHeight}px`;

      // Make the SVG larger by default and set up for zooming
      svgElement.style.height = "auto";
      svgElement.style.minHeight = "300px";
      svgElement.style.width = "100%";
      svgElement.style.maxWidth = "none";

      // Apply initial zoom and pan transform
      applyZoomAndPan(svgElement);
    } catch (err) {
      console.warn("Failed to resize diagram container:", err);
      // Fallback to a reasonable default
      diagramContainer.style.minHeight = "350px";
    }
  }

  // Apply zoom and pan transformations
  function applyZoomAndPan(svgElement: SVGSVGElement) {
    const transform = `translate(${panX}, ${panY}) scale(${zoomLevel})`;
    const gElement = svgElement.querySelector("g");
    if (gElement) {
      gElement.style.transform = transform;
      gElement.style.transformOrigin = "center center";
    }
  }

  // Zoom functions
  function zoomIn() {
    zoomLevel = Math.min(zoomLevel * 1.2, 3.0);
    updateZoom();
  }

  function zoomOut() {
    zoomLevel = Math.max(zoomLevel / 1.2, 0.3);
    updateZoom();
  }

  function resetZoom() {
    zoomLevel = 1.0;
    panX = 0;
    panY = 0;
    updateZoom();
  }

  function updateZoom() {
    if (!diagramContainer) return;
    const svgElement = diagramContainer.querySelector("svg");
    if (svgElement) {
      applyZoomAndPan(svgElement);
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
${analysis.subsystems
  .map((s) => {
    const fileCount = Array.isArray(s.files) ? s.files.length : 0;
    return `- ${s.name}: ${fileCount} files`;
  })
  .join("\n")}

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

        // Save to Firestore
        try {
          const updateData = {
            "analysisData.architectureDescription": architectureDescription,
          };
          if (repoId) {
            await firestore.update("repositories", repoId, updateData);
          }

          // Update local analysis object
          if (analysis) {
            analysis.architectureDescription = architectureDescription;
          }
        } catch (saveErr) {
          console.warn(
            "Failed to save architecture description to Firestore:",
            saveErr
          );
        }
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

${analysis.subsystems
  .map((s) => {
    const fileCount = Array.isArray(s.files) ? s.files.length : 0;
    return `**${s.name}**: Contains ${fileCount} files focused on ${s.description.toLowerCase()}`;
  })
  .join("\n\n")}

The architecture follows common ${analysis.framework} patterns with clear separation of concerns. Each subsystem has a specific responsibility, making the codebase maintainable and scalable.`;
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
  <GraphErrorCard {error} repoId={repoId || ""} />
{:else if repo && analysis}
  <ion-content class="ion-padding">
    <SectionHeader title="Repository Architecture" icon={buildOutline} />

    <div class="graph-container">
      <!-- Graph Visualization Area -->
      <DiagramVisualization
        bind:diagramContainer
        {mermaidDiagram}
        {selectedView}
        onViewChange={handleViewChange}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
      />


      <!-- AI Architecture Description -->
      <ArchitectureDescription
        description={architectureDescription}
        isGenerating={generatingDescription}
      />
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
