<script lang="ts" module>
  import { checkmarkCircle } from "ionicons/icons";

  import { goto } from "$app/navigation";

  import imageSrc from "$images/cartmigo-logo-with-fruit-512w.png";
</script>

<script lang="ts">
</script>

<main>
  <ion-card>
    <ion-card-header>
      <img src={imageSrc} alt="RepoLens Logo" />

      <h1>
        <ion-card-title>RepoLens</ion-card-title>

        <ion-card-subtitle
          >RepoLens gives you a clear view of any codebase</ion-card-subtitle
        >
      </h1>
    </ion-card-header>

    <ion-card-content></ion-card-content>
  </ion-card>
</main>

<style lang="scss">
  main {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
    height: 100vh;
    overflow-y: auto;
    padding-left: clamp(30px, var(--ion-safe-area-left, 30px), 40px);
    padding-right: clamp(30px, var(--ion-safe-area-right, 30px), 40px);
    background-image: linear-gradient(
      30deg,
      hsl(34deg 68% 60%) 0%,
      hsl(56deg 44% 61%) 40%,
      hsl(163deg 89% 38%) 100%
    );
  }

  ion-card {
    margin-top: clamp(30px, var(--ion-safe-area-top, 30px), 60px);
    margin-right: 0;
    margin-bottom: clamp(30px, var(--ion-safe-area-bottom, 30px), 60px);
    margin-left: 0;
    max-width: 600px;
    overflow: visible;
  }

  ion-card-header {
    flex-direction: column;
    align-items: center;
  }

  img {
    max-width: 128px;
    margin-top: 18px;
    margin-bottom: 18px;
  }

  h1 {
    margin-top: 0;
  }

  ion-card-title {
    font-size: 42px;
    color: #2c3e50;
  }

  ion-card-subtitle {
    margin-top: 4px;
    margin-bottom: 0;
  }

  h2 {
    font-size: 28px;
    font-weight: 700;
    color: #2c3e50;
    line-height: 1.3;
    margin-bottom: 16px;

    &,
    + p {
      text-align: center;
    }

    + p {
      color: #5a6c7d;
      line-height: 1.5;
      margin-bottom: 32px;
    }
  }

  p {
    font-size: 16px;
  }

  .button-container {
    margin-bottom: 24px;
  }

  ion-item {
    --padding-start: 0;
    --inner-padding-end: 0;
  }
</style>
