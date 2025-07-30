<script lang="ts">
  import type { FirestoreRepo } from "$types/repository";
  import { timeOutline } from "ionicons/icons";

  interface Props {
    title?: string;
    subtitle?: string;
    repositories: FirestoreRepo[];
  }

  let {
    title = "Recently Analyzed",
    subtitle = "View recently analyzed repositories",
    repositories,
  }: Props = $props();

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
            class="recent-item"
            href="/repo/{repo.id}"
            lines="none"
          >
            <h3 slot="start" class="repo-name">{repo.fullName}</h3>

            <span slot="end" class="analyzed-time">
              {formatTimeAgo(new Date(repo.lastAnalyzed))}
            </span>
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

  .repo-name {
    font-weight: 600;
    color: var(--ion-color-dark);
    margin-bottom: 4px;
  }

  .analyzed-time {
    font-size: 0.8rem;
    color: var(--ion-color-medium);
    margin-left: auto;
  }

  // Responsive Design
  @media (max-width: 768px) {
    .analyzed-time {
      margin-left: 0;
      margin-top: 4px;
    }
  }
</style>
