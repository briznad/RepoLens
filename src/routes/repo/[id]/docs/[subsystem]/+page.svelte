<script lang="ts">
  import { goto } from "$app/navigation";
  import { generateInlineCitations } from "$utilities/repo-analyzer";
  import { makeOpenAIRequest, generateSubsystemDescription } from "$services/ai-analyzer";
  import { firestore } from "$services/firestore";
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
    gitNetworkOutline,
    arrowForward,
    layersOutline,
    chevronUp,
    chevronDown,
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
  let generatingSubsystemDescription = $state(false);
  let currentSubsystemName = $state(subsystemName);

  // Enhanced content state
  let relatedSubsystems = $state<string[]>([]);
  let architectureRole = $state<string>("");
  
  // Local state for subsystem description
  let localSubsystemDescription = $state(subsystemDescription);

  // UI state
  let expandedSections = $state<Set<string>>(new Set(["overview", "files"]));
  let copiedStates = $state<Record<string, boolean>>({});

  // Detect subsystem changes and reset state
  $effect(() => {
    if (subsystemName !== currentSubsystemName) {
      // Subsystem has changed, reset everything
      currentSubsystemName = subsystemName;
      localSubsystemDescription = subsystemDescription || null;
      relatedSubsystems = [];
      architectureRole = "";
      
      // Clear any copied states
      copiedStates = {};
    }
  });

  // Generate enhanced documentation when subsystem changes or on initial load
  $effect(() => {
    if (subsystem && analysis) {
      generateEnhancedDocumentation();
    }
  });

  // Generate enhanced AI documentation
  async function generateEnhancedDocumentation() {
    if (!subsystem || !repo || !analysis) return;

    // Check if we already have all the content for this subsystem
    if (currentSubsystemName === subsystemName && 
        localSubsystemDescription && 
        architectureRole) {
      return; // Content already generated for this subsystem
    }

    generatingAI = true;

    try {
      // Generate subsystem description if missing
      if (!localSubsystemDescription) {
        await generateSubsystemDescriptionOnDemand();
      }

      // Generate architecture role explanation
      if (!architectureRole) {
        await generateArchitectureRole();
      }

      // Find related subsystems
      findRelatedSubsystems();
    } catch (err) {
      console.warn("AI documentation generation failed:", err);
    } finally {
      generatingAI = false;
    }
  }

  // Generate subsystem description on demand
  async function generateSubsystemDescriptionOnDemand() {
    if (!subsystem || !analysis) return;

    console.log('Generating subsystem description for:', subsystemName);
    generatingSubsystemDescription = true;

    try {
      const description = await generateSubsystemDescription(
        subsystemName,
        subsystemFiles,
        analysis
      );

      localSubsystemDescription = description;

      // Update the analysis object with the new subsystem description
      const updatedDescriptions = analysis.subsystemDescriptions || [];
      
      // Check if this subsystem already has a description and update it
      const existingIndex = updatedDescriptions.findIndex(
        (desc: SubsystemDescription) => desc.name === subsystemName
      );
      
      if (existingIndex >= 0) {
        updatedDescriptions[existingIndex] = description;
      } else {
        updatedDescriptions.push(description);
      }

      // Save to Firestore with proper path
      const updateData = {
        'analysisData.subsystemDescriptions': updatedDescriptions
      };

      await firestore.update("repositories", repoId, updateData);
      
      // Update the local analysis object so subsequent loads don't regenerate
      analysis.subsystemDescriptions = updatedDescriptions;
    } catch (err) {
      console.warn("Failed to generate subsystem description:", err);
    } finally {
      generatingSubsystemDescription = false;
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
      subsystem.files.map((filePath: string) => filePath.toLowerCase())
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
      subsystemDescription={localSubsystemDescription}
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


  // Files Section
  .files-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
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

  // Responsive Design
  @media (max-width: 768px) {
  }
</style>
