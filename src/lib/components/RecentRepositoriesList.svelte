<script lang="ts">
  import type { FirestoreRepo } from '$types/repository';
  import { timeOutline, folderOutline, codeOutline, starOutline, chevronForwardOutline } from 'ionicons/icons';

  interface Props {
    title?: string;
    subtitle?: string;
    repositories: FirestoreRepo[];
    onRepoClick: (repo: FirestoreRepo) => void;
  }

  let { 
    title = "Recently Analyzed",
    subtitle = "Jump back into repositories you've already explored",
    repositories,
    onRepoClick
  }: Props = $props();

  function handleRepoClick(repo: FirestoreRepo) {
    onRepoClick(repo);
  }

  function formatTimeAgo(date: Date): string {
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
  }
</script>

{#if repositories.length > 0}
  <ion-card class="recent-card">
    <ion-card-header>
      <ion-card-title>
        <ion-icon icon={timeOutline} class="section-icon"></ion-icon>
        {title}
      </ion-card-title>
      <ion-card-subtitle>{subtitle}</ion-card-subtitle>
    </ion-card-header>

    <ion-card-content>
      <ion-list class="recent-list">
        {#each repositories as repo}
          <ion-item
            button
            onclick={() => handleRepoClick(repo)}
            class="recent-item"
          >
            <ion-avatar slot="start" class="repo-avatar">
              <ion-icon icon={folderOutline}></ion-icon>
            </ion-avatar>

            <ion-label>
              <h3 class="repo-name">{repo.fullName}</h3>
              <p class="repo-description">
                {repo.description || "No description available"}
              </p>
              <div class="repo-meta">
                {#if repo.language}
                  <ion-chip class="language-chip" size="small">
                    <ion-icon icon={codeOutline}></ion-icon>
                    <ion-label>{repo.language}</ion-label>
                  </ion-chip>
                {/if}
                <ion-chip class="stars-chip" size="small">
                  <ion-icon icon={starOutline}></ion-icon>
                  <ion-label>{repo.stars}</ion-label>
                </ion-chip>
                <span class="analyzed-time">
                  {formatTimeAgo(new Date(repo.lastAnalyzed))}
                </span>
              </div>
            </ion-label>

            <ion-icon
              icon={chevronForwardOutline}
              slot="end"
              class="chevron-icon"
            ></ion-icon>
          </ion-item>
        {/each}
      </ion-list>
    </ion-card-content>
  </ion-card>
{/if}

<style lang="scss">
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

  // Responsive Design
  @media (max-width: 768px) {
    .analyzed-time {
      margin-left: 0;
      margin-top: 4px;
    }
  }
</style>