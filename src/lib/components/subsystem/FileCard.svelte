<script lang="ts">
  import type { GitHubFile } from "$types/repository";
  import { makeOpenAIRequest } from "$services/ai-analyzer";
  import { firestore } from "$services/firestore";
  import {
    chevronUp,
    chevronDown,
    logoGithub,
    openOutline,
    documentOutline,
    logoJavascript,
    documentText,
    logoReact,
    logoPython,
    codeSlash,
    code,
    colorPalette,
    settings,
  } from "ionicons/icons";

  interface Props {
    file: GitHubFile;
    repoId: string;
    subsystemName: string;
    framework?: string;
    repoFullName: string;
    repoUrl: string;
    storedExplanations?: Record<string, { explanation: string; generatedAt: string; filePath: string }>;
  }

  let { file, repoId, subsystemName, framework, repoFullName, repoUrl, storedExplanations }: Props = $props();

  // Local state for expanded/collapsed
  let expanded = $state(false);
  let generating = $state(false);
  let explanationText = $state("");
  
  // Initialize explanation from stored data
  $effect(() => {
    const encodedPath = btoa(file.path);
    explanationText = storedExplanations?.[encodedPath]?.explanation || "";
  });

  async function toggleExpanded() {
    expanded = !expanded;
    
    // Generate explanation on first expansion if not already present
    if (expanded && !explanationText && !generating) {
      await generateExplanation();
    }
  }

  async function generateExplanation() {
    if (generating || explanationText) return;
    
    generating = true;
    
    try {
      const prompt = `Explain the purpose and role of this file in a ${framework || 'web'} project:

File: ${file.path}
Project: ${repoFullName}
Framework: ${framework || 'Unknown'}
Subsystem: ${subsystemName}

Provide a concise, technical explanation (2-3 sentences) of what this file does and why it's important in this subsystem. Focus on its specific role and functionality.`;

      const response = await makeOpenAIRequest(prompt);
      
      if (response.success && response.data) {
        explanationText = response.data.trim();
        
        // Save explanation to Firestore - store in separate field to avoid path issues
        const updateData = {
          [`data.fileExplanations.${btoa(file.path)}`]: {
            explanation: explanationText,
            generatedAt: new Date().toISOString(),
            filePath: file.path
          }
        };
        
        await firestore.update('repositories', repoId, updateData);
      }
    } catch (error) {
      console.warn(`Failed to generate explanation for ${file.path}:`, error);
    } finally {
      generating = false;
    }
  }

  // Helper function to get the appropriate icon for a file type
  function getFileIcon(filePath: string): string {
    const ext = getFileExtension(filePath);
    const iconMap: Record<string, string> = {
      js: logoJavascript,
      jsx: logoReact,
      ts: documentText,
      tsx: logoReact,
      py: logoPython,
      svelte: codeSlash,
      html: code,
      css: colorPalette,
      scss: colorPalette,
      json: documentText,
      md: documentText,
      yml: settings,
      yaml: settings,
    };
    return iconMap[ext] || documentOutline;
  }

  function getFileExtension(filePath: string): string {
    return filePath.split(".").pop()?.toLowerCase() || "";
  }

  function createGitHubLink(filePath: string): string {
    return `${repoUrl}/blob/main/${filePath}`;
  }
</script>

<div class="file-item">
  <header>
    <button class="card-toggle" onclick={toggleExpanded}>
      <div class="file-info">
        <ion-icon color="medium" icon={getFileIcon(file.path)}></ion-icon>

        <span class="file-path">{file.path}</span>
      </div>

      <ion-icon icon={expanded ? chevronUp : chevronDown} class="expand-icon"
      ></ion-icon>
    </button>

    <ion-button
      href={createGitHubLink(file.path)}
      target="_blank"
      rel="noopener"
      class="github-link"
      fill="clear"
      color="dark"
      title="view file on GitHub"
    >
      <ion-icon slot="icon-only" icon={logoGithub}></ion-icon>
    </ion-button>
  </header>

  {#if expanded}
    <div class="file-details">
      {#if generating}
        <div class="file-explanation">
          <p class="generating">Generating explanation...</p>
        </div>
      {:else if explanationText}
        <div class="file-explanation">
          <h5>Purpose</h5>
          <p>{explanationText}</p>
        </div>
      {:else}
        <div class="file-explanation">
          <p class="no-explanation">No explanation available yet.</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .file-item {
    border: 1px solid var(--ion-color-light-shade);
    border-radius: 8px;
    overflow: hidden;
    transition: box-shadow 0.2s;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }

  header {
    position: relative;

    button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      transition: background-color 0.2s;
      background-color: var(--ion-color-light-tint);
      width: 100%;

      &:hover {
        background-color: var(--ion-color-light);
      }
    }
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-grow: 1;
    min-width: 0;
  }

  .file-path {
    font-family: var(--ion-font-family-monospace, monospace);
    font-size: 0.9rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .expand-icon {
    color: var(--ion-color-medium);
    font-size: 1.25rem;
    padding-left: 0.25em;
  }

  .github-link {
    position: absolute;
    right: 35px;
    top: 42%;
    transform: translateY(-50%);

    ion-icon {
      font-size: 1.25rem;
    }
  }

  .file-details {
    padding: 16px;
    border-top: 1px solid var(--ion-color-light);
  }

  .file-explanation {
    margin-bottom: 16px;

    h5 {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin: 0 0 8px 0;
    }

    p {
      margin: 0;
      color: var(--ion-color-dark-shade);
      line-height: 1.6;
      font-size: 0.9rem;
    }

    .generating,
    .no-explanation {
      color: var(--ion-color-medium);
      font-style: italic;
    }
  }

  .file-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    ion-button {
      --padding-start: 8px;
      --padding-end: 8px;
      font-size: 0.85rem;
    }
  }

  .file-size {
    font-size: 0.85rem;
    color: var(--ion-color-medium);
  }

  // Responsive adjustments
  @media (max-width: 768px) {
    .file-info {
      gap: 8px;

      ion-icon {
        font-size: 1.25rem;
      }
    }

    .file-path {
      font-size: 0.85rem;
    }
  }
</style>
