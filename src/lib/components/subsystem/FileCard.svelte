<script lang="ts">
  import type { GitHubFile } from "$types/repository";
  import { makeOpenAIRequest } from "$services/ai-analyzer";
  import { fetchFileContent } from "$services/github-api";
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
    terminal,
    library,
  } from "ionicons/icons";
  import { onMount } from "svelte";

  // PrismJS imports for syntax highlighting
  let Prism: any;
  
  onMount(async () => {
    // Dynamically import PrismJS to avoid SSR issues
    const prismModule = await import('prismjs');
    Prism = prismModule.default;
    
    // Import common language components
    await import('prismjs/components/prism-javascript');
    await import('prismjs/components/prism-typescript');
    await import('prismjs/components/prism-jsx');
    await import('prismjs/components/prism-tsx');
    await import('prismjs/components/prism-python');
    await import('prismjs/components/prism-json');
    await import('prismjs/components/prism-css');
    await import('prismjs/components/prism-scss');
    await import('prismjs/components/prism-yaml');
    await import('prismjs/components/prism-markdown');
    await import('prismjs/components/prism-bash');
    
    // For Svelte files, we'll use markup (HTML) syntax highlighting
    await import('prismjs/components/prism-markup');
    
    // Import CSS theme
    await import('prismjs/themes/prism.css');
  });

  interface Props {
    file: GitHubFile;
    repoId: string;
    subsystemName: string;
    framework?: string;
    repoFullName: string;
    repoUrl: string;
    storedExplanations?: Record<
      string,
      { explanation: string; generatedAt: string; filePath: string }
    >;
  }

  let {
    file,
    repoId,
    subsystemName,
    framework,
    repoFullName,
    repoUrl,
    storedExplanations,
  }: Props = $props();

  // Local state for expanded/collapsed
  let expanded = $state(false);
  let generating = $state(false);
  let explanationText = $state("");
  
  // New state for code display
  let currentView = $state<'explanation' | 'code'>('explanation');
  let fileContent = $state<string>('');
  let loadingContent = $state(false);
  let contentError = $state<string>('');

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
      const prompt = `Explain the purpose and role of this file in a ${framework || "web"} project:

File: ${file.path}
Project: ${repoFullName}
Framework: ${framework || "Unknown"}
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
            filePath: file.path,
          },
        };

        await firestore.update("repositories", repoId, updateData);
      }
    } catch (error) {
      console.warn(`Failed to generate explanation for ${file.path}:`, error);
    } finally {
      generating = false;
    }
  }

  async function loadFileContent() {
    if (loadingContent || fileContent) return;

    loadingContent = true;
    contentError = '';

    try {
      const [owner, repo] = repoFullName.split('/');
      const content = await fetchFileContent(owner, repo, file.path);
      fileContent = content;
    } catch (error) {
      console.warn(`Failed to load file content for ${file.path}:`, error);
      contentError = 'Failed to load file content';
    } finally {
      loadingContent = false;
    }
  }

  function getLanguageFromPath(filePath: string): string {
    const ext = getFileExtension(filePath);
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      svelte: 'markup', // Use markup (HTML) highlighting for Svelte files
      html: 'markup',
      css: 'css',
      scss: 'scss',
      json: 'json',
      md: 'markdown',
      yml: 'yaml',
      yaml: 'yaml',
      sh: 'bash',
      bash: 'bash'
    };
    return languageMap[ext] || 'text';
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function highlightCode(code: string, language: string): string {
    if (!Prism || !code) return escapeHtml(code);
    
    try {
      // Ensure the language is loaded
      if (Prism.languages[language]) {
        return Prism.highlight(code, Prism.languages[language], language);
      }
      return escapeHtml(code);
    } catch (error) {
      console.warn('Failed to highlight code:', error);
      return escapeHtml(code);
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
      <!-- View Toggle Buttons -->
      <div class="view-controls">
        <ion-segment value={currentView}>
          <ion-segment-button value="explanation" onclick={() => currentView = 'explanation'}>
            <ion-label>Purpose</ion-label>
          </ion-segment-button>
          <ion-segment-button value="code" onclick={() => { currentView = 'code'; loadFileContent(); }}>
            <ion-label>Code</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      {#if currentView === 'explanation'}
        {#if generating}
          <div class="file-explanation">
            <p class="generating">Generating explanation...</p>
            <ion-skeleton-text animated style="width: 100%; margin-top: 8px;"></ion-skeleton-text>
            <ion-skeleton-text animated style="width: 80%; margin-top: 4px;"></ion-skeleton-text>
            <ion-skeleton-text animated style="width: 60%; margin-top: 4px;"></ion-skeleton-text>
          </div>
        {:else if explanationText}
          <div class="file-explanation">
            <p>{explanationText}</p>
          </div>
        {:else}
          <div class="file-explanation">
            <p class="no-explanation">No explanation available yet.</p>
          </div>
        {/if}
      {:else if currentView === 'code'}
        <div class="file-code">
          {#if loadingContent}
            <div class="loading-content">
              <p class="loading-text">Loading file content...</p>
              <ion-skeleton-text animated style="width: 100%; margin-top: 8px;"></ion-skeleton-text>
              <ion-skeleton-text animated style="width: 90%; margin-top: 4px;"></ion-skeleton-text>
              <ion-skeleton-text animated style="width: 85%; margin-top: 4px;"></ion-skeleton-text>
              <ion-skeleton-text animated style="width: 95%; margin-top: 4px;"></ion-skeleton-text>
            </div>
          {:else if contentError}
            <div class="error-content">
              <p class="error-text">{contentError}</p>
            </div>
          {:else if fileContent}
            <div class="code-container">
              <div class="code-header">
                <span class="file-name">{file.path}</span>
                <span class="file-size">{file.size ? `${Math.round(file.size / 1024)}KB` : ''}</span>
              </div>
              <pre class="code-content"><code class={`language-${getLanguageFromPath(file.path)}`}>{@html highlightCode(fileContent, getLanguageFromPath(file.path))}</code></pre>
            </div>
          {:else}
            <div class="no-content">
              <p>No content available for this file.</p>
            </div>
          {/if}
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

  .view-controls {
    margin-bottom: 16px;
    
    ion-segment {
      --background: var(--ion-color-light);
      --color-checked: var(--ion-color-primary);
    }
  }

  .file-code {
    margin-top: 8px;
  }

  .loading-content,
  .error-content,
  .no-content {
    padding: 16px;
    text-align: center;
    
    .loading-text,
    .error-text {
      color: var(--ion-color-medium);
      font-style: italic;
      margin: 0 0 8px 0;
    }
    
    .error-text {
      color: var(--ion-color-danger);
    }
  }

  .code-container {
    border: 1px solid var(--ion-color-light-shade);
    border-radius: 6px;
    overflow: hidden;
    background: var(--ion-color-light-tint);
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--ion-color-light);
    border-bottom: 1px solid var(--ion-color-light-shade);
    font-size: 0.85rem;
    
    .file-name {
      font-family: var(--ion-font-family-monospace, monospace);
      font-weight: 500;
      color: var(--ion-color-dark);
    }
    
    .file-size {
      color: var(--ion-color-medium);
    }
  }

  .code-content {
    margin: 0;
    padding: 16px;
    background: #f8f9fa;
    font-family: var(--ion-font-family-monospace, 'Consolas', 'Monaco', 'Courier New', monospace);
    font-size: 0.85rem;
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre;
    
    code {
      background: none;
      padding: 0;
      font-family: inherit;
      font-size: inherit;
    }
    
    // PrismJS theme adjustments
    :global(.token.comment),
    :global(.token.prolog),
    :global(.token.doctype),
    :global(.token.cdata) {
      color: #708090;
      font-style: italic;
    }
    
    :global(.token.punctuation) {
      color: #999;
    }
    
    :global(.token.property),
    :global(.token.tag),
    :global(.token.boolean),
    :global(.token.number),
    :global(.token.constant),
    :global(.token.symbol),
    :global(.token.deleted) {
      color: #905;
    }
    
    :global(.token.selector),
    :global(.token.attr-name),
    :global(.token.string),
    :global(.token.char),
    :global(.token.builtin),
    :global(.token.inserted) {
      color: #690;
    }
    
    :global(.token.operator),
    :global(.token.entity),
    :global(.token.url),
    :global(.language-css .token.string),
    :global(.style .token.string) {
      color: #9a6e3a;
    }
    
    :global(.token.atrule),
    :global(.token.attr-value),
    :global(.token.keyword) {
      color: #07a;
    }
    
    :global(.token.function),
    :global(.token.class-name) {
      color: #DD4A68;
    }
    
    :global(.token.regex),
    :global(.token.important),
    :global(.token.variable) {
      color: #e90;
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
