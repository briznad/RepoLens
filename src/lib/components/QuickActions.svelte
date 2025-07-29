<script lang="ts">
  import { addOutline, shareOutline, hourglassOutline, refreshOutline } from 'ionicons/icons';

  interface Props {
    refreshing: boolean;
    onRefreshAnalysis: () => void;
    onAnalyzeNew: () => void;
    onShare?: () => void;
  }

  let { 
    refreshing,
    onRefreshAnalysis,
    onAnalyzeNew,
    onShare = () => navigator.share?.({ url: window.location.href })
  }: Props = $props();
</script>

<ion-list class="actions-list">
  <ion-list-header>
    <ion-label>Actions</ion-label>
  </ion-list-header>

  <ion-item
    button
    onclick={onRefreshAnalysis}
    disabled={refreshing}
  >
    <ion-icon
      icon={refreshing ? hourglassOutline : refreshOutline}
      slot="start"
    ></ion-icon>
    <ion-label
      >{refreshing ? "Refreshing..." : "Refresh Analysis"}</ion-label
    >
  </ion-item>

  <ion-item button onclick={onAnalyzeNew}>
    <ion-icon icon={addOutline} slot="start"></ion-icon>
    <ion-label>Analyze New Repository</ion-label>
  </ion-item>

  <ion-item
    button
    onclick={onShare}
  >
    <ion-icon icon={shareOutline} slot="start"></ion-icon>
    <ion-label>Share Repository</ion-label>
  </ion-item>
</ion-list>

<style lang="scss">
  .actions-list {
    margin-top: auto;
    padding-top: 16px;

    ion-list-header {
      padding-left: 16px;
      padding-right: 16px;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--ion-color-medium);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    ion-item {
      --padding-start: 16px;
      --padding-end: 16px;
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
  }
</style>