import type { FirestoreRepo, RepoData } from '$types/repository';
import type { AnalysisResult, Subsystem, SubsystemDescription } from '$types/analysis';
import { repositoryStore } from '$stores/repository';
import { documentationStore } from '$stores/documentation';
import { navigationStore } from '$stores/navigation';
import { persistence } from './persistence';
import { cache } from './cache';
import { validateRepo } from '$utilities/validation';
import { StoreError, ValidationError } from '$types/error';

/**
 * Repository management service - handles business logic for repository operations
 */

export class RepositoryManager {
  
  /**
   * Set the current repository with validation and persistence
   */
  setRepository(repo: FirestoreRepo): void {
    try {
      validateRepo(repo);
      
      repositoryStore.setCurrent(repo);
      repositoryStore.setError(null);
      
      // Update navigation context
      navigationStore.setRepoContext(repo.id, repo.fullName);
      
      // Persist the change
      persistence.save('currentRepo', repositoryStore.value);
      
      // Cache the repository
      cache.cacheRepository(repo.id, repo);
      
    } catch (error) {
      repositoryStore.setError(error instanceof Error ? error.message : 'Failed to set repository');
      throw new ValidationError('Invalid repository data', 'repo', repo);
    }
  }

  /**
   * Set repository analysis data and update documentation store
   */
  setRepositoryAnalysis(repoData: RepoData, analysisData: AnalysisResult): void {
    try {
      // Map subsystems with AI descriptions as extended properties
      const subsystems = analysisData.subsystems.map(subsystem => {
        const aiDescription = analysisData.subsystemDescriptions?.find(
          desc => desc.name === subsystem.name
        );
        return { 
          ...subsystem,
          description: aiDescription
        } as Subsystem & { description?: SubsystemDescription };
      });

      documentationStore.setSubsystems(subsystems);
      documentationStore.setSearchResults('', []); // Clear previous search results
      
      // Persist documentation data
      persistence.save('documentationData', documentationStore.value);
      
      // Cache the analysis
      cache.cacheAnalysis(repoData.full_name, analysisData);
      
    } catch (error) {
      throw new StoreError('Failed to set repository analysis', 'ANALYSIS_ERROR', { repoData, analysisData });
    }
  }

  /**
   * Update repository freshness status
   */
  updateRepositoryFreshness(isStale: boolean, reason?: 'github-updated' | 'analysis-missing' | 'firestore-error'): void {
    repositoryStore.setFreshness(isStale, reason);
    persistence.save('currentRepo', repositoryStore.value);
  }

  /**
   * Set repository loading state
   */
  setLoading(loading: boolean): void {
    repositoryStore.setLoading(loading);
  }

  /**
   * Set repository error state
   */
  setError(error: string | null): void {
    repositoryStore.setError(error);
  }

  /**
   * Clear current repository
   */
  clearRepository(): void {
    repositoryStore.reset();
    documentationStore.reset();
    navigationStore.setRepoContext(null, null);
    
    persistence.clear('currentRepo');
    persistence.clear('documentationData');
  }

  /**
   * Get repository data from cache if available
   */
  getCachedRepository(repoId: string): FirestoreRepo | null {
    return cache.getRepository(repoId);
  }

  /**
   * Get analysis data from cache if available
   */
  getCachedAnalysis(repoKey: string): AnalysisResult | null {
    return cache.getAnalysis(repoKey);
  }

  /**
   * Get current repository state
   */
  getCurrentRepository(): FirestoreRepo | null {
    return repositoryStore.value.current;
  }

  /**
   * Check if repository is currently loading
   */
  isLoading(): boolean {
    return repositoryStore.value.loading;
  }

  /**
   * Get current error message
   */
  getError(): string | null {
    return repositoryStore.value.error;
  }

  /**
   * Check if repository data is stale
   */
  isStale(): boolean {
    return repositoryStore.value.freshness.isStale;
  }

  /**
   * Get repository document ID
   */
  getRepoDocId(): string | null {
    return repositoryStore.value.current?.id || null;
  }

  /**
   * Check if repository is analyzed
   */
  isRepoAnalyzed(): boolean {
    return repositoryStore.value.analysis !== null;
  }

  /**
   * Check if repository is loaded
   */
  isRepoLoaded(): boolean {
    return repositoryStore.value.current !== null;
  }

  /**
   * Get subsystem by name
   */
  getSubsystemByName(name: string): any | null {
    const analysis = repositoryStore.value.analysis;
    if (!analysis?.subsystems) return null;
    
    return analysis.subsystems.find(subsystem => 
      subsystem.name.toLowerCase() === name.toLowerCase()
    ) || null;
  }

  /**
   * Get all subsystems
   */
  getAllSubsystems(): any[] {
    return repositoryStore.value.analysis?.subsystems || [];
  }

  /**
   * Get language distribution
   */
  getLanguageDistribution(): Record<string, number> {
    return repositoryStore.value.analysis?.languages || {};
  }

  /**
   * Get file count
   */
  getFileCount(): number {
    return repositoryStore.value.analysis?.fileCount || 0;
  }

  /**
   * Check if repository has specific framework
   */
  hasFramework(framework: string): boolean {
    const currentFramework = repositoryStore.value.analysis?.framework;
    return currentFramework?.toLowerCase() === framework.toLowerCase();
  }

  /**
   * Initialize repository manager with persisted data
   */
  initialize(): void {
    const defaultState = {
      current: null,
      analysis: null,
      loading: false,
      error: null,
      lastUpdated: null,
      freshness: {
        isStale: false,
        lastChecked: new Date().toISOString()
      }
    };

    const persistedState = persistence.load('currentRepo', defaultState);
    
    if (persistedState.current) {
      // Restore repository without validation to avoid errors during initialization
      repositoryStore.setCurrent(persistedState.current);
    }
    
    if (persistedState.error) {
      repositoryStore.setError(persistedState.error);
    }
    
    if (persistedState.freshness) {
      repositoryStore.setFreshness(
        persistedState.freshness.isStale, 
        (persistedState.freshness as any).reason
      );
    }
  }
}

// Create default repository manager instance
export const repositoryManager = new RepositoryManager();