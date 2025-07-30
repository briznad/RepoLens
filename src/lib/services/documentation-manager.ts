import type { SearchResult, SubsystemDescription } from '$types/analysis';
import { documentationStore } from '$stores/documentation.svelte';
import { navigationStore } from '$stores/navigation.svelte';
import { preferencesStore } from '$stores/preferences.svelte';
import { persistence } from './persistence';
import { cache } from './cache';

/**
 * Documentation management service - handles business logic for documentation operations
 */

export class DocumentationManager {

  /**
   * Set current subsystem and add to recently viewed
   */
  setCurrentSubsystem(subsystemName: string | null): void {
    documentationStore.setCurrentSubsystem(subsystemName);
    navigationStore.setCurrentSubsystem(subsystemName);

    if (subsystemName) {
      this.addToRecentlyViewed(subsystemName);
    }
  }

  /**
   * Add subsystem to recently viewed list
   */
  addToRecentlyViewed(subsystemName: string): void {
    const repoContext = navigationStore.value.repoContext;
    if (!repoContext.repoId || !repoContext.repoName) return;

    const item = {
      subsystemName,
      timestamp: new Date().toISOString(),
      repoId: repoContext.repoId,
      repoName: repoContext.repoName
    };

    documentationStore.addRecentlyViewed(item);

    // Limit to preference setting
    const limit = preferencesStore.value.documentation.recentViewLimit;
    documentationStore.limitRecentlyViewed(limit);

    persistence.save('documentationData', documentationStore.value);
  }

  /**
   * Update search results
   */
  updateSearchResults(query: string, results: SearchResult[]): void {
    documentationStore.setSearchResults(query, results);

    // Add to recent searches if query is meaningful
    if (query.trim().length > 2) {
      this.addToRecentSearches(query, results.length);
    }
  }

  /**
   * Add query to recent searches (delegates to search manager if available)
   */
  private addToRecentSearches(query: string, resultCount: number): void {
    // This would typically be handled by a search manager
    // For now, we'll store it in documentation data
    console.log(`Search: "${query}" returned ${resultCount} results`);
  }

  /**
   * Set filter state
   */
  setFilterState(filters: Partial<typeof documentationStore.value.filterState>): void {
    documentationStore.setFilterState(filters);
    persistence.save('documentationData', documentationStore.value);
  }

  /**
   * Cache AI description with expiration
   */
  cacheAIDescription(key: string, content: string, expirationHours: number = 24): void {
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString();
    const timestamp = new Date().toISOString();

    documentationStore.cacheAIDescription(key, content, timestamp, expiresAt);

    // Also cache in the cache service for cross-session persistence
    cache.cacheAIDescription(key, content, expirationHours);

    persistence.save('documentationData', documentationStore.value);
  }

  /**
   * Get AI description if not expired
   */
  getAIDescription(key: string): string | null {
    const cached = documentationStore.getAIDescription(key);
    if (!cached) {
      // Try cache service
      return cache.getAIDescription(key);
    }

    // Check expiration
    if (new Date(cached.expiresAt) < new Date()) {
      documentationStore.removeExpiredAIDescription(key);
      return cache.getAIDescription(key); // Fallback to cache service
    }

    return cached.content;
  }

  /**
   * Get subsystem data by name
   */
  getSubsystemData(subsystemName: string): SubsystemDescription | null {
    const subsystem = documentationStore.value.subsystems.find(s => s.name === subsystemName);
    return subsystem?.description || null;
  }

  /**
   * Get current subsystem name
   */
  getCurrentSubsystem(): string | null {
    return documentationStore.value.currentSubsystem;
  }

  /**
   * Get all subsystems
   */
  getSubsystems() {
    return documentationStore.value.subsystems;
  }

  /**
   * Get recently viewed items
   */
  getRecentlyViewed() {
    return documentationStore.value.recentlyViewed;
  }

  /**
   * Get current search results
   */
  getSearchResults() {
    return {
      query: documentationStore.value.searchQuery,
      results: documentationStore.value.searchResults
    };
  }

  /**
   * Get filter state
   */
  getFilterState() {
    return documentationStore.value.filterState;
  }

  /**
   * Clear all documentation data
   */
  clear(): void {
    documentationStore.reset();
    persistence.clear('documentationData');
  }

  /**
   * Initialize documentation manager with persisted data
   */
  initialize(): void {
    const defaultState = {
      subsystems: [],
      searchResults: [],
      recentlyViewed: [],
      aiDescriptions: new Map(),
      currentSubsystem: null,
      searchQuery: '',
      filterState: {
        framework: 'all' as const,
        sortBy: 'name' as const,
        showEmptySubsystems: false
      }
    };

    const persistedState = persistence.load('documentationData', defaultState);

    // Restore state (stores will handle the reactive updates)
    if (persistedState.subsystems) {
      documentationStore.setSubsystems(persistedState.subsystems);
    }

    if (persistedState.searchQuery || persistedState.searchResults) {
      documentationStore.setSearchResults(persistedState.searchQuery || '', persistedState.searchResults || []);
    }

    if (persistedState.currentSubsystem) {
      documentationStore.setCurrentSubsystem(persistedState.currentSubsystem);
    }

    if (persistedState.filterState) {
      documentationStore.setFilterState(persistedState.filterState);
    }

    if (persistedState.recentlyViewed) {
      for (const item of persistedState.recentlyViewed) {
        documentationStore.addRecentlyViewed(item);
      }
    }

    if (persistedState.aiDescriptions instanceof Map) {
      for (const [key, value] of persistedState.aiDescriptions) {
        documentationStore.cacheAIDescription(key, value.content, value.timestamp, value.expiresAt);
      }
    }
  }
}

// Create default documentation manager instance
export const documentationManager = new DocumentationManager();