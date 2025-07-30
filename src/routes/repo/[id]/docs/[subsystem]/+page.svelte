<script lang="ts">
  import { goto } from "$app/navigation";
  import { generateInlineCitations } from "$utilities/repo-analyzer";
  import { makeOpenAIRequest } from "$services/ai-analyzer";
  import type { FirestoreRepo, GitHubFile } from "$types/repository";
  import type {
    AnalysisResult,
    SubsystemReference,
    SubsystemDescription,
    FileInterface,
    CitationLink,
  } from "$types/analysis";
  import { getSubsystemFiles } from "$utilities/repo-analyzer";
  import SubsystemLoadingState from "$components/subsystem/LoadingState.svelte";
  import SubsystemErrorCard from "$components/subsystem/ErrorCard.svelte";
  import SubsystemBreadcrumb from "$components/subsystem/Breadcrumb.svelte";
  import SectionHeader from "$components/subsystem/SectionHeader.svelte";
  import AIGenerationStatus from "$components/AIGenerationStatus.svelte";
  import SubsystemOverview from "$components/subsystem/Overview.svelte";
  import FileCard from "$components/subsystem/FileCard.svelte";
  import {
    folderOutline,
    codeSlashOutline,
    codeWorkingOutline,
    gitNetworkOutline,
    arrowForward,
    logoGithub,
    openOutline,
    layersOutline,
    chevronUp,
    chevronDown,
    checkmark,
    copy,
  } from "ionicons/icons";

  interface Props {
    data: {
      repo: FirestoreRepo;
      analysis: AnalysisResult;
      subsystem: SubsystemReference;
      subsystemDescription: SubsystemDescription | null;
      repoId: string;
      subsystemName: string;
    };
  }

  let { data }: Props = $props();

  let {
    repo,
    analysis,
    subsystem,
    subsystemDescription,
    repoId,
    subsystemName,
  } = $derived(data);

  // Get actual file objects from the fileTree using the subsystem's file keys
  let subsystemFiles = $derived(
    subsystem && analysis ? getSubsystemFiles(subsystem, analysis.fileTree) : []
  );

  // Get stored file explanations from analysis data
  let storedExplanations = $derived((analysis as any)?.fileExplanations || {});

  // AI generation state
  let generatingAI = $state(false);

  // Enhanced content state (removing fileExplanations since it's now handled per-file)
  let functionExplanations = $state<Record<string, string>>({});
  let usageExamples = $state<string[]>([]);
  let relatedSubsystems = $state<string[]>([]);
  let architectureRole = $state<string>("");

  // UI state
  let expandedSections = $state<Set<string>>(new Set(["overview", "files"]));
  let copiedStates = $state<Record<string, boolean>>({});

  // Generate enhanced documentation on component initialization
  $effect(() => {
    if (subsystem && analysis) {
      generateEnhancedDocumentation();
    }
  });

  // Generate enhanced AI documentation
  async function generateEnhancedDocumentation() {
    if (!subsystem || !repo || !analysis) return;

    generatingAI = true;

    try {
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

  async function generateFunctionExplanations() {
    if (!analysis?.keyInterfaces || !subsystem) return;

    // Find interfaces related to this subsystem
    const subsystemInterfaces =
      analysis.keyInterfaces
        ?.filter((iface) =>
          subsystemFiles.some((file: GitHubFile) => file.path === iface.filePath)
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
      subsystem.files.map((f: string) => f.toLowerCase())
    );

    const related = analysis.subsystems
      .filter((s) => s.name !== subsystemName)
      .map((s) => {
        // Calculate relationship score based on file path similarity
        const sharedPatterns = s.files.filter((filePath) => {
          const path = filePath.toLowerCase();
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

  function handleRelatedClick(relatedName: string) {
    goto(`/repo/${repoId}/docs/${encodeURIComponent(relatedName)}`);
  }
</script>

<ion-content class="ion-padding">
  {#if repo && analysis && subsystem}
    <!-- Breadcrumb Navigation -->
    <SubsystemBreadcrumb repoName={repo.fullName} {subsystemName} {repoId} />

    <!-- Header Section -->
    <SectionHeader
      title={subsystemName}
      subtitle={subsystemDescription?.description ?? subsystem.description}
    />

    <!-- AI Generation Status -->
    <AIGenerationStatus isGenerating={generatingAI} />

    <!-- Overview Section -->
    <SubsystemOverview
      {subsystemDescription}
      {architectureRole}
      expanded={expandedSections.has("overview")}
      onToggle={() => toggleSection("overview")}
      onCreateGitHubLink={createGitHubLink}
    />

    <!-- Files Section -->
    <ion-card class="section-card">
      <ion-card-header>
        <div class="section-header" onclick={() => toggleSection("files")}>
          <ion-card-title>
            <ion-icon icon={folderOutline}></ion-icon>
            Files & Structure ({subsystemFiles.length})
          </ion-card-title>
          <ion-icon
            icon={expandedSections.has("files") ? chevronUp : chevronDown}
          ></ion-icon>
        </div>
      </ion-card-header>

      {#if expandedSections.has("files")}
        <ion-card-content>
          <div class="files-list">
            {#each subsystemFiles as file}
              <FileCard
                {file}
                {repoId}
                {subsystemName}
                framework={analysis?.framework}
                repoFullName={repo.fullName}
                repoUrl={repo.url}
                {storedExplanations}
              />
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
              <ion-icon icon={codeSlashOutline}></ion-icon>
              Key Functions & Interfaces
            </ion-card-title>
            <ion-icon
              icon={expandedSections.has("interfaces")
                ? chevronUp
                : chevronDown}
            ></ion-icon>
          </div>
        </ion-card-header>

        {#if expandedSections.has("interfaces")}
          <ion-card-content>
            <div class="interfaces-list">
              {#each analysis.keyInterfaces?.filter( (iface) => subsystemFiles.some((file: GitHubFile) => file.path === iface.filePath) ) || [] as iface}
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
                        <ion-icon icon={logoGithub}></ion-icon>
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
                          icon={copiedStates[`sig-${iface.name}`]
                            ? checkmark
                            : copy}
                          slot="start"
                        ></ion-icon>
                        {copiedStates[`sig-${iface.name}`] ? "Copied!" : "Copy"}
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
          <div class="section-header" onclick={() => toggleSection("examples")}>
            <ion-card-title>
              <ion-icon icon={codeWorkingOutline}></ion-icon>
              Usage Examples
            </ion-card-title>
            <ion-icon
              icon={expandedSections.has("examples") ? chevronUp : chevronDown}
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
                        icon={copiedStates[`example-${index}`]
                          ? checkmark
                          : copy}
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
            <ion-icon icon={gitNetworkOutline}></ion-icon>
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
                <ion-icon icon={layersOutline}></ion-icon>
                <ion-label>{related}</ion-label>
                <ion-icon icon={arrowForward}></ion-icon>
              </ion-chip>
            {/each}
          </div>
        </ion-card-content>
      </ion-card>
    {/if}
  {/if}
</ion-content>

<style lang="scss">
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
    gap: 8px;
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
    font-size: 1.25rem;
    padding-left: 0.25em;
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
    .subsystem-title {
      font-size: 1.5rem;
    }

    .interface-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }
</style>
