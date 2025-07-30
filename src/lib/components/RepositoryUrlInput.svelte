<script lang="ts">
  import { searchOutline } from "ionicons/icons";

  interface Props {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    repoUrl: string;
    isLoading: boolean;
    error: string;
    onSubmit: () => void;
    onUrlChange: (url: string) => void;
  }

  let {
    title = "Analyze a Public Repository",
    subtitle = "Enter any public GitHub repository URL to get started",
    buttonText = "Analyze Repository",
    repoUrl,
    isLoading,
    error,
    onSubmit,
    onUrlChange,
  }: Props = $props();

  function handleSubmit(e: Event) {
    e.preventDefault();
    onSubmit();
  }

  function handleInput(e: any) {
    onUrlChange(e.detail.value);
  }
</script>

<ion-card class="input-card">
  <ion-card-header>
    <ion-card-title>{title}</ion-card-title>
    <ion-card-subtitle>{subtitle}</ion-card-subtitle>
  </ion-card-header>

  <ion-card-content>
    <form onsubmit={handleSubmit}>
      <ion-item class="url-input" lines="none">
        <ion-input
          label="Public GitHub Repository URL"
          label-placement="stacked"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onionInput={handleInput}
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
          <ion-icon icon={searchOutline} slot="start"></ion-icon>
          {buttonText}
        {/if}
      </ion-button>
    </form>
  </ion-card-content>
</ion-card>

<style lang="scss">
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
</style>
