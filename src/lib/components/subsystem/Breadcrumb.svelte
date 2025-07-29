<script lang="ts">
  import { home } from 'ionicons/icons';

  interface Props {
    repoName: string;
    subsystemName: string;
    repoId: string;
    onHomeClick?: () => void;
    onRepoClick?: () => void;
  }

  let { 
    repoName,
    subsystemName,
    repoId,
    onHomeClick = () => window.location.href = "/",
    onRepoClick = () => window.location.href = `/repo/${repoId}/docs`
  }: Props = $props();
</script>

<div class="breadcrumb-nav">
  <ion-breadcrumbs>
    <ion-breadcrumb onclick={onHomeClick}>
      <ion-icon icon={home}></ion-icon>
      Home
    </ion-breadcrumb>
    <ion-breadcrumb onclick={onRepoClick}>
      {repoName}
    </ion-breadcrumb>
    <ion-breadcrumb>
      {subsystemName}
    </ion-breadcrumb>
  </ion-breadcrumbs>
</div>

<style lang="scss">
  .breadcrumb-nav {
    margin-bottom: 20px;
  }
</style>