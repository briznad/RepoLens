<script lang="ts">
  interface Props {
    message?: string;
  }

  let { message = "Loading repository..." }: Props = $props();
</script>

<div class="loading-layout">
  <ion-content class="ion-padding">
    <div class="loading-container">
      <ion-spinner name="dots"></ion-spinner>
      <p>{message}</p>
    </div>
  </ion-content>
</div>

<style lang="scss">
  .loading-layout {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;

    p {
      color: var(--ion-color-medium);
      font-size: 1rem;
    }
  }
</style>