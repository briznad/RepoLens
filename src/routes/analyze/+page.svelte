<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { parseGitHubUrl, fetchRepo } from '$lib/github.js';
  import { firestore } from '$lib/services/firestore.js';
  import type { AnalysisResult } from '$lib/types.js';
  
  let repoUrl = $state('');
  let analysisStep = $state('Initializing...');
  let progress = $state(0);
  let error = $state('');
  let isComplete = $state(false);
  
  const analysisSteps = [
    'Parsing repository URL...',
    'Fetching repository information...',
    'Analyzing file structure...',
    'Processing source code...',
    'Storing analysis results...',
    'Finalizing...'
  ];
  
  const updateProgress = (stepIndex: number, message?: string) => {
    analysisStep = message || analysisSteps[stepIndex];
    progress = ((stepIndex + 1) / analysisSteps.length) * 100;
  };
  
  const performAnalysis = async () => {
    try {
      // Step 1: Parse URL
      updateProgress(0);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const { owner, repo } = parseGitHubUrl(repoUrl);
      
      // Step 2: Fetch repo data
      updateProgress(1);
      const analysisResult: AnalysisResult = await fetchRepo(owner, repo);
      
      // Step 3: Analyze file structure
      updateProgress(2, `Analyzing ${analysisResult.fileTree.length} files...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: Process source code
      updateProgress(3, `Processing ${Object.keys(analysisResult.languages).length} languages...`);
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Step 5: Store in Firestore
      updateProgress(4);
      const repoId = await firestore.storeRepository(
        owner,
        repo,
        analysisResult.metadata,
        analysisResult,
        'completed'
      );
      
      // Step 6: Finalize
      updateProgress(5, 'Analysis complete!');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      isComplete = true;
      
      // Redirect to results
      setTimeout(() => {
        goto(`/repo/${repoId}`);
      }, 1000);
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Analysis failed';
      analysisStep = 'Analysis failed';
      
      // Try to update Firestore with failed status if we got far enough
      try {
        const { owner, repo } = parseGitHubUrl(repoUrl);
        const repoId = firestore.generateRepoId(owner, repo);
        await firestore.updateRepositoryStatus(repoId, 'failed', error);
      } catch (firestoreErr) {
        console.error('Failed to update Firestore status:', firestoreErr);
      }
    }
  };
  
  onMount(() => {
    repoUrl = $page.url.searchParams.get('url') || '';
    
    if (!repoUrl) {
      goto('/');
      return;
    }
    
    // Start analysis
    performAnalysis();
  });
</script>

<ion-content class="ion-padding">
  <div class="analysis-container">
    <ion-card>
      <ion-card-header>
        <ion-card-title>Analyzing Repository</ion-card-title>
        <ion-card-subtitle>{repoUrl}</ion-card-subtitle>
      </ion-card-header>
      
      <ion-card-content>
        {#if error}
          <!-- Error State -->
          <div class="error-section">
            <ion-icon name="alert-circle" color="danger" class="error-icon"></ion-icon>
            <h3 class="error-title">Analysis Failed</h3>
            <p class="error-message">{error}</p>
            <ion-button 
              fill="outline" 
              color="primary"
              onclick={() => goto('/')}
              class="retry-button"
            >
              <ion-icon name="arrow-back-outline" slot="start"></ion-icon>
              Try Another Repository
            </ion-button>
          </div>
        {:else}
          <!-- Progress State -->
          <div class="progress-section">
            <ion-progress-bar 
              value={progress / 100}
              color={isComplete ? 'success' : 'primary'}
            ></ion-progress-bar>
            <p class="progress-text">
              {Math.round(progress)}% Complete
              {#if isComplete}
                <ion-icon name="checkmark-circle" color="success" class="complete-icon"></ion-icon>
              {/if}
            </p>
          </div>
          
          <div class="status-section">
            <ion-item>
              {#if isComplete}
                <ion-icon name="checkmark-circle" color="success" slot="start"></ion-icon>
              {:else}
                <ion-spinner name="crescent" slot="start"></ion-spinner>
              {/if}
              <ion-label>{analysisStep}</ion-label>
            </ion-item>
          </div>
          
          <div class="steps-section">
            <h3>Analysis Steps:</h3>
            {#each analysisSteps as step, index}
              {@const stepProgress = ((index + 1) / analysisSteps.length) * 100}
              {@const isStepComplete = progress >= stepProgress}
              {@const isCurrentStep = progress > ((index) / analysisSteps.length) * 100 && progress < stepProgress}
              
              <ion-item>
                {#if isStepComplete}
                  <ion-icon name="checkmark-circle" slot="start" color="success"></ion-icon>
                {:else if isCurrentStep}
                  <ion-spinner name="crescent" slot="start"></ion-spinner>
                {:else}
                  <ion-icon name="ellipse-outline" slot="start" color="medium"></ion-icon>
                {/if}
                <ion-label color={isStepComplete ? 'success' : isCurrentStep ? 'primary' : 'medium'}>
                  {step}
                </ion-label>
              </ion-item>
            {/each}
          </div>
        {/if}
      </ion-card-content>
    </ion-card>
  </div>
</ion-content>

<style lang="scss">
  .analysis-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
  }

  ion-card {
    max-width: 600px;
    width: 100%;
  }

  ion-card-title {
    text-align: center;
    color: var(--ion-color-primary);
  }

  ion-card-subtitle {
    text-align: center;
    word-break: break-all;
    margin-bottom: 20px;
  }

  .progress-section {
    margin-bottom: 30px;
  }

  .progress-text {
    text-align: center;
    margin-top: 10px;
    font-weight: 500;
  }

  .status-section {
    margin-bottom: 30px;
  }

  .steps-section h3 {
    margin: 20px 0 10px 0;
    font-size: 1.2rem;
    color: var(--ion-color-dark);
  }

  .error-section {
    text-align: center;
    padding: 20px;
  }

  .error-icon {
    font-size: 4rem;
    margin-bottom: 20px;
  }

  .error-title {
    color: var(--ion-color-danger);
    margin-bottom: 16px;
    font-size: 1.5rem;
  }

  .error-message {
    color: var(--ion-color-medium);
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .retry-button {
    margin-top: 8px;
  }

  .complete-icon {
    margin-left: 8px;
    font-size: 1.2rem;
  }
</style>