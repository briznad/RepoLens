import type { DocumentationData } from '$types/stores';
import type { SearchResult, Subsystem, SubsystemDescription } from '$types/analysis';

/**
 * Pure reactive store for documentation state
 * Contains only reactive state, no business logic
 */

const createDefaultState = (): DocumentationData => ({
  subsystems: [],
  searchResults: [],
  recentlyViewed: [],
  aiDescriptions: new Map(),
  currentSubsystem: null,
  searchQuery: '',
  filterState: {
    framework: 'all',
    sortBy: 'name',
    showEmptySubsystems: false
  }
});

export const documentationStore = (() => {
  let state = $state<DocumentationData>(createDefaultState());

  return {
    get value() { return state; },

    // Simple state setters
    setSubsystems(subsystems: Array<Subsystem & { description?: SubsystemDescription }>): void {
      state.subsystems = subsystems;
    },

    setSearchResults(query: string, results: SearchResult[]): void {
      state.searchQuery = query;
      state.searchResults = results;
    },

    setCurrentSubsystem(subsystemName: string | null): void {
      state.currentSubsystem = subsystemName;
    },

    addRecentlyViewed(item: {
      subsystemName: string;
      timestamp: string;
      repoId: string;
      repoName: string;
    }): void {
      // Remove existing entry if present
      state.recentlyViewed = state.recentlyViewed.filter(
        existing => !(existing.subsystemName === item.subsystemName && existing.repoId === item.repoId)
      );
      
      // Add to beginning
      state.recentlyViewed.unshift(item);
    },

    limitRecentlyViewed(limit: number): void {
      state.recentlyViewed = state.recentlyViewed.slice(0, limit);
    },

    setFilterState(filters: Partial<DocumentationData['filterState']>): void {
      state.filterState = { ...state.filterState, ...filters };
    },

    cacheAIDescription(key: string, content: string, timestamp: string, expiresAt: string): void {
      state.aiDescriptions.set(key, { content, timestamp, expiresAt });
    },

    getAIDescription(key: string): { content: string; timestamp: string; expiresAt: string } | null {
      return state.aiDescriptions.get(key) || null;
    },

    removeExpiredAIDescription(key: string): void {
      state.aiDescriptions.delete(key);
    },

    reset(): void {
      state = createDefaultState();
    }
  };
})();