import { browser } from '$app/environment';
import { getRepoById } from '$lib/services/repository';
import type {
  RepoState,
  DocumentationData,
  ChatHistory,
  NavigationState,
  UserPreferences,
  SearchState,
  CacheManager,
  CacheEntry,
  FirestoreRepo,
  AnalysisResult,
  RepoData,
  Subsystem,
  SubsystemDescription,
  SearchResult,
  ChatMessage,
  Framework,
  StoreError,
  PersistenceError,
  ValidationError,
  PersistenceConfig
} from './types';

// Default configurations
const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'en',
  codeEditor: {
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    lineNumbers: true,
    wordWrap: true,
    theme: 'dark'
  },
  analysis: {
    includeTests: true,
    includeConfig: true,
    maxFileSize: 1024 * 1024, // 1MB
    languages: ['typescript', 'javascript', 'python', 'svelte']
  },
  notifications: {
    analysisComplete: true,
    newInsights: true,
    errors: true
  },
  documentation: {
    autoExpandSubsystems: true,
    showFilePreview: true,
    enableAIDescriptions: true,
    recentViewLimit: 10
  },
  navigation: {
    rememberLastPage: true,
    showBreadcrumbs: true,
    sidebarCollapsed: false
  }
};

const PERSISTENCE_CONFIG: PersistenceConfig = {
  storage: 'localStorage',
  key: 'repolens-store',
  version: '1.0.0',
  compress: false,
  encrypt: false,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  serializer: {
    serialize: (data: any) => JSON.stringify(data, mapReplacer),
    deserialize: (data: string) => JSON.parse(data, mapReviver)
  }
};

// Map serialization helpers
function mapReplacer(key: string, value: any): any {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries())
    };
  }
  return value;
}

function mapReviver(key: string, value: any): any {
  if (typeof value === 'object' && value !== null && value.dataType === 'Map') {
    return new Map(value.value);
  }
  return value;
}

