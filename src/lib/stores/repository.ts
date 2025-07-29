import type { RepoState } from '$types/stores';
import type { FirestoreRepo } from '$types/repository';

/**
 * Pure reactive store for repository state
 * Contains only reactive state, no business logic
 */

const createDefaultState = (): RepoState => ({
  current: null,
  analysis: null,
  loading: false,
  error: null,
  lastUpdated: null,
  freshness: {
    isStale: false,
    lastChecked: new Date().toISOString()
  }
});

export const repositoryStore = (() => {
  let state = $state<RepoState>(createDefaultState());

  return {
    get value() { return state; },

    // Simple state setters - no business logic
    setCurrent(repo: FirestoreRepo | null): void {
      state.current = repo;
      state.analysis = repo?.analysisData || null;
      state.lastUpdated = new Date().toISOString();
    },

    setLoading(loading: boolean): void {
      state.loading = loading;
    },

    setError(error: string | null): void {
      state.error = error;
      state.loading = false;
    },

    setFreshness(isStale: boolean, reason?: 'github-updated' | 'analysis-missing' | 'firestore-error'): void {
      state.freshness = {
        isStale,
        lastChecked: new Date().toISOString(),
        reason
      };
    },

    reset(): void {
      state = createDefaultState();
    }
  };
})();