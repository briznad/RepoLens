<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getRepoById } from "$lib/services/repository";
  import { generateInlineCitations } from "$utilities/repo-analyzer";
  import { makeOpenAIRequest } from "$services/ai-analyzer";
  import type { FirestoreRepo, GitHubFile } from "$types/repository";
  import type {
    AnalysisResult,
    Subsystem,
    SubsystemDescription,
    FileInterface,
    CitationLink,
  } from "$types/analysis";

  const repoId = $derived($page.params.id);
  const subsystemName = $derived(
    $page.params.subsystem ? decodeURIComponent($page.params.subsystem) : ""
  );

  // State management
  let repo = $state<FirestoreRepo | null>(null);
  let analysis = $state<AnalysisResult | null>(null);
  let subsystem = $state<Subsystem | null>(null);
  let subsystemDescription = $state<SubsystemDescription | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let generatingAI = $state(false);

  // Enhanced content state
  let fileExplanations = $state<Record<string, string>>({});
  let functionExplanations = $state<Record<string, string>>({});
  let usageExamples = $state<string[]>([]);
  let relatedSubsystems = $state<string[]>([]);
  let architectureRole = $state<string>("");

  // UI state
  let expandedSections = $state<Set<string>>(new Set(["overview", "files"]));
  let expandedFiles = $state<Set<string>>(new Set());
  let copiedStates = $state<Record<string, boolean>>({});

  // Load repository and subsystem data
  onMount(async () => {
    if (!repoId || !subsystemName) {
      error = "Repository ID or subsystem name not found";
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

      if (analysis) {
        // Find the specific subsystem
        const foundSubsystem = analysis.subsystems.find(
          (s) => s.name === subsystemName
        );
        if (!foundSubsystem) {
          error = `Subsystem "${subsystemName}" not found`;
          loading = false;
          return;
        }

        subsystem = foundSubsystem;

        // Find AI-generated description
        subsystemDescription =
          analysis.subsystemDescriptions?.find(
            (desc) => desc.name === subsystemName
          ) || null;

        // Generate enhanced documentation
        await generateEnhancedDocumentation();
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load subsystem";
    } finally {
      loading = false;
    }
  });

  // Generate enhanced AI documentation
  async function generateEnhancedDocumentation() {
    if (!subsystem || !repo || !analysis) return;

    generatingAI = true;

    try {
      // Generate file explanations
      await generateFileExplanations();

      // Generate function explanations
      await generateFunctionExplanations();

      // Generate usage examples
      await generateUsageExamples();

      // Generate architecture role explanation
      await generateArchitectureRole();

      // Find related subsystems
      findRelatedSubsystems();
    } catch (err) {
      console.warn("AI documentation generation failed:", err);
    } finally {
      generatingAI = false;
    }
  }

  async function generateFileExplanations() {
    if (!subsystem || !repo) return;

    const keyFiles = subsystem.files.slice(0, 8); // Limit for performance
    const [owner, repoName] = repo.fullName.split("/");

    for (const file of keyFiles) {
      const prompt = `Explain the purpose and role of this file in a ${analysis?.framework} project:

File: ${file.path}
Project: ${repo.fullName}
Framework: ${analysis?.framework}
Subsystem: ${subsystemName}

Provide a concise, technical explanation (2-3 sentences) of what this file does and why it's important in this subsystem. Focus on its specific role and functionality.`;

      try {
        const response = await makeOpenAIRequest(prompt);
        if (response.success && response.data) {
          fileExplanations[file.path] = response.data.trim();
        }
      } catch (err) {
        console.warn(`Failed to generate explanation for ${file.path}:`, err);
      }
    }
  }

  async function generateFunctionExplanations() {
    if (!analysis?.keyInterfaces || !subsystem) return;

    // Find interfaces related to this subsystem
    const subsystemInterfaces =
      analysis.keyInterfaces
        ?.filter((iface) =>
          subsystem?.files?.some((file) => file.path === iface.filePath)
        )
        .slice(0, 6) || []; // Limit for performance

    for (const iface of subsystemInterfaces) {
      const prompt = `Explain this ${iface.type} from a ${analysis?.framework} project:

${iface.type}: ${iface.name}
File: ${iface.filePath}
Signature: ${iface.signature || "N/A"}
Project: ${repo?.fullName}
Subsystem: ${subsystemName}

Provide a clear, technical explanation (2-3 sentences) of what this ${iface.type} does, its parameters if applicable, and how it's typically used.`;

      try {
        const response = await makeOpenAIRequest(prompt);
        if (response.success && response.data) {
          functionExplanations[`${iface.filePath}:${iface.name}`] =
            response.data.trim();
        }
      } catch (err) {
        console.warn(`Failed to generate explanation for ${iface.name}:`, err);
      }
    }
  }

  async function generateUsageExamples() {
    if (!subsystem || !repo || !subsystemDescription) return;

    const prompt = `Generate practical usage examples for the "${subsystemName}" subsystem in ${repo.fullName}:

Subsystem: ${subsystemName}
Purpose: ${subsystemDescription.purpose}
Framework: ${analysis?.framework}
Key Files: ${subsystemDescription.keyFiles.slice(0, 5).join(", ")}
Technologies: ${subsystemDescription.technologies.join(", ")}

Create 2-3 concise code examples showing how developers would typically interact with this subsystem. Include:
1. Import/usage patterns
2. Common function calls or class instantiation
3. Integration with other parts of the system

Format as simple code blocks without markdown formatting.`;

    try {
      const response = await makeOpenAIRequest(prompt);
      if (response.success && response.data) {
        // Split response into individual examples
        const examples = response.data
          .split("\n\n")
          .filter((ex: string) => ex.trim().length > 0);
        usageExamples = examples.slice(0, 3); // Limit to 3 examples
      }
    } catch (err) {
      console.warn("Failed to generate usage examples:", err);
    }
  }

  async function generateArchitectureRole() {
    if (!subsystem || !repo || !analysis) return;

    const prompt = `Explain how the "${subsystemName}" subsystem fits into the overall architecture of ${repo.fullName}:

Project: ${repo.fullName}
Framework: ${analysis.framework}
Subsystem: ${subsystemName}
Total Subsystems: ${analysis.subsystems.map((s) => s.name).join(", ")}
File Count: ${subsystem.files.length}

Provide a clear explanation (3-4 sentences) of:
1. This subsystem's role in the overall application architecture
2. How it interacts with other subsystems
3. Its importance to the project's functionality
4. Any architectural patterns it implements

Focus on architectural concepts and system design.`;

    try {
      const response = await makeOpenAIRequest(prompt);
      if (response.success && response.data) {
        architectureRole = response.data.trim();
      }
    } catch (err) {
      console.warn("Failed to generate architecture role:", err);
    }
  }

  function findRelatedSubsystems() {
    if (!analysis || !subsystem) return;

    // Simple heuristic: find subsystems that share similar file patterns or are commonly related
    const currentPaths = new Set(
      subsystem.files.map((f) => f.path.toLowerCase())
    );

    const related = analysis.subsystems
      .filter((s) => s.name !== subsystemName)
      .map((s) => {
        // Calculate relationship score based on file path similarity
        const sharedPatterns = s.files.filter((f) => {
          const path = f.path.toLowerCase();
          return Array.from(currentPaths).some(
            (cp) =>
              path.includes(cp.split("/")[0]) || cp.includes(path.split("/")[0])
          );
        }).length;

        return { name: s.name, score: sharedPatterns };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.name);

    relatedSubsystems = related;
  }

  // Helper functions
  function toggleSection(sectionId: string) {
    if (expandedSections.has(sectionId)) {
      expandedSections.delete(sectionId);
    } else {
      expandedSections.add(sectionId);
    }
    expandedSections = new Set(expandedSections);
  }

  function toggleFile(filePath: string) {
    if (expandedFiles.has(filePath)) {
      expandedFiles.delete(filePath);
    } else {
      expandedFiles.add(filePath);
    }
    expandedFiles = new Set(expandedFiles);
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      copiedStates[id] = true;
      setTimeout(() => {
        copiedStates[id] = false;
        copiedStates = { ...copiedStates };
      }, 2000);
    } catch (err) {
      console.warn("Failed to copy to clipboard:", err);
    }
  }

  function createGitHubLink(filePath: string, lineNumber?: number): string {
    if (!repo) return "#";
    const [owner, repoName] = repo.fullName.split("/");
    const baseUrl = `https://github.com/${owner}/${repoName}/blob/main/${filePath}`;
    return lineNumber ? `${baseUrl}#L${lineNumber}` : baseUrl;
  }

  function getFileExtension(filePath: string): string {
    return filePath.split(".").pop()?.toLowerCase() || "";
  }

  function getFileIcon(filePath: string): string {
    const ext = getFileExtension(filePath);
    const iconMap: Record<string, string> = {
      js: "logo-javascript",
      jsx: "logo-react",
      ts: "document-text",
      tsx: "logo-react",
      py: "logo-python",
      svelte: "code-slash",
      html: "code",
      css: "color-palette",
      scss: "color-palette",
      json: "document-text",
      md: "document-text",
      yml: "settings",
      yaml: "settings",
    };
    return iconMap[ext] || "document-outline";
  }

  function handleRelatedClick(relatedName: string) {
    goto(`/repo/${repoId}/docs/${encodeURIComponent(relatedName)}`);
  }
</script>

<ion-content class="ion-padding">
  {#if loading}
    <div class="loading-container">
      <ion-spinner name="dots"></ion-spinner>
      <p>Loading subsystem documentation...</p>
    </div>
  {:else if error}
    <ion-card class="error-card">
      <ion-card-header>
        <ion-card-title color="danger">Error</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>{error}</p>
        <div class="error-actions">
          <ion-button
            fill="outline"
            onclick={() => goto(`/repo/${repoId}/docs`)}
          >
            <ion-icon name="arrow-back" slot="start"></ion-icon>
            Back to Docs
          </ion-button>
          <ion-button fill="outline" onclick={() => goto("/")}>
            <ion-icon name="home" slot="start"></ion-icon>
            Return Home
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  {:else if repo && analysis && subsystem}
    <div class="subsystem-docs-container">
      <!-- Breadcrumb Navigation -->
      <div class="breadcrumb-nav">
        <ion-breadcrumbs>
          <ion-breadcrumb onclick={() => goto("/")}>
            <ion-icon name="home"></ion-icon>
            Home
          </ion-breadcrumb>
          <ion-breadcrumb onclick={() => goto(`/repo/${repoId}/docs`)}>
            {repo.fullName}
          </ion-breadcrumb>
          <ion-breadcrumb>
            {subsystemName}
          </ion-breadcrumb>
        </ion-breadcrumbs>
      </div>

      <!-- Header Section -->
      <div class="header-section">
        <ion-card class="header-card">
          <ion-card-content>
            <div class="subsystem-header">
              <div class="header-info">
                <h1 class="subsystem-title">{subsystemName}</h1>
                <div class="subsystem-meta">
                  <ion-chip color="primary">
                    <ion-icon name="layers-outline"></ion-icon>
                    <ion-label>{subsystem.files.length} files</ion-label>
                  </ion-chip>
                  <ion-chip color="secondary">
                    <ion-icon name="code-outline"></ion-icon>
                    <ion-label>{analysis.framework}</ion-label>
                  </ion-chip>
                  {#if subsystemDescription?.technologies}
                    {#each subsystemDescription.technologies.slice(0, 3) as tech}
                      <ion-chip color="tertiary" size="small">
                        <ion-label>{tech}</ion-label>
                      </ion-chip>
                    {/each}
                  {/if}
                </div>
                {#if subsystemDescription?.description}
                  <p class="subsystem-intro">
                    {subsystemDescription.description}
                  </p>
                {:else}
                  <p class="subsystem-intro fallback">
                    {subsystem.description}
                  </p>
                {/if}
              </div>
              <div class="header-actions">
                <ion-button
                  fill="outline"
                  onclick={() => window.open(repo?.url || "", "_blank")}
                >
                  <ion-icon name="logo-github" slot="start"></ion-icon>
                  View Repository
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- AI Generation Status -->
      {#if generatingAI}
        <ion-card class="ai-status-card">
          <ion-card-content>
            <div class="ai-status">
              <ion-spinner name="crescent"></ion-spinner>
              <span>Generating enhanced documentation with AI...</span>
            </div>
          </ion-card-content>
        </ion-card>
      {/if}

      <!-- Overview Section -->
      <ion-card class="section-card">
        <ion-card-header>
          <div class="section-header" onclick={() => toggleSection("overview")}>
            <ion-card-title>
              <ion-icon name="information-circle-outline"></ion-icon>
              Overview & Architecture Role
            </ion-card-title>
            <ion-icon
              name={expandedSections.has("overview")
                ? "chevron-up"
                : "chevron-down"}
            ></ion-icon>
          </div>
        </ion-card-header>

        {#if expandedSections.has("overview")}
          <ion-card-content>
            {#if subsystemDescription}
              <div class="overview-content">
                <div class="overview-item">
                  <h4>Purpose</h4>
                  <p>{subsystemDescription.purpose}</p>
                </div>

                {#if architectureRole}
                  <div class="overview-item">
                    <h4>Architecture Role</h4>
                    <p>{architectureRole}</p>
                  </div>
                {/if}

                {#if subsystemDescription.entryPoints.length > 0}
                  <div class="overview-item">
                    <h4>Entry Points</h4>
                    <div class="entry-points">
                      {#each subsystemDescription.entryPoints as entryPoint}
                        <ion-chip color="success" class="entry-chip">
                          <ion-icon name="arrow-forward-circle-outline"
                          ></ion-icon>
                          <ion-label>{entryPoint}</ion-label>
                          <a
                            href={createGitHubLink(entryPoint)}
                            target="_blank"
                            rel="noopener"
                          >
                            <ion-icon name="open-outline"></ion-icon>
                          </a>
                        </ion-chip>
                      {/each}
                    </div>
                  </div>
                {/if}

                {#if subsystemDescription.dependencies.length > 0}
                  <div class="overview-item">
                    <h4>Key Dependencies</h4>
                    <div class="dependencies">
                      {#each subsystemDescription.dependencies as dep}
                        <ion-chip size="small" color="medium">
                          <ion-label>{dep}</ion-label>
                        </ion-chip>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {:else}
              <p class="fallback-content">
                Basic subsystem information is being processed...
              </p>
            {/if}
          </ion-card-content>
        {/if}
      </ion-card>

      <!-- Files Section -->
      <ion-card class="section-card">
        <ion-card-header>
          <div class="section-header" onclick={() => toggleSection("files")}>
            <ion-card-title>
              <ion-icon name="folder-outline"></ion-icon>
              Files & Structure ({subsystem.files.length})
            </ion-card-title>
            <ion-icon
              name={expandedSections.has("files")
                ? "chevron-up"
                : "chevron-down"}
            ></ion-icon>
          </div>
        </ion-card-header>

        {#if expandedSections.has("files")}
          <ion-card-content>
            <div class="files-list">
              {#each subsystem.files as file}
                <div class="file-item">
                  <div
                    class="file-header"
                    onclick={() => toggleFile(file.path)}
                  >
                    <div class="file-info">
                      <ion-icon name={getFileIcon(file.path)}></ion-icon>
                      <span class="file-path">{file.path}</span>
                      <a
                        href={createGitHubLink(file.path)}
                        target="_blank"
                        rel="noopener"
                        class="github-link"
                      >
                        <ion-icon name="logo-github"></ion-icon>
                      </a>
                    </div>
                    <ion-icon
                      name={expandedFiles.has(file.path)
                        ? "chevron-up"
                        : "chevron-down"}
                      class="expand-icon"
                    ></ion-icon>
                  </div>

                  {#if expandedFiles.has(file.path)}
                    <div class="file-details">
                      {#if fileExplanations[file.path]}
                        <div class="file-explanation">
                          <h5>Purpose</h5>
                          <p>{fileExplanations[file.path]}</p>
                        </div>
                      {:else}
                        <div class="file-explanation">
                          <p class="generating">Generating explanation...</p>
                        </div>
                      {/if}

                      <div class="file-actions">
                        <ion-button
                          size="small"
                          fill="clear"
                          onclick={() =>
                            window.open(createGitHubLink(file.path), "_blank")}
                        >
                          <ion-icon name="open-outline" slot="start"></ion-icon>
                          View on GitHub
                        </ion-button>
                        {#if file.size}
                          <span class="file-size"
                            >{(file.size / 1024).toFixed(1)} KB</span
                          >
                        {/if}
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </ion-card-content>
        {/if}
      </ion-card>

      <!-- Key Functions & Interfaces -->
      {#if analysis.keyInterfaces}
        <ion-card class="section-card">
          <ion-card-header>
            <div
              class="section-header"
              onclick={() => toggleSection("interfaces")}
            >
              <ion-card-title>
                <ion-icon name="code-slash-outline"></ion-icon>
                Key Functions & Interfaces
              </ion-card-title>
              <ion-icon
                name={expandedSections.has("interfaces")
                  ? "chevron-up"
                  : "chevron-down"}
              ></ion-icon>
            </div>
          </ion-card-header>

          {#if expandedSections.has("interfaces")}
            <ion-card-content>
              <div class="interfaces-list">
                {#each analysis.keyInterfaces?.filter( (iface) => subsystem?.files?.some((file) => file.path === iface.filePath) ) || [] as iface}
                  <div class="interface-item">
                    <div class="interface-header">
                      <div class="interface-info">
                        <ion-chip color="primary" size="small">
                          <ion-label>{iface.type}</ion-label>
                        </ion-chip>
                        <span class="interface-name">{iface.name}</span>
                        <span class="interface-file">in {iface.filePath}</span>
                        <a
                          href={createGitHubLink(
                            iface.filePath,
                            iface.lineNumber
                          )}
                          target="_blank"
                          rel="noopener"
                          class="github-link"
                        >
                          <ion-icon name="logo-github"></ion-icon>
                        </a>
                      </div>
                    </div>

                    {#if iface.signature}
                      <div class="interface-signature">
                        <pre><code>{iface.signature}</code></pre>
                        <ion-button
                          size="small"
                          fill="clear"
                          onclick={() =>
                            copyToClipboard(
                              iface.signature || "",
                              `sig-${iface.name}`
                            )}
                        >
                          <ion-icon
                            name={copiedStates[`sig-${iface.name}`]
                              ? "checkmark"
                              : "copy"}
                            slot="start"
                          ></ion-icon>
                          {copiedStates[`sig-${iface.name}`]
                            ? "Copied!"
                            : "Copy"}
                        </ion-button>
                      </div>
                    {/if}

                    {#if functionExplanations[`${iface.filePath}:${iface.name}`]}
                      <div class="interface-explanation">
                        <p>
                          {functionExplanations[
                            `${iface.filePath}:${iface.name}`
                          ]}
                        </p>
                      </div>
                    {:else if !generatingAI}
                      <div class="interface-explanation">
                        <p class="fallback">
                          No detailed explanation available for this {iface.type}.
                        </p>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </ion-card-content>
          {/if}
        </ion-card>
      {/if}

      <!-- Usage Examples -->
      {#if usageExamples.length > 0}
        <ion-card class="section-card">
          <ion-card-header>
            <div
              class="section-header"
              onclick={() => toggleSection("examples")}
            >
              <ion-card-title>
                <ion-icon name="code-working-outline"></ion-icon>
                Usage Examples
              </ion-card-title>
              <ion-icon
                name={expandedSections.has("examples")
                  ? "chevron-up"
                  : "chevron-down"}
              ></ion-icon>
            </div>
          </ion-card-header>

          {#if expandedSections.has("examples")}
            <ion-card-content>
              <div class="examples-list">
                {#each usageExamples as example, index}
                  <div class="example-item">
                    <div class="example-header">
                      <h5>Example {index + 1}</h5>
                      <ion-button
                        size="small"
                        fill="clear"
                        onclick={() =>
                          copyToClipboard(example, `example-${index}`)}
                      >
                        <ion-icon
                          name={copiedStates[`example-${index}`]
                            ? "checkmark"
                            : "copy"}
                          slot="start"
                        ></ion-icon>
                        {copiedStates[`example-${index}`] ? "Copied!" : "Copy"}
                      </ion-button>
                    </div>
                    <div class="example-code">
                      <pre><code>{example}</code></pre>
                    </div>
                  </div>
                {/each}
              </div>
            </ion-card-content>
          {/if}
        </ion-card>
      {/if}

      <!-- Related Subsystems -->
      {#if relatedSubsystems.length > 0}
        <ion-card class="section-card">
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="git-network-outline"></ion-icon>
              Related Subsystems
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="related-subsystems">
              {#each relatedSubsystems as related}
                <ion-chip
                  class="related-chip"
                  onclick={() => handleRelatedClick(related)}
                >
                  <ion-icon name="layers-outline"></ion-icon>
                  <ion-label>{related}</ion-label>
                  <ion-icon name="arrow-forward"></ion-icon>
                </ion-chip>
              {/each}
            </div>
          </ion-card-content>
        </ion-card>
      {/if}
    </div>
  {/if}
</ion-content>

<style lang="scss">
  .subsystem-docs-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 16px;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;

    ion-spinner {
      margin-bottom: 16px;
    }

    p {
      color: var(--ion-color-medium);
      font-size: 1rem;
    }
  }

  .error-card {
    max-width: 500px;
    margin: 40px auto;
    text-align: center;

    .error-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 16px;

      @media (max-width: 480px) {
        flex-direction: column;
      }
    }
  }

  // Breadcrumb Navigation
  .breadcrumb-nav {
    margin-bottom: 20px;

    ion-breadcrumbs {
      --color: var(--ion-color-medium);
    }

    ion-breadcrumb {
      cursor: pointer;

      &:hover {
        --color: var(--ion-color-primary);
      }
    }
  }

  // Header Section
  .header-section {
    margin-bottom: 24px;
  }

  .header-card {
    --background: linear-gradient(
      135deg,
      var(--ion-color-primary-tint),
      var(--ion-color-secondary-tint)
    );
  }

  .subsystem-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;

    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .subsystem-title {
    font-size: 2rem;
    font-weight: bold;
    color: var(--ion-color-primary);
    margin: 0 0 12px 0;
  }

  .subsystem-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .subsystem-intro {
    font-size: 1.1rem;
    color: var(--ion-color-dark);
    line-height: 1.6;
    margin: 0;

    &.fallback {
      color: var(--ion-color-medium);
      font-style: italic;
    }
  }

  // AI Status
  .ai-status-card {
    margin-bottom: 20px;
    --background: var(--ion-color-light);
  }

  .ai-status {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--ion-color-medium);
    font-size: 0.9rem;
  }

  // Section Cards
  .section-card {
    margin-bottom: 24px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    user-select: none;

    &:hover {
      background: var(--ion-color-light-tint);
      border-radius: 8px;
      margin: -8px;
      padding: 8px;
    }

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
    }
  }

  // Overview Section
  .overview-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .overview-item {
    h4 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin: 0 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 2px solid var(--ion-color-primary);
      display: inline-block;
    }

    p {
      color: var(--ion-color-dark);
      line-height: 1.6;
      margin: 0;
    }
  }

  .entry-points {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .entry-chip {
    position: relative;

    a {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--ion-color-success-contrast);

      ion-icon {
        font-size: 0.8rem;
      }
    }
  }

  .dependencies {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  // Files Section
  .files-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .file-item {
    border: 1px solid var(--ion-color-light);
    border-radius: 8px;
    overflow: hidden;
  }

  .file-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    cursor: pointer;
    background: var(--ion-color-light-tint);

    &:hover {
      background: var(--ion-color-light);
    }
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;

    ion-icon {
      color: var(--ion-color-medium);
    }
  }

  .file-path {
    font-family: "Courier New", monospace;
    font-size: 0.9rem;
    color: var(--ion-color-dark);
    flex: 1;
  }

  .github-link {
    color: var(--ion-color-medium);
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: var(--ion-color-primary);
    }

    ion-icon {
      font-size: 1rem;
    }
  }

  .expand-icon {
    color: var(--ion-color-medium);
    font-size: 1rem;
  }

  .file-details {
    padding: 16px;
    border-top: 1px solid var(--ion-color-light);
    background: white;
  }

  .file-explanation {
    margin-bottom: 12px;

    h5 {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin: 0 0 8px 0;
    }

    p {
      color: var(--ion-color-dark);
      line-height: 1.5;
      margin: 0;

      &.generating {
        color: var(--ion-color-medium);
        font-style: italic;
      }
    }
  }

  .file-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .file-size {
    color: var(--ion-color-medium);
    font-size: 0.8rem;
  }

  // Interfaces Section
  .interfaces-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .interface-item {
    border: 1px solid var(--ion-color-light);
    border-radius: 8px;
    padding: 16px;
    background: var(--ion-color-light-tint);
  }

  .interface-header {
    margin-bottom: 12px;
  }

  .interface-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .interface-name {
    font-family: "Courier New", monospace;
    font-weight: bold;
    color: var(--ion-color-primary);
    font-size: 1.1rem;
  }

  .interface-file {
    color: var(--ion-color-medium);
    font-size: 0.9rem;
  }

  .interface-signature {
    position: relative;
    margin: 12px 0;

    pre {
      background: var(--ion-color-dark);
      color: var(--ion-color-light);
      padding: 12px;
      border-radius: 6px;
      font-size: 0.85rem;
      line-height: 1.4;
      overflow-x: auto;
      margin: 0;

      code {
        font-family: "Courier New", monospace;
      }
    }

    ion-button {
      position: absolute;
      top: 8px;
      right: 8px;
      --color: var(--ion-color-light);
    }
  }

  .interface-explanation {
    p {
      color: var(--ion-color-dark);
      line-height: 1.5;
      margin: 0;

      &.fallback {
        color: var(--ion-color-medium);
        font-style: italic;
      }
    }
  }

  // Examples Section
  .examples-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .example-item {
    border: 1px solid var(--ion-color-light);
    border-radius: 8px;
    overflow: hidden;
  }

  .example-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--ion-color-light-tint);
    border-bottom: 1px solid var(--ion-color-light);

    h5 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin: 0;
    }
  }

  .example-code {
    position: relative;

    pre {
      background: var(--ion-color-dark);
      color: var(--ion-color-light);
      padding: 16px;
      margin: 0;
      font-size: 0.85rem;
      line-height: 1.5;
      overflow-x: auto;

      code {
        font-family: "Courier New", monospace;
      }
    }
  }

  // Related Subsystems
  .related-subsystems {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .related-chip {
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover {
      transform: translateY(-2px);
    }
  }

  .fallback-content {
    color: var(--ion-color-medium);
    font-style: italic;
    text-align: center;
    padding: 20px;
  }

  // Responsive Design
  @media (max-width: 768px) {
    .subsystem-docs-container {
      padding: 0 8px;
    }

    .subsystem-title {
      font-size: 1.5rem;
    }

    .file-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .interface-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }
</style>
