<script lang="ts">
  import { codeSlashOutline } from 'ionicons/icons';

  interface Props {
    title?: string;
    subtitle?: string;
    description?: string;
  }

  let { 
    title = "RepoLens", 
    subtitle = "Get a clear view of any public GitHub repository",
    description = "Analyze repository structure, understand code architecture, and explore documentation with AI-powered insights. Perfect for developers, code reviewers, and anyone exploring public codebases."
  }: Props = $props();
</script>

<div class="hero-section">
  <div class="hero-content">
    <h1 class="hero-title">
      <ion-icon icon={codeSlashOutline} class="hero-icon"></ion-icon>
      {title}
    </h1>
    <p class="hero-subtitle">
      {subtitle}
    </p>
    <p class="hero-description">
      {description}
    </p>
  </div>
</div>

<style lang="scss">
  .hero-section {
    text-align: center;
    padding: 60px 20px;
    margin-bottom: 40px;
  }

  .hero-content {
    max-width: 600px;
    margin: 0 auto;
  }

  .hero-title {
    font-size: 3.5rem;
    font-weight: bold;
    color: var(--ion-color-primary);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }

  .hero-icon {
    font-size: 3rem;
  }

  .hero-subtitle {
    font-size: 1.5rem;
    color: var(--ion-color-dark);
    margin-bottom: 20px;
    font-weight: 500;
  }

  .hero-description {
    font-size: 1.1rem;
    color: var(--ion-color-medium);
    line-height: 1.6;
    margin-bottom: 0;
  }

  // Responsive Design
  @media (max-width: 768px) {
    .hero-title {
      font-size: 2.5rem;
      flex-direction: column;
      gap: 12px;
    }

    .hero-icon {
      font-size: 2.5rem;
    }

    .hero-subtitle {
      font-size: 1.3rem;
    }
  }
</style>