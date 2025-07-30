import type { SearchState } from '$types/stores';
import type { SearchResult } from '$types/analysis';

/**
 * Pure reactive store for search state
 * Contains only reactive state, no business logic
 */

const createDefaultState = (): SearchState => ({
  query: '',
  results: [],
  isSearching: false,
  filters: {
    type: 'all',
    languages: [],
    subsystems: [],
  },
  recentSearches: [],
  suggestions: []
});

export const searchStore = (() => {
  let state = $state<SearchState>(createDefaultState());

  return {
    get value() { return state; },

    // Search operations
    setQuery(query: string): void {
      state.query = query;
    },

    setResults(results: SearchResult[]): void {
      state.results = results;
      state.isSearching = false;
    },

    setSearching(isSearching: boolean): void {
      state.isSearching = isSearching;
    },

    // Filter operations
    setFilters(filters: Partial<SearchState['filters']>): void {
      state.filters = { ...state.filters, ...filters };
    },

    // Recent searches
    addRecentSearch(query: string, resultCount: number): void {
      if (query.trim().length < 2) return;
      
      // Remove existing entry
      state.recentSearches = state.recentSearches.filter(s => s.query !== query);
      
      // Add to beginning
      state.recentSearches.unshift({
        query,
        timestamp: new Date().toISOString(),
        resultCount
      });
    },

    limitRecentSearches(maxCount: number): void {
      state.recentSearches = state.recentSearches.slice(0, maxCount);
    },

    clearRecentSearches(): void {
      state.recentSearches = [];
    },

    // Suggestions
    setSuggestions(suggestions: string[]): void {
      state.suggestions = suggestions;
    },

    reset(): void {
      state = createDefaultState();
    }
  };
})();