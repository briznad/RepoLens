<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  
  interface Props {
    children: Snippet;
  }
  
  let { children }: Props = $props();
  
  const repoId = $derived($page.params.id);
  const currentPath = $derived($page.url.pathname);
  
  const menuItems = $derived([
    { title: 'Chat', url: `/repo/${repoId}`, icon: 'chatbubbles' },
    { title: 'Architecture', url: `/repo/${repoId}/graph`, icon: 'git-network' },
    { title: 'Documentation', url: `/repo/${repoId}/docs`, icon: 'document-text' }
  ]);
  
  const handleMenuClick = (url: string) => {
    goto(url);
  };
</script>

<ion-split-pane content-id="main-content" when="md">
  <!-- Sidebar Menu -->
  <ion-menu content-id="main-content">
    <ion-header>
      <ion-toolbar>
        <ion-title>RepoLens</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <!-- Repository Info Section -->
      <div class="repo-info">
        <ion-item>
          <ion-icon name="logo-github" slot="start"></ion-icon>
          <ion-label>
            <h3>Repository</h3>
            <p>ID: {repoId}</p>
          </ion-label>
        </ion-item>
      </div>
      
      <!-- Navigation Menu -->
      <ion-list>
        <ion-list-header>
          <ion-label>Navigation</ion-label>
        </ion-list-header>
        
        {#each menuItems as item}
          <ion-item 
            button 
            onclick={() => handleMenuClick(item.url)}
            class:selected={currentPath === item.url}
          >
            <ion-icon name={item.icon} slot="start"></ion-icon>
            <ion-label>{item.title}</ion-label>
          </ion-item>
        {/each}
      </ion-list>
      
      <!-- Quick Actions -->
      <ion-list>
        <ion-list-header>
          <ion-label>Quick Actions</ion-label>
        </ion-list-header>
        
        <ion-item button>
          <ion-icon name="refresh" slot="start"></ion-icon>
          <ion-label>Refresh Analysis</ion-label>
        </ion-item>
        
        <ion-item button>
          <ion-icon name="share" slot="start"></ion-icon>
          <ion-label>Share Repository</ion-label>
        </ion-item>
        
        <ion-item button onclick={() => goto('/')}>
          <ion-icon name="home" slot="start"></ion-icon>
          <ion-label>New Analysis</ion-label>
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
        <ion-title>RepoLens</ion-title>
        <ion-buttons slot="end">
          <ion-button fill="clear">
            <ion-icon name="settings" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    {@render children()}
  </div>
</ion-split-pane>

<style lang="scss">
  .repo-info {
    padding: 16px 0;
    border-bottom: 1px solid var(--ion-color-light);
    margin-bottom: 16px;
  }

  .selected {
    --background: var(--ion-color-primary-tint);
    --color: var(--ion-color-primary-contrast);
  }

  ion-list-header {
    font-weight: 600;
    color: var(--ion-color-dark);
  }
</style>