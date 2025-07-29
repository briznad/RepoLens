<script lang="ts">
  import type { GitHubFile } from '$types/repository';
  import { 
    logoJavascript, 
    logoReact, 
    documentText, 
    logoPython, 
    codeSlash, 
    code, 
    colorPalette, 
    settings, 
    documentOutline, 
    logoGithub 
  } from 'ionicons/icons';

  interface Props {
    files: GitHubFile[];
    title: string;
    icon: any; // Icon object from ionicons/icons
    emptyMessage?: string;
    maxDisplayed?: number;
    createGitHubLink?: (filePath: string) => string;
  }

  let { 
    files, 
    title, 
    icon, 
    emptyMessage = 'No files detected',
    maxDisplayed = 5,
    createGitHubLink
  }: Props = $props();

  function getFileIcon(filePath: string): any {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const iconMap: Record<string, any> = {
      'js': logoJavascript,
      'jsx': logoReact, 
      'ts': documentText,
      'tsx': logoReact,
      'py': logoPython,
      'svelte': codeSlash,
      'html': code,
      'css': colorPalette,
      'scss': colorPalette,
      'json': documentText,
      'md': documentText,
      'yml': settings,
      'yaml': settings
    };
    return iconMap[ext] || documentOutline;
  }

  const displayedFiles = files.slice(0, maxDisplayed);
</script>

<div class="info-section">
  <h4>
    <ion-icon icon={icon}></ion-icon>
    {title}
  </h4>
  {#if displayedFiles.length > 0}
    <ion-list>
      {#each displayedFiles as file}
        <ion-item lines="none" class="file-item">
          <ion-icon icon={getFileIcon(file.path)} slot="start"></ion-icon>
          <ion-label>{file.path}</ion-label>
          {#if createGitHubLink}
            <a 
              href={createGitHubLink(file.path)} 
              target="_blank" 
              rel="noopener"
              class="github-link"
              slot="end"
            >
              <ion-icon icon={logoGithub}></ion-icon>
            </a>
          {/if}
        </ion-item>
      {/each}
    </ion-list>
    {#if files.length > maxDisplayed}
      <p class="more-files">...and {files.length - maxDisplayed} more files</p>
    {/if}
  {:else}
    <p class="no-items">{emptyMessage}</p>
  {/if}
</div>

<style lang="scss">
  .info-section {
    h4 {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--ion-color-primary);
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
  }

  .file-item {
    --padding-start: 0;
    --padding-end: 0;
    --min-height: 36px;
    
    ion-icon {
      color: var(--ion-color-medium);
      margin-right: 8px;
    }
    
    ion-label {
      font-size: 0.9rem;
      color: var(--ion-color-dark);
    }
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

  .no-items {
    color: var(--ion-color-medium);
    font-style: italic;
    margin: 8px 0;
  }

  .more-files {
    color: var(--ion-color-medium);
    font-size: 0.9rem;
    margin: 8px 0 0 0;
    font-style: italic;
  }
</style>