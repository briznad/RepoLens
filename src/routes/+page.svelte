<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { firestore } from "$lib/services/firestore";
  import type { StoredRepository } from "$types/repository";
  import { parseGitHubUrl } from "$lib/github";

  let repoUrl = $state("");
  let isLoading = $state(false);
  let error = $state("");
  let recentRepos = $state<StoredRepository[]>([]);
  let loadingRecent = $state(true);

  // Load recent repositories on mount
  onMount(async () => {
    try {
      recentRepos = await firestore.getRecentRepositories(5);
    } catch (err) {
      console.error("Failed to load recent repositories:", err);
    } finally {
      loadingRecent = false;
    }
  });

  const validateGitHubUrl = (
    url: string
  ): { isValid: boolean; error?: string } => {
    if (!url.trim()) {
      return { isValid: false, error: "Please enter a repository URL" };
    }

    try {
      parseGitHubUrl(url);

      return { isValid: true };
    } catch (err) {
      return {
        isValid: false,
        error:
          err instanceof Error
            ? err.message
            : "Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)",
      };
    }
  };

  const handleSubmit = async () => {
    error = "";
    const validation = validateGitHubUrl(repoUrl);

    if (!validation.isValid) {
      error = validation.error || "Invalid URL";
      return;
    }

    isLoading = true;

    try {
      // Check if repository already exists and is fresh
      const existingRepo = await firestore.checkRepository(repoUrl);

      if (existingRepo && !firestore.isRepositoryStale(existingRepo)) {
        // Repository is fresh, redirect directly to results
        goto(`/repo/${existingRepo.id}`);
        return;
      }

      // Repository needs analysis
      goto(`/analyze?url=${encodeURIComponent(repoUrl)}`);
    } catch (err) {
      error =
        err instanceof Error ? err.message : "Failed to process repository URL";
    } finally {
      isLoading = false;
    }
  };

  const handleRecentRepoClick = (repo: StoredRepository) => {
    goto(`/repo/${repo.id}`);
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };
</script>

