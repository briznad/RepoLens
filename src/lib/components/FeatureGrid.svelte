<script lang="ts">
  import { analyticsOutline, documentTextOutline, gitBranchOutline, chatbubbleOutline } from 'ionicons/icons';

  interface Feature {
    icon: any;
    title: string;
    description: string;
  }

  interface Props {
    title?: string;
    features?: Feature[];
  }

  const defaultFeatures: Feature[] = [
    {
      icon: analyticsOutline,
      title: "Code Analysis",
      description: "Understand public repository structure, dependencies, and code patterns"
    },
    {
      icon: documentTextOutline,
      title: "Documentation",
      description: "Browse README files, code comments, and project documentation from public repos"
    },
    {
      icon: gitBranchOutline,
      title: "Repository Insights",
      description: "View file organization, language distribution, and project metrics"
    },
    {
      icon: chatbubbleOutline,
      title: "AI-Powered Chat",
      description: "Ask questions about the public codebase and get intelligent responses"
    }
  ];

  let { 
    title = "What RepoLens provides",
    features = defaultFeatures
  }: Props = $props();
</script>

<div class="features-section">
  <h2 class="features-title">{title}</h2>
  <div class="features-grid">
    {#each features as feature}
      <div class="feature-item">
        <ion-icon icon={feature.icon} class="feature-icon"></ion-icon>
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
      </div>
    {/each}
  </div>
</div>

<style lang="scss">
  .features-section {
    text-align: center;
    padding: 40px 20px;
  }

  .features-title {
    font-size: 2rem;
    color: var(--ion-color-dark);
    margin-bottom: 40px;
    font-weight: 600;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 30px;
    max-width: 800px;
    margin: 0 auto;
  }

  .feature-item {
    padding: 24px;
    background: var(--ion-color-light);
    border-radius: 12px;
    transition: transform 0.2s ease;

    &:hover {
      transform: translateY(-4px);
    }
  }

  .feature-icon {
    font-size: 3rem;
    color: var(--ion-color-primary);
    margin-bottom: 16px;
  }

  .feature-item h3 {
    font-size: 1.3rem;
    color: var(--ion-color-dark);
    margin-bottom: 12px;
    font-weight: 600;
  }

  .feature-item p {
    color: var(--ion-color-medium);
    line-height: 1.5;
    margin: 0;
  }

  // Responsive Design
  @media (max-width: 768px) {
    .features-grid {
      grid-template-columns: 1fr;
      gap: 20px;
    }
  }
</style>