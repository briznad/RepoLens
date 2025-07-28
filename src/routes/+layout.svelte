<script lang="ts" module>
  import type { Snippet } from "svelte";

  import { onMount } from "svelte";

  import { initialize } from "@ionic-sveltekit/core";

  /* Import all components */
  import "@ionic-sveltekit/core/dist/all";

  import { ga } from "$services/ga";

  /* Theme variables */
  import "../theme/variables.scss";

  /* global css */
  import "../theme/global.scss";

  import ViewTransition from "$components/ViewTransition.svelte";

  interface Props {
    children: Snippet;
  }
</script>

<script lang="ts">
  let { children }: Props = $props();

  initialize({
    mode: "ios",
    scrollAssist: false,
  });

  onMount(() => {
    ga.init();
  });
</script>

<svelte:head>
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0bb887" />
  <meta name="apple-mobile-web-app-title" content="RepoLens" />
  <meta name="application-name" content="RepoLens" />
  <meta name="msapplication-TileColor" content="#f4c665" />
  <meta name="theme-color" content="#0bb887" />
</svelte:head>

<ViewTransition />

<ion-app>
  {@render children()}
</ion-app>

<style></style>