<ion-content class="ion-padding">
  <div class="landing-container">
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          <ion-icon name="code-slash-outline" class="hero-icon"></ion-icon>
          RepoLens
        </h1>
        <p class="hero-subtitle">
          Get a clear view of any public GitHub repository
        </p>
        <p class="hero-description">
          Analyze repository structure, understand code architecture, and
          explore documentation with AI-powered insights. Perfect for
          developers, code reviewers, and anyone exploring public codebases.
        </p>
      </div>
    </div>

    <!-- URL Input Section -->
    <ion-card class="input-card">
      <ion-card-header>
        <ion-card-title>Analyze a Public Repository</ion-card-title>
        <ion-card-subtitle
          >Enter any public GitHub repository URL to get started</ion-card-subtitle
        >
      </ion-card-header>

      <ion-card-content>
        <form
          onsubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <ion-item class="url-input" lines="none">
            <ion-input
              label="Public GitHub Repository URL"
              label-placement="stacked"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onionInput={(e: any) => (repoUrl = e.detail.value)}
              required
              class={error ? "ion-invalid" : ""}
            ></ion-input>
          </ion-item>

          {#if error}
            <ion-text color="danger" class="error-text">
              <p>{error}</p>
            </ion-text>
          {/if}

          <ion-button
            expand="block"
            type="submit"
            class="analyze-button"
            disabled={!repoUrl.trim() || isLoading}
          >
            {#if isLoading}
              <ion-spinner name="crescent" class="button-spinner"></ion-spinner>
              Processing...
            {:else}
              <ion-icon name="search-outline" slot="start"></ion-icon>
              Analyze Repository
            {/if}
          </ion-button>
        </form>
      </ion-card-content>
    </ion-card>

    <!-- Recent Repositories Section -->
    {#if !loadingRecent && recentRepos.length > 0}
      <ion-card class="recent-card">
        <ion-card-header>
          <ion-card-title>
            <ion-icon name="time-outline" class="section-icon"></ion-icon>
            Recently Analyzed
          </ion-card-title>
          <ion-card-subtitle
            >Jump back into repositories you've already explored</ion-card-subtitle
          >
        </ion-card-header>

        <ion-card-content>
          <ion-list class="recent-list">
            {#each recentRepos as repo}
              <ion-item
                button
                onclick={() => handleRecentRepoClick(repo)}
                class="recent-item"
              >
                <ion-avatar slot="start" class="repo-avatar">
                  <ion-icon name="folder-outline"></ion-icon>
                </ion-avatar>

                <ion-label>
                  <h3 class="repo-name">{repo.fullName}</h3>
                  <p class="repo-description">
                    {repo.description || "No description available"}
                  </p>
                  <div class="repo-meta">
                    {#if repo.language}
                      <ion-chip class="language-chip" size="small">
                        <ion-icon name="code-outline"></ion-icon>
                        <ion-label>{repo.language}</ion-label>
                      </ion-chip>
                    {/if}
                    <ion-chip class="stars-chip" size="small">
                      <ion-icon name="star-outline"></ion-icon>
                      <ion-label>{repo.stars}</ion-label>
                    </ion-chip>
                    <span class="analyzed-time"
                      >{formatTimeAgo(repo.lastAnalyzed)}</span
                    >
                  </div>
                </ion-label>

                <ion-icon
                  name="chevron-forward-outline"
                  slot="end"
                  class="chevron-icon"
                ></ion-icon>
              </ion-item>
            {/each}
          </ion-list>
        </ion-card-content>
      </ion-card>
    {/if}

    <!-- Features Section -->
    <div class="features-section">
      <h2 class="features-title">What RepoLens provides</h2>
      <div class="features-grid">
        <div class="feature-item">
          <ion-icon name="analytics-outline" class="feature-icon"></ion-icon>
          <h3>Code Analysis</h3>
          <p>
            Understand public repository structure, dependencies, and code
            patterns
          </p>
        </div>
        <div class="feature-item">
          <ion-icon name="document-text-outline" class="feature-icon"
          ></ion-icon>
          <h3>Documentation</h3>
          <p>
            Browse README files, code comments, and project documentation from
            public repos
          </p>
        </div>
        <div class="feature-item">
          <ion-icon name="git-branch-outline" class="feature-icon"></ion-icon>
          <h3>Repository Insights</h3>
          <p>
            View file organization, language distribution, and project metrics
          </p>
        </div>
        <div class="feature-item">
          <ion-icon name="chatbubble-outline" class="feature-icon"></ion-icon>
          <h3>AI-Powered Chat</h3>
          <p>
            Ask questions about the public codebase and get intelligent
            responses
          </p>
        </div>
      </div>
    </div>
  </div>
</ion-content>

<style lang="scss">
  .landing-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 20px;
  }

  // Hero Section
  .hero-section {
    text-align: center;
    padding: 60px 20px;
    margin-bottom: 40px;
  }

  .hero-content {
    max-width: 600px;
    margin: 0 auto;
  }

  .hero-title {
    font-size: 3.5rem;
    font-weight: bold;
    color: var(--ion-color-primary);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .hero-icon {
    font-size: 3rem;
  }

  .hero-subtitle {
    font-size: 1.5rem;
    color: var(--ion-color-dark);
    margin-bottom: 20px;
    font-weight: 500;
  }

  .hero-description {
    font-size: 1.1rem;
    color: var(--ion-color-medium);
    line-height: 1.6;
    margin-bottom: 0;
  }

  // Input Card
  .input-card {
    margin-bottom: 40px;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }

  .url-input {
    margin-bottom: 16px;
    --background: var(--ion-color-light);
    --border-radius: 8px;
  }

  .error-text {
    margin-top: 8px;
    font-size: 0.9rem;
  }

  .analyze-button {
    margin-top: 20px;
    height: 48px;
    font-weight: 600;
  }

  .button-spinner {
    margin-right: 8px;
    width: 16px;
    height: 16px;
  }

  // Recent Repositories
  .recent-card {
    margin-bottom: 40px;
  }

  .section-icon {
    margin-right: 8px;
  }

  .recent-list {
    padding: 0;
  }

  .recent-item {
    margin-bottom: 8px;
    --background: var(--ion-color-light-tint);
    --border-radius: 8px;
    --padding-start: 16px;
    --padding-end: 16px;
  }

  .repo-avatar {
    --background: var(--ion-color-primary-tint);
    --color: var(--ion-color-primary);
    width: 40px;
    height: 40px;
  }

  .repo-name {
    font-weight: 600;
    color: var(--ion-color-dark);
    margin-bottom: 4px;
  }

  .repo-description {
    font-size: 0.9rem;
    color: var(--ion-color-medium);
    margin-bottom: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .repo-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .language-chip,
  .stars-chip {
    --background: var(--ion-color-primary-tint);
    --color: var(--ion-color-primary);
    height: 24px;
    font-size: 0.8rem;
  }

  .analyzed-time {
    font-size: 0.8rem;
    color: var(--ion-color-medium);
    margin-left: auto;
  }

  .chevron-icon {
    color: var(--ion-color-medium);
  }

  // Features Section
  .features-section {
    text-align: center;
    padding: 40px 20px;
  }

  .features-title {
    font-size: 2rem;
    color: var(--ion-color-dark);
    margin-bottom: 40px;
    font-weight: 600;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 30px;
    max-width: 800px;
    margin: 0 auto;
  }

  .feature-item {
    padding: 24px;
    background: var(--ion-color-light);
    border-radius: 12px;
    transition: transform 0.2s ease;

    &:hover {
      transform: translateY(-4px);
    }
  }

  .feature-icon {
    font-size: 3rem;
    color: var(--ion-color-primary);
    margin-bottom: 16px;
  }

  .feature-item h3 {
    font-size: 1.3rem;
    color: var(--ion-color-dark);
    margin-bottom: 12px;
    font-weight: 600;
  }

  .feature-item p {
    color: var(--ion-color-medium);
    line-height: 1.5;
    margin: 0;
  }

  // Responsive Design
  @media (max-width: 768px) {
    .hero-title {
      font-size: 2.5rem;
      flex-direction: column;
      gap: 12px;
    }

    .hero-icon {
      font-size: 2.5rem;
    }

    .hero-subtitle {
      font-size: 1.3rem;
    }

    .features-grid {
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .analyzed-time {
      margin-left: 0;
      margin-top: 4px;
    }
  }
</style>
