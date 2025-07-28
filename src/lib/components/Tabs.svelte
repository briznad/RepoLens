<script lang="ts" module>
  import type { Snippet } from "svelte";

  import type { Tab } from "$types/tab";

  import { page } from "$app/state";

  interface Props {
    tabs: Tab[];
    children: Snippet;
    fixedElements?: Snippet;
  }
</script>

<script lang="ts">
  let { tabs, children, fixedElements }: Props = $props();

  function isSelected(tab: Tab, pathname: string): boolean {
    if (tab.matchPath) {
      return tab.matchPath.test(pathname);
    }

    return tab.activeOnDescendent === true
      ? pathname.startsWith(tab.link)
      : tab.link === pathname;
  }

  function isActive(link: string, url: URL): boolean {
    const relativeHref = url.href.replace(url.origin, "");

    return relativeHref === link;
  }
</script>

<ion-tabs>
  <ion-content>
    {@render children()}
  </ion-content>

  <ion-tab-bar slot="bottom">
    {#each tabs as tab}
      <ion-tab-button
        href={tab.link}
        selected={isSelected(tab, page.url.pathname)}
        disabled={isActive(tab.link, page.url)}
      >
        {#if tab.icon}
          <ion-icon icon={tab.icon}></ion-icon>
        {/if}

        {#if tab.title}
          {tab.title}
        {/if}
      </ion-tab-button>
    {/each}
  </ion-tab-bar>

  <!--
    Any elements placed here, within ion-tabs after ion-tab-bar, will be rendered behind the tab bar.
    Custom CSS should be used to position these elements.
  -->
  {@render fixedElements?.()}
</ion-tabs>

<style lang="scss">
  ion-tab-bar {
    --border: 1px solid rgb(200, 199, 204);

    padding-top: 5px;
    padding-bottom: clamp(10px, var(--ion-safe-area-bottom, 10px), 18px);
    view-transition-name: tab-bar;
  }

  ion-tab-button {
    --color-selected: #ad1e28;

    &:global(.tab-disabled) {
      opacity: 1;
    }
  }
</style>
