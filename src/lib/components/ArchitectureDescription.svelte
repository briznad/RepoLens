<script lang="ts">
  import { sparklesOutline } from 'ionicons/icons';

  interface Props {
    title?: string;
    description: string;
    isGenerating: boolean;
    loadingMessage?: string;
  }

  let { 
    title = "Architecture Analysis",
    description,
    isGenerating,
    loadingMessage = "Generating AI-powered architecture description..."
  }: Props = $props();

  function processMarkdown(content: string): string {
    if (!content) return '';
    
    return content
      // Convert headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Convert lists
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
      .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
      // Wrap consecutive list items in ul/ol tags
      .replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        // Check if it's an ordered list (starts with number)
        const isOrdered = /^\d+\./.test(match);
        return isOrdered ? `<ol>${match}</ol>` : `<ul>${match}</ul>`;
      })
      // Convert bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Convert inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Convert line breaks
      .replace(/\n\n/g, '</p><p>')
      // Wrap in paragraphs
      .replace(/^(.+)$/gm, (match) => {
        // Don't wrap if it's already an HTML tag
        if (match.startsWith('<')) return match;
        return `<p>${match}</p>`;
      })
      // Clean up empty paragraphs
      .replace(/<p><\/p>/g, '');
  }
</script>

{#if description || isGenerating}
  <ion-card class="description-card">
    <ion-card-header>
      <ion-card-title>
        <ion-icon icon={sparklesOutline}></ion-icon>
        {title}
      </ion-card-title>
    </ion-card-header>

    <ion-card-content>
      {#if isGenerating}
        <div class="generating-description">
          <p>{loadingMessage}</p>
          <ion-skeleton-text animated style="width: 100%; margin-top: 12px;"></ion-skeleton-text>
          <ion-skeleton-text animated style="width: 90%; margin-top: 8px;"></ion-skeleton-text>
          <ion-skeleton-text animated style="width: 95%; margin-top: 8px;"></ion-skeleton-text>
          <ion-skeleton-text animated style="width: 80%; margin-top: 8px;"></ion-skeleton-text>
        </div>
      {:else}
        <div class="architecture-description">
          {@html processMarkdown(description)}
        </div>
      {/if}
    </ion-card-content>
  </ion-card>
{/if}

<style lang="scss">
  .description-card {
    margin-bottom: 20px;

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .generating-description {
    color: var(--ion-color-medium);

    p {
      margin: 0 0 4px 0;
    }
  }

  .architecture-description {
    line-height: 1.6;
    color: var(--ion-color-dark);

    :global(h1),
    :global(h2),
    :global(h3) {
      font-weight: 600;
      margin: 1.2em 0 0.6em 0;
      color: var(--ion-color-primary);
    }

    :global(h1) { font-size: 1.4rem; }
    :global(h2) { font-size: 1.2rem; }
    :global(h3) { font-size: 1.1rem; }

    :global(p) {
      margin: 0 0 1em 0;
    }

    :global(ul),
    :global(ol) {
      margin: 0.5em 0 1em 0;
      padding-left: 1.5em;
    }

    :global(li) {
      margin: 0.25em 0;
    }

    :global(strong) {
      font-weight: 600;
      color: var(--ion-color-dark);
    }

    :global(em) {
      font-style: italic;
    }

    :global(code) {
      background: var(--ion-color-light);
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.9em;
    }
  }
</style>