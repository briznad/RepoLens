<script lang="ts">
  interface Props {
    message?: string;
  }

  let { message = "Loading repository chat..." }: Props = $props();
</script>

<ion-content class="ion-padding">
  <div class="loading-container">
    <ion-spinner name="dots"></ion-spinner>
    <p>{message}</p>
  </div>
</ion-content>

<style lang="scss">
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;

    p {
      color: var(--ion-color-medium);
      font-size: 1rem;
      margin-top: 16px;
    }
  }
</style>