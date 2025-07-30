<script lang="ts">
  import type { FirestoreRepo } from "$types/repository";

  import {
    addOutline,
    shareOutline,
    hourglassOutline,
    refreshOutline,
  } from "ionicons/icons";
  import { handleEnterKey } from "$utilities/helper";

  interface Props {
    repo: FirestoreRepo;
    refreshing: boolean;
    onShare?: () => void;
  }

  let {
    repo,
    refreshing,
    onShare = () => navigator.share?.({ url: window.location.href }),
  }: Props = $props();
</script>

<ion-list>
  <ion-list-header>
    <ion-label>Actions</ion-label>
  </ion-list-header>

  <ion-item button href="/">
    <ion-icon icon={addOutline} slot="start"></ion-icon>
    <ion-label>Analyze New Repository</ion-label>
  </ion-item>

  <ion-item
    button
    href="/analyze?docId={repo.id}"
    role="button"
    tabindex="0"
    disabled={refreshing}
    detail={false}
  >
    <ion-icon icon={refreshing ? hourglassOutline : refreshOutline} slot="start"
    ></ion-icon>

    <ion-label>{refreshing ? "Refreshing..." : "Refresh Analysis"}</ion-label>
  </ion-item>

  <ion-item
    button
    onclick={onShare}
    onkeydown={handleEnterKey(onShare)}
    detail={false}
    role="button"
    tabindex="0"
  >
    <ion-icon icon={shareOutline} slot="start"></ion-icon>

    <ion-label>Share Repository</ion-label>
  </ion-item>
</ion-list>

<style lang="scss">
  ion-list {
    background: transparent;
  }

  ion-list-header {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ion-color-medium);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  ion-item {
    --background: transparent;
    --border-radius: 8px;
    margin: 2px 8px;
    font-size: 0.95rem;

    &:hover:not(:disabled) {
      --background: var(--ion-color-light-shade);
    }

    &:disabled {
      opacity: 0.6;
    }
  }
</style>
