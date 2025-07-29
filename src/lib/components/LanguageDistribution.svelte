<script lang="ts">
  interface Props {
    languages: Record<string, number>;
    showTitle?: boolean;
  }

  let { languages, showTitle = true }: Props = $props();

  function getTotalSize(): number {
    return Object.values(languages).reduce((sum, size) => sum + size, 0);
  }

  function getLanguagePercentage(language: string, totalSize: number): number {
    if (totalSize === 0) return 0;
    return (languages[language] / totalSize) * 100;
  }

  const totalSize = getTotalSize();
  const sortedLanguages = Object.entries(languages).sort(([,a], [,b]) => b - a);
</script>

{#if Object.keys(languages).length > 0}
  <div class="language-section">
    {#if showTitle}
      <h3>Language Distribution</h3>
    {/if}
    <div class="language-bars">
      {#each sortedLanguages as [language, size]}
        <div class="language-bar">
          <div class="language-info">
            <span class="language-name">{language}</span>
            <span class="language-percentage">
              {getLanguagePercentage(language, totalSize).toFixed(1)}%
            </span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              style="width: {getLanguagePercentage(language, totalSize)}%"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .language-section {
    margin-top: 24px;
    
    h3 {
      font-size: 1.2rem;
      margin-bottom: 16px;
      color: var(--ion-color-dark);
    }
  }

  .language-bars {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .language-bar {
    .language-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 0.9rem;
      
      .language-name {
        font-weight: 500;
        color: var(--ion-color-dark);
      }
      
      .language-percentage {
        color: var(--ion-color-medium);
      }
    }
    
    .progress-bar {
      height: 6px;
      background: var(--ion-color-light);
      border-radius: 3px;
      overflow: hidden;
      
      .progress-fill {
        height: 100%;
        background: var(--ion-color-primary);
        transition: width 0.3s ease;
      }
    }
  }
</style>