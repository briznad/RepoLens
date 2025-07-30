<script lang="ts">
  import { home } from "ionicons/icons";

  interface Props {
    repoName: string;
    subsystemName: string;
    repoId: string;
  }

  let { repoName, subsystemName, repoId }: Props = $props();
</script>

<ion-breadcrumbs>
  <ion-breadcrumb href="/">
    <ion-icon icon={home}></ion-icon>
    Home
  </ion-breadcrumb>

  <ion-breadcrumb href="/repo/{repoId}/docs">
    {repoName}
  </ion-breadcrumb>

  <ion-breadcrumb>
    {subsystemName}
  </ion-breadcrumb>
</ion-breadcrumbs>

<style lang="scss">
  ion-breadcrumbs {
    margin-bottom: 20px;
  }

  ion-icon {
    padding-right: 0.5em;
  }
</style>
