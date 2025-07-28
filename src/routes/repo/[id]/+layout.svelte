<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getRepoById } from '$lib/services/repository';
  import type { 
    FirestoreRepo, 
    AnalysisResult, 
    AnalysisStatus,
    Subsystem
  } from '$lib/types';
  
  interface Props {
    children: Snippet;
  }
  
  let { children }: Props = $props();
  
  const repoId = $derived($page.params.id);
  const currentPath = $derived($page.url.pathname);
  
  // State management
  let repo = $state<FirestoreRepo | null>(null);
  let analysis = $state<AnalysisResult | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let sidebarOpen = $state(false);
  let subsystemsExpanded = $state(true);
  
  // Freshness checking
  let analysisStale = $state(false);
  let analysisAge = $state<string>('');
  let refreshing = $state(false);
  
  // Load repository data on mount
  onMount(async () => {
    if (!repoId) {
      error = 'Repository ID not found';
      loading = false;
      return;
    }

    try {
      const repoData = await getRepoById(repoId);
      if (!repoData) {
        error = 'Repository not found';
        // Redirect to home after a brief delay
        setTimeout(() => goto('/'), 2000);
        loading = false;
        return;
      }

      repo = repoData;
      analysis = repoData.analysisData || null;
      
      // Check analysis freshness
      checkAnalysisFreshness();
      
      // If no analysis or stale analysis, redirect to analyze page
      if (!analysis || (analysisStale && repoData.analysisStatus !== 'analyzing')) {
        setTimeout(() => goto('/analyze'), 1000);
        return;
      }
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load repository';
      setTimeout(() => goto('/'), 3000);
    } finally {
      loading = false;
    }
  });

  // Check if analysis is fresh or stale
  function checkAnalysisFreshness() {
    if (!repo || !repo.lastAnalyzed) {
      analysisStale = true;
      return;
    }

    const lastAnalyzed = new Date(repo.lastAnalyzed);
    const githubUpdated = new Date(repo.githubPushedAt);
    const now = new Date();
    
    // Analysis is stale ONLY if GitHub repo was updated after our last analysis
    analysisStale = githubUpdated > lastAnalyzed;
    
    // Calculate age string for display purposes
    const ageMs = now.getTime() - lastAnalyzed.getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageHours / 24);
    
    if (ageDays > 0) {
      analysisAge = `${ageDays} day${ageDays > 1 ? 's' : ''} ago`;
    } else if (ageHours > 0) {
      analysisAge = `${ageHours} hour${ageHours > 1 ? 's' : ''} ago`;
    } else {
      analysisAge = 'Recently';
    }
  }

  // Navigation structure prioritizing documentation
  const navigationSections = $derived([
    { 
      title: 'Documentation', 
      url: `/repo/${repoId}/docs`, 
      icon: 'library-outline',
      primary: true,
      expandable: true,
      expanded: subsystemsExpanded
    },
    { 
      title: 'Chat with Iris', 
      url: `/repo/${repoId}`, 
      icon: 'chatbubbles-outline',
      primary: false
    },
    { 
      title: 'Architecture', 
      url: `/repo/${repoId}/graph`, 
      icon: 'git-network-outline',
      primary: false
    }
  ]);

  // Get subsystems for documentation menu
  const subsystems = $derived(analysis?.subsystems || []);

  // Handle navigation
  const handleNavClick = (url: string) => {
    goto(url);
    if (window.innerWidth < 768) {
      sidebarOpen = false;
    }
  };

  const handleSubsystemClick = (subsystemName: string) => {
    const url = `/repo/${repoId}/docs/${encodeURIComponent(subsystemName)}`;
    goto(url);
    if (window.innerWidth < 768) {
      sidebarOpen = false;
    }
  };

  const handleRefreshAnalysis = async () => {
    if (!repo || refreshing) return;
    
    refreshing = true;
    try {
      // Redirect to analyze page with the repository URL
      goto('/analyze', { state: { repositoryUrl: repo.url } });
    } catch (err) {
      console.error('Failed to refresh analysis:', err);
    } finally {
      refreshing = false;
    }
  };

  const toggleSubsystems = () => {
    subsystemsExpanded = !subsystemsExpanded;
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFrameworkColor = (framework: string): string => {
    const colors: Record<string, string> = {
      'react': 'primary',
      'nextjs': 'secondary', 
      'svelte': 'tertiary',
      'flask': 'success',
      'fastapi': 'warning',
      'unknown': 'medium'
    };
    return colors[framework] || 'medium';
  };

  const isCurrentSubsystem = (subsystemName: string): boolean => {
    const pathParts = currentPath.split('/');
    const currentSubsystem = pathParts[pathParts.length - 1];
    return decodeURIComponent(currentSubsystem) === subsystemName;
  };
</script>

{#if loading}
  <div class="loading-layout">
    <ion-content class="ion-padding">
      <div class="loading-container">
        <ion-spinner name="dots"></ion-spinner>
        <p>Loading repository...</p>
      </div>
    </ion-content>
  </div>
{:else if error}
  <div class="error-layout">
    <ion-content class="ion-padding">
      <div class="error-container">
        <ion-card class="error-card">
          <ion-card-header>
            <ion-card-title color="danger">
              <ion-icon name="warning-outline"></ion-icon>
              Repository Error
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>{error}</p>
            <div class="error-actions">
              <ion-button fill="outline" onclick={() => goto('/')}>
                <ion-icon name="home" slot="start"></ion-icon>
                Return Home
              </ion-button>
              <ion-button fill="solid" onclick={() => window.location.reload()}>
                <ion-icon name="refresh" slot="start"></ion-icon>
                Retry
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </div>
{:else if repo && analysis}
  <ion-split-pane content-id="main-content" when="md">
    <!-- Sidebar Menu -->
    <ion-menu content-id="main-content">
      <ion-header>
        <ion-toolbar>
          <ion-title>
            <ion-icon name="library-outline"></ion-icon>
            RepoLens
          </ion-title>
        </ion-toolbar>
      </ion-header>
      
      <ion-content>
        <!-- Repository Info Section -->
        <div class="repo-info-section">
          <div class="repo-header">
            <div class="repo-title">
              <h3>{repo.name}</h3>
              <ion-button 
                fill="clear" 
                size="small" 
                onclick={() => window.open(repo.url, '_blank')}
              >
                <ion-icon name="logo-github" slot="icon-only"></ion-icon>
              </ion-button>
            </div>
            <div class="repo-meta">
              <ion-chip color={getFrameworkColor(analysis.framework)} size="small">
                <ion-label>{analysis.framework}</ion-label>
              </ion-chip>
              <div class="analysis-status">
                {#if repo.analysisStatus === 'analyzing'}
                  <ion-chip color="warning" size="small">
                    <ion-icon name="hourglass-outline"></ion-icon>
                    <ion-label>Analyzing...</ion-label>
                  </ion-chip>
                {:else if analysisStale}
                  <ion-chip color="medium" size="small">
                    <ion-icon name="time-outline"></ion-icon>
                    <ion-label>Stale</ion-label>
                  </ion-chip>
                {:else}
                  <ion-chip color="success" size="small">
                    <ion-icon name="checkmark-circle-outline"></ion-icon>
                    <ion-label>Fresh</ion-label>
                  </ion-chip>
                {/if}
              </div>
            </div>
            <div class="repo-stats">
              <span class="stat">{analysis.fileCount} files</span>
              <span class="stat">{analysis.subsystems.length} subsystems</span>
            </div>
            <div class="timestamp-info">
              <div class="timestamp">
                <span class="label">Analyzed:</span>
                <span class="value">{analysisAge}</span>
              </div>
              <div class="timestamp">
                <span class="label">Updated:</span>
                <span class="value">{formatTimestamp(repo.githubPushedAt).split(',')[0]}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Main Navigation -->
        <ion-list class="navigation-list">
          {#each navigationSections as section}
            <div class="nav-section">
              <ion-item 
                button 
                onclick={() => section.expandable ? toggleSubsystems() : handleNavClick(section.url)}
                class:selected={currentPath.startsWith(section.url)}
                class:primary={section.primary}
              >
                <ion-icon name={section.icon} slot="start"></ion-icon>
                <ion-label class="nav-label">
                  <div class="nav-title">{section.title}</div>
                  {#if section.primary}
                    <div class="nav-subtitle">{subsystems.length} subsystems</div>
                  {/if}
                </ion-label>
                {#if section.expandable}
                  <ion-icon 
                    name={subsystemsExpanded ? 'chevron-up' : 'chevron-down'} 
                    slot="end"
                  ></ion-icon>
                {:else}
                  <ion-icon name="arrow-forward" slot="end" class="nav-arrow"></ion-icon>
                {/if}
              </ion-item>
              
              <!-- Subsystems submenu for Documentation -->
              {#if section.expandable && subsystemsExpanded && subsystems.length > 0}
                <div class="subsystems-menu">
                  {#each subsystems as subsystem}
                    <ion-item 
                      button 
                      class="subsystem-item"
                      class:selected={isCurrentSubsystem(subsystem.name)}
                      onclick={() => handleSubsystemClick(subsystem.name)}
                    >
                      <ion-icon name="layers-outline" slot="start"></ion-icon>
                      <ion-label>
                        <div class="subsystem-name">{subsystem.name}</div>
                        <div class="subsystem-info">{subsystem.files.length} files</div>
                      </ion-label>
                    </ion-item>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </ion-list>
        
        <!-- Quick Actions -->
        <ion-list class="actions-list">
          <ion-list-header>
            <ion-label>Actions</ion-label>
          </ion-list-header>
          
          <ion-item 
            button 
            onclick={handleRefreshAnalysis}
            disabled={refreshing}
          >
            <ion-icon name={refreshing ? 'hourglass-outline' : 'refresh-outline'} slot="start"></ion-icon>
            <ion-label>{refreshing ? 'Refreshing...' : 'Refresh Analysis'}</ion-label>
          </ion-item>
          
          <ion-item button onclick={() => goto('/')}>
            <ion-icon name="add-outline" slot="start"></ion-icon>
            <ion-label>Analyze New Repository</ion-label>
          </ion-item>
          
          <ion-item button onclick={() => navigator.share?.({ url: window.location.href })}>
            <ion-icon name="share-outline" slot="start"></ion-icon>
            <ion-label>Share Repository</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-menu>

    <!-- Main Content Area -->
    <div class="ion-page" id="main-content">
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-menu-button></ion-menu-button>
          </ion-buttons>
          
          <ion-title>
            <div class="header-title">
              <span class="repo-name">{repo.fullName}</span>
              <div class="header-meta">
                {#if analysisStale}
                  <ion-chip color="warning" size="small">
                    <ion-icon name="warning-outline"></ion-icon>
                    <ion-label>Analysis may be outdated</ion-label>
                  </ion-chip>
                {/if}
                {#if repo.analysisStatus === 'analyzing'}
                  <ion-chip color="primary" size="small">
                    <ion-icon name="sync-outline"></ion-icon>
                    <ion-label>Analysis in progress</ion-label>
                  </ion-chip>
                {/if}
              </div>
            </div>
          </ion-title>
          
          <ion-buttons slot="end">
            <ion-button 
              fill="clear" 
              onclick={() => window.open(repo.url, '_blank')}
              title="View on GitHub"
            >
              <ion-icon name="logo-github" slot="icon-only"></ion-icon>
            </ion-button>
            
            {#if analysisStale && repo.analysisStatus !== 'analyzing'}
              <ion-button 
                fill="clear" 
                color="warning" 
                onclick={handleRefreshAnalysis}
                title="Refresh Analysis"
              >
                <ion-icon name="refresh-outline" slot="icon-only"></ion-icon>
              </ion-button>
            {/if}
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      
      {@render children()}
    </div>
  </ion-split-pane>
{/if}

<style lang="scss">
  // Loading and Error States
  .loading-layout, .error-layout {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;

    p {
      color: var(--ion-color-medium);
      font-size: 1rem;
    }
  }

  .error-container {
    max-width: 500px;
    width: 100%;
  }

  .error-card {
    text-align: center;

    ion-card-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
  }

  .error-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 16px;

    @media (max-width: 480px) {
      flex-direction: column;
    }
  }

  // Repository Info Section
  .repo-info-section {
    padding: 16px;
    border-bottom: 2px solid var(--ion-color-light);
    margin-bottom: 16px;
    background: var(--ion-color-light-tint);
  }

  .repo-header {
    .repo-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;

      h3 {
        font-size: 1.2rem;
        font-weight: 600;
        color: var(--ion-color-dark);
        margin: 0;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      ion-button {
        --color: var(--ion-color-medium);
        margin-left: 8px;

        &:hover {
          --color: var(--ion-color-primary);
        }
      }
    }

    .repo-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;

      .analysis-status {
        margin-left: auto;
      }
    }

    .repo-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;

      .stat {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }

    .timestamp-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .timestamp {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;

        .label {
          color: var(--ion-color-medium);
        }

        .value {
          color: var(--ion-color-dark);
          font-weight: 500;
        }
      }
    }
  }

  // Navigation
  .navigation-list {
    margin-bottom: 16px;
  }

  .nav-section {
    margin-bottom: 8px;

    .nav-label {
      .nav-title {
        font-weight: 600;
        font-size: 1rem;
      }

      .nav-subtitle {
        font-size: 0.8rem;
        color: var(--ion-color-medium);
      }
    }

    .nav-arrow {
      color: var(--ion-color-medium);
      font-size: 0.9rem;
    }

    &:has(.primary.selected) {
      background: var(--ion-color-primary-tint);
      border-radius: 8px;
      margin: 4px 8px;
    }
  }

  // Subsystems Menu
  .subsystems-menu {
    background: var(--ion-color-light-tint);
    margin-left: 16px;
    border-left: 2px solid var(--ion-color-primary);
    border-radius: 0 8px 8px 0;

    .subsystem-item {
      --padding-start: 16px;
      --min-height: 44px;

      .subsystem-name {
        font-weight: 500;
        font-size: 0.9rem;
        color: var(--ion-color-dark);
      }

      .subsystem-info {
        font-size: 0.75rem;
        color: var(--ion-color-medium);
      }

      &.selected {
        --background: var(--ion-color-primary);
        --color: var(--ion-color-primary-contrast);

        .subsystem-name,
        .subsystem-info {
          color: var(--ion-color-primary-contrast);
        }

        ion-icon {
          color: var(--ion-color-primary-contrast);
        }
      }

      &:hover:not(.selected) {
        --background: var(--ion-color-primary-tint);
      }
    }
  }

  // Actions List
  .actions-list {
    ion-list-header {
      font-weight: 600;
      color: var(--ion-color-dark);
    }

    ion-item[disabled] {
      opacity: 0.6;
    }
  }

  // General Selection States
  .selected {
    --background: var(--ion-color-primary);
    --color: var(--ion-color-primary-contrast);

    ion-icon {
      color: var(--ion-color-primary-contrast);
    }
  }

  .primary.selected {
    --background: var(--ion-color-primary);
    --color: var(--ion-color-primary-contrast);
  }

  // Header
  .header-title {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    .repo-name {
      font-size: 1.1rem;
      font-weight: 600;
    }

    .header-meta {
      display: flex;
      gap: 4px;
      margin-top: 2px;
    }

    @media (max-width: 768px) {
      .repo-name {
        font-size: 0.95rem;
      }

      .header-meta {
        ion-chip {
          font-size: 0.7rem;
          height: 20px;
        }
      }
    }
  }

  // Mobile Responsiveness
  @media (max-width: 768px) {
    .repo-info-section {
      padding: 12px;

      .repo-header {
        .repo-title h3 {
          font-size: 1.1rem;
        }

        .repo-stats {
          gap: 12px;

          .stat {
            font-size: 0.8rem;
          }
        }

        .timestamp-info {
          .timestamp {
            font-size: 0.75rem;
          }
        }
      }
    }

    .nav-section {
      margin-bottom: 4px;

      .nav-label {
        .nav-title {
          font-size: 0.95rem;
        }

        .nav-subtitle {
          font-size: 0.75rem;
        }
      }
    }

    .subsystems-menu {
      margin-left: 12px;

      .subsystem-item {
        --padding-start: 12px;
        --min-height: 40px;

        .subsystem-name {
          font-size: 0.85rem;
        }

        .subsystem-info {
          font-size: 0.7rem;
        }
      }
    }
  }

  // Hover States
  ion-item:not(.selected):hover {
    --background: var(--ion-color-light);
  }

  ion-menu {
    --width: 280px;

    @media (max-width: 768px) {
      --width: 260px;
    }
  }

  // Split Pane Responsiveness
  ion-split-pane {
    --border: 1px solid var(--ion-color-light);
  }
</style>