// Initialize default states
const createDefaultRepoState = (): RepoState => ({
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

const createDefaultDocumentationData = (): DocumentationData => ({
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

const createDefaultChatHistory = (): ChatHistory => ({
  sessions: new Map(),
  currentSession: null,
  isStreaming: false,
  error: null,
  preferences: {
    enableAutoScroll: true,
    showTimestamps: true,
    enableSounds: false,
    maxHistorySize: 100
  }
});

const createDefaultNavigationState = (): NavigationState => ({
  currentPage: 'home',
  previousPage: null,
  breadcrumbs: [],
  repoContext: {
    repoId: null,
    repoName: null,
    currentSubsystem: null
  },
  sidebarOpen: false,
  selectedFiles: [],
  expandedDirectories: [],
  scrollPositions: new Map(),
  routeHistory: []
});

const createDefaultSearchState = (): SearchState => ({
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

const createDefaultCacheManager = (): CacheManager => ({
  repositories: new Map(),
  analyses: new Map(),
  aiDescriptions: new Map(),
  maxSize: 50 * 1024 * 1024, // 50MB
  currentSize: 0,
  lastCleanup: new Date().toISOString()
});

// Core stores using Svelte 5 runes
export const currentRepo = (() => {
  let state = $state<RepoState>(createDefaultRepoState());
  
  return {
    get value() { return state; },
    
    // Repository management
    setRepo(repo: FirestoreRepo): void {
      try {
        validateRepo(repo);
        state.current = repo;
        state.analysis = repo.analysisData || null;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
        persistState('currentRepo', state);
      } catch (error) {
        state.error = error instanceof Error ? error.message : 'Failed to set repository';
        throw new ValidationError('Invalid repository data', 'repo', repo);
      }
    },
    
    setLoading(loading: boolean): void {
      state.loading = loading;
    },
    
    setError(error: string | null): void {
      state.error = error;
      state.loading = false;
    },
    
    updateFreshness(isStale: boolean, reason?: 'github-updated' | 'analysis-missing' | 'firestore-error'): void {
      state.freshness = {
        isStale,
        lastChecked: new Date().toISOString(),
        reason
      };
    },
    
    clear(): void {
      state = createDefaultRepoState();
      clearPersistedState('currentRepo');
    }
  };
})();

export const documentationData = (() => {
  let state = $state<DocumentationData>(createDefaultDocumentationData());
  
  return {
    get value() { return state; },
    
    // Analysis data management
    setRepoAnalysis(repoData: RepoData, analysisData: AnalysisResult): void {
      try {
        state.subsystems = analysisData.subsystems.map(subsystem => {
          const description = analysisData.subsystemDescriptions?.find(
            desc => desc.name === subsystem.name
          );
          return { ...subsystem, description };
        });
        
        // Clear previous search results when setting new analysis
        state.searchResults = [];
        state.searchQuery = '';
        
        persistState('documentationData', state);
      } catch (error) {
        throw new StoreError('Failed to set repository analysis', 'ANALYSIS_ERROR', { repoData, analysisData });
      }
    },
    
    // Subsystem operations
    getSubsystemData(subsystemName: string): SubsystemDescription | null {
      const subsystem = state.subsystems.find(s => s.name === subsystemName);
      return subsystem?.description || null;
    },
    
    setCurrentSubsystem(subsystemName: string | null): void {
      state.currentSubsystem = subsystemName;
      if (subsystemName) {
        this.addToRecentlyViewed(subsystemName);
      }
    },
    
    addToRecentlyViewed(subsystemName: string): void {
      const repoContext = navigationState.value.repoContext;
      if (!repoContext.repoId || !repoContext.repoName) return;
      
      // Remove existing entry if present
      state.recentlyViewed = state.recentlyViewed.filter(
        item => !(item.subsystemName === subsystemName && item.repoId === repoContext.repoId)
      );
      
      // Add to beginning
      state.recentlyViewed.unshift({
        subsystemName,
        timestamp: new Date().toISOString(),
        repoId: repoContext.repoId,
        repoName: repoContext.repoName
      });
      
      // Limit to preference setting
      const limit = userPreferences.value.documentation.recentViewLimit;
      state.recentlyViewed = state.recentlyViewed.slice(0, limit);
      
      persistState('documentationData', state);
    },
    
    // Search operations
    updateSearchResults(query: string, results: SearchResult[]): void {
      state.searchQuery = query;
      state.searchResults = results;
      
      // Add to recent searches if query is meaningful
      if (query.trim().length > 2) {
        this.addToRecentSearches(query, results.length);
      }
    },
    
    addToRecentSearches(query: string, resultCount: number): void {
      // Remove existing entry
      state.recentlyViewed = state.recentlyViewed.filter(
        search => search.query !== query
      );
      
      // Add new entry
      searchState.value.recentSearches.unshift({
        query,
        timestamp: new Date().toISOString(),
        resultCount
      });
      
      // Limit recent searches
      searchState.value.recentSearches = searchState.value.recentSearches.slice(0, 20);
    },
    
    // Filter operations
    setFilterState(filters: Partial<DocumentationData['filterState']>): void {
      state.filterState = { ...state.filterState, ...filters };
      persistState('documentationData', state);
    },
    
    // AI descriptions
    cacheAIDescription(key: string, content: string, expirationHours: number = 24): void {
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString();
      state.aiDescriptions.set(key, {
        content,
        timestamp: new Date().toISOString(),
        expiresAt
      });
      persistState('documentationData', state);
    },
    
    getAIDescription(key: string): string | null {
      const cached = state.aiDescriptions.get(key);
      if (!cached) return null;
      
      // Check expiration
      if (new Date(cached.expiresAt) < new Date()) {
        state.aiDescriptions.delete(key);
        return null;
      }
      
      return cached.content;
    },
    
    clear(): void {
      state = createDefaultDocumentationData();
      clearPersistedState('documentationData');
    }
  };
})();

/**
 * Sync repository data with Firestore
 */
export async function syncWithFirestore(docId: string): Promise<void> {
  try {
    currentRepo.isLoading = true;
    currentRepo.error = null;
    
    const firestoreRepo = await getRepoById(docId);
    
    if (firestoreRepo) {
      setRepoFromFirestore(docId, firestoreRepo);
    } else {
      throw new Error('Repository not found');
    }
  } catch (error) {
    currentRepo.error = error instanceof Error ? error.message : 'Failed to sync with database';
    currentRepo.isLoading = false;
  }
}

/**
 * Clear current repository data
 */
export function clearRepo(): void {
  Object.assign(currentRepo, createDefaultRepoStore());
  Object.assign(analysisStatus, createDefaultAnalysisStatus());
  chatHistory.length = 0; // Clear array while maintaining reactivity
  navigationState.repoDocId = null;
}

/**
 * Update analysis status during processing
 */
export function updateAnalysisStatus(
  isAnalyzing: boolean,
  currentStep: string = '',
  progress: number = 0,
  error: string | null = null
): void {
  analysisStatus.isAnalyzing = isAnalyzing;
  analysisStatus.currentStep = currentStep;
  analysisStatus.progress = Math.min(100, Math.max(0, progress));
  analysisStatus.error = error;
  
  if (!isAnalyzing && error) {
    currentRepo.error = error;
  }
}

/**
 * Add message to chat history
 */
export function addChatMessage(
  content: string,
  role: 'user' | 'assistant',
  metadata?: ChatMessage['metadata']
): void {
  const message: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: currentRepo.docId || 'no-session',
    content,
    role,
    timestamp: new Date().toISOString(),
    repoDocId: currentRepo.docId || undefined,
    metadata
  };
  
  chatHistory.push(message);
  
  // Persist to localStorage
  if (browser && currentRepo.docId) {
    persistChatHistory(currentRepo.docId, chatHistory);
  }
}

/**
 * Clear chat history
 */
export function clearChatHistory(): void {
  chatHistory.length = 0;
  
  if (browser && currentRepo.docId) {
    localStorage.removeItem(`repolens_chat_${currentRepo.docId}`);
  }
}

/**
 * Update navigation state
 */
export function updateNavigationState(
  updates: Partial<NavigationState>
): void {
  Object.assign(navigationState, updates);
  
  // Persist navigation preferences
  if (browser) {
    persistNavigationPrefs();
  }
}

/**
 * Add breadcrumb to navigation
 */
export function addBreadcrumb(label: string, path: string): void {
  const existingIndex = navigationState.breadcrumbs.findIndex(b => b.path === path);
  
  if (existingIndex >= 0) {
    // Remove all breadcrumbs after this one
    navigationState.breadcrumbs = navigationState.breadcrumbs.slice(0, existingIndex + 1);
  } else {
    navigationState.breadcrumbs.push({ label, path });
  }
}

/**
 * Toggle file selection
 */
export function toggleFileSelection(filePath: string): void {
  const index = navigationState.selectedFiles.indexOf(filePath);
  
  if (index >= 0) {
    navigationState.selectedFiles.splice(index, 1);
  } else {
    navigationState.selectedFiles.push(filePath);
  }
}

/**
 * Toggle directory expansion
 */
export function toggleDirectoryExpansion(dirPath: string): void {
  const index = navigationState.expandedDirectories.indexOf(dirPath);
  
  if (index >= 0) {
    navigationState.expandedDirectories.splice(index, 1);
  } else {
    navigationState.expandedDirectories.push(dirPath);
  }
}

// Utility functions with full TypeScript support

/**
 * Get current repository's Firestore document ID
 */
export function getRepoDocId(): string | null {
  return currentRepo.docId;
}

/**
 * Check if current repository has completed analysis
 */
export function isRepoAnalyzed(): boolean {
  return currentRepo.analysisStatus === 'completed' && currentRepo.analysisData !== null;
}

/**
 * Get subsystem by name from current repository
 */
export function getSubsystemByName(name: string): Subsystem | null {
  if (!currentRepo.analysisData?.subsystems) {
    return null;
  }
  
  return currentRepo.analysisData.subsystems.find(subsystem => 
    subsystem.name.toLowerCase() === name.toLowerCase()
  ) || null;
}

/**
 * Get all subsystems from current repository
 */
export function getAllSubsystems(): Subsystem[] {
  return currentRepo.analysisData?.subsystems || [];
}

/**
 * Get repository language distribution
 */
export function getLanguageDistribution(): Record<string, number> {
  return currentRepo.analysisData?.languages || {};
}

/**
 * Get total file count
 */
export function getFileCount(): number {
  return currentRepo.analysisData?.fileCount || 0;
}

/**
 * Check if repository has specific framework
 */
export function hasFramework(framework: string): boolean {
  return currentRepo.analysisData?.framework.toLowerCase() === framework.toLowerCase();
}

// localStorage persistence functions

/**
 * Cache recent repository for quick access
 */
function cacheRecentRepo(docId: string, repoData: FirestoreRepo): void {
  try {
    const recent = getRecentReposFromStorage();
    const repoInfo = {
      docId,
      fullName: repoData.fullName,
      lastAccessed: new Date().toISOString()
    };
    
    // Remove existing entry if present
    const filtered = recent.filter(r => r.docId !== docId);
    
    // Add to beginning and limit to 10
    const updated = [repoInfo, ...filtered].slice(0, 10);
    
    localStorage.setItem(STORAGE_KEYS.RECENT_REPOS, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to cache recent repository:', error);
  }
}

/**
 * Get recent repositories from localStorage
 */
function getRecentReposFromStorage(): Array<{docId: string; fullName: string; lastAccessed: string}> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RECENT_REPOS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Persist chat history to localStorage
 */
function persistChatHistory(docId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(`repolens_chat_${docId}`, JSON.stringify(messages));
  } catch (error) {
    console.warn('Failed to persist chat history:', error);
  }
}

/**
 * Load chat history from localStorage
 */
export function loadChatHistory(docId: string): void {
  if (!browser) return;
  
  try {
    const stored = localStorage.getItem(`repolens_chat_${docId}`);
    if (stored) {
      const messages = JSON.parse(stored) as ChatMessage[];
      chatHistory.length = 0;
      chatHistory.push(...messages);
    }
  } catch (error) {
    console.warn('Failed to load chat history:', error);
  }
}

/**
 * Persist navigation preferences
 */
function persistNavigationPrefs(): void {
  try {
    const prefs = {
      sidebarOpen: navigationState.sidebarOpen,
      expandedDirectories: navigationState.expandedDirectories
    };
    localStorage.setItem(STORAGE_KEYS.NAVIGATION_PREFS, JSON.stringify(prefs));
  } catch (error) {
    console.warn('Failed to persist navigation preferences:', error);
  }
}

/**
 * Load navigation preferences from localStorage
 */
export function loadNavigationPrefs(): void {
  if (!browser) return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.NAVIGATION_PREFS);
    if (stored) {
      const prefs = JSON.parse(stored);
      navigationState.sidebarOpen = prefs.sidebarOpen ?? false;
      navigationState.expandedDirectories = prefs.expandedDirectories ?? [];
    }
  } catch (error) {
    console.warn('Failed to load navigation preferences:', error);
  }
}

/**
 * Get cached recent repositories for quick access
 */
export function getCachedRecentRepos(): Array<{docId: string; fullName: string; lastAccessed: string}> {
  if (!browser) return [];
  return getRecentReposFromStorage();
}

/**
 * Initialize stores on app startup
 */
export function initializeStores(): void {
  if (browser) {
    loadNavigationPrefs();
  }
}