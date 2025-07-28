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

export const chatHistory = (() => {
  let state = $state<ChatHistory>(createDefaultChatHistory());
  
  return {
    get value() { return state; },
    
    // Session management
    createSession(repoId: string): string {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      state.sessions.set(sessionId, {
        repoId,
        messages: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
      state.currentSession = sessionId;
      persistState('chatHistory', state);
      return sessionId;
    },
    
    setCurrentSession(sessionId: string | null): void {
      if (sessionId && state.sessions.has(sessionId)) {
        state.currentSession = sessionId;
      } else {
        state.currentSession = null;
      }
    },
    
    // Message operations
    addMessage(message: ChatMessage): void {
      const sessionId = state.currentSession;
      if (!sessionId) {
        throw new StoreError('No active chat session', 'NO_SESSION');
      }
      
      const session = state.sessions.get(sessionId);
      if (!session) {
        throw new StoreError('Chat session not found', 'SESSION_NOT_FOUND', { sessionId });
      }
      
      session.messages.push(message);
      session.lastUpdated = new Date().toISOString();
      
      // Limit message history
      const maxSize = state.preferences.maxHistorySize;
      if (session.messages.length > maxSize) {
        session.messages = session.messages.slice(-maxSize);
      }
      
      persistState('chatHistory', state);
    },
    
    setStreaming(isStreaming: boolean): void {
      state.isStreaming = isStreaming;
    },
    
    setError(error: string | null): void {
      state.error = error;
    },
    
    // Session operations
    getSessionMessages(sessionId: string): ChatMessage[] {
      return state.sessions.get(sessionId)?.messages || [];
    },
    
    deleteSession(sessionId: string): void {
      state.sessions.delete(sessionId);
      if (state.currentSession === sessionId) {
        state.currentSession = null;
      }
      persistState('chatHistory', state);
    },
    
    clearAllSessions(): void {
      state.sessions.clear();
      state.currentSession = null;
      persistState('chatHistory', state);
    },
    
    clear(): void {
      state = createDefaultChatHistory();
      clearPersistedState('chatHistory');
    }
  };
})();

export const navigationState = (() => {
  let state = $state<NavigationState>(createDefaultNavigationState());
  
  return {
    get value() { return state; },
    
    // Page navigation
    setCurrentPage(page: NavigationState['currentPage']): void {
      state.previousPage = state.currentPage;
      state.currentPage = page;
      state.routeHistory.push(page);
      
      // Limit route history
      if (state.routeHistory.length > 20) {
        state.routeHistory = state.routeHistory.slice(-20);
      }
      
      persistState('navigationState', state);
    },
    
    // Repository context
    setRepoContext(repoId: string | null, repoName: string | null): void {
      state.repoContext.repoId = repoId;
      state.repoContext.repoName = repoName;
      state.repoContext.currentSubsystem = null;
      persistState('navigationState', state);
    },
    
    setCurrentSubsystem(subsystemName: string | null): void {
      state.repoContext.currentSubsystem = subsystemName;
    },
    
    // Breadcrumbs
    setBreadcrumbs(breadcrumbs: NavigationState['breadcrumbs']): void {
      state.breadcrumbs = breadcrumbs;
    },
    
    addBreadcrumb(label: string, path: string, icon?: string): void {
      const existingIndex = state.breadcrumbs.findIndex(b => b.path === path);
      
      if (existingIndex >= 0) {
        // Remove all breadcrumbs after this one
        state.breadcrumbs = state.breadcrumbs.slice(0, existingIndex + 1);
      } else {
        state.breadcrumbs.push({ label, path, icon });
      }
    },
    
    // UI state
    setSidebarOpen(open: boolean): void {
      state.sidebarOpen = open;
      persistState('navigationState', state);
    },
    
    // File operations
    toggleFileSelection(filePath: string): void {
      const index = state.selectedFiles.indexOf(filePath);
      if (index >= 0) {
        state.selectedFiles.splice(index, 1);
      } else {
        state.selectedFiles.push(filePath);
      }
    },
    
    clearFileSelection(): void {
      state.selectedFiles = [];
    },
    
    // Directory operations
    toggleDirectoryExpansion(dirPath: string): void {
      const index = state.expandedDirectories.indexOf(dirPath);
      if (index >= 0) {
        state.expandedDirectories.splice(index, 1);
      } else {
        state.expandedDirectories.push(dirPath);
      }
    },
    
    // Scroll positions
    saveScrollPosition(path: string, position: number): void {
      state.scrollPositions.set(path, position);
    },
    
    getScrollPosition(path: string): number {
      return state.scrollPositions.get(path) || 0;
    },
    
    clear(): void {
      state = createDefaultNavigationState();
      clearPersistedState('navigationState');
    }
  };
})();

export const searchState = (() => {
  let state = $state<SearchState>(createDefaultSearchState());
  
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
      persistState('searchState', state);
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
      
      // Limit recent searches
      state.recentSearches = state.recentSearches.slice(0, 20);
      persistState('searchState', state);
    },
    
    clearRecentSearches(): void {
      state.recentSearches = [];
      persistState('searchState', state);
    },
    
    // Suggestions
    setSuggestions(suggestions: string[]): void {
      state.suggestions = suggestions;
    },
    
    clear(): void {
      state = createDefaultSearchState();
      clearPersistedState('searchState');
    }
  };
})();

export const userPreferences = (() => {
  let state = $state<UserPreferences>(DEFAULT_USER_PREFERENCES);
  
  return {
    get value() { return state; },
    
    // Theme settings
    setTheme(theme: UserPreferences['theme']): void {
      state.theme = theme;
      persistState('userPreferences', state);
    },
    
    setLanguage(language: string): void {
      state.language = language;
      persistState('userPreferences', state);
    },
    
    // Code editor preferences
    setCodeEditorPrefs(prefs: Partial<UserPreferences['codeEditor']>): void {
      state.codeEditor = { ...state.codeEditor, ...prefs };
      persistState('userPreferences', state);
    },
    
    // Analysis preferences
    setAnalysisPrefs(prefs: Partial<UserPreferences['analysis']>): void {
      state.analysis = { ...state.analysis, ...prefs };
      persistState('userPreferences', state);
    },
    
    // Notification preferences
    setNotificationPrefs(prefs: Partial<UserPreferences['notifications']>): void {
      state.notifications = { ...state.notifications, ...prefs };
      persistState('userPreferences', state);
    },
    
    // Documentation preferences
    setDocumentationPrefs(prefs: Partial<UserPreferences['documentation']>): void {
      state.documentation = { ...state.documentation, ...prefs };
      persistState('userPreferences', state);
    },
    
    // Navigation preferences
    setNavigationPrefs(prefs: Partial<UserPreferences['navigation']>): void {
      state.navigation = { ...state.navigation, ...prefs };
      persistState('userPreferences', state);
    },
    
    // Bulk operations
    updatePreferences(prefs: Partial<UserPreferences>): void {
      Object.assign(state, prefs);
      persistState('userPreferences', state);
    },
    
    resetToDefaults(): void {
      state = { ...DEFAULT_USER_PREFERENCES };
      persistState('userPreferences', state);
    },
    
    clear(): void {
      state = { ...DEFAULT_USER_PREFERENCES };
      clearPersistedState('userPreferences');
    }
  };
})();

export const cacheManager = (() => {
  let state = $state<CacheManager>(createDefaultCacheManager());
  
  return {
    get value() { return state; },
    
    // Repository caching
    cacheRepository(key: string, repo: FirestoreRepo, ttlHours: number = 24): void {
      const entry: CacheEntry<FirestoreRepo> = {
        data: repo,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
        version: '1.0.0',
        size: JSON.stringify(repo).length
      };
      
      state.repositories.set(key, entry);
      state.currentSize += entry.size;
      this.cleanup();
      persistState('cacheManager', state);
    },
    
    getRepository(key: string): FirestoreRepo | null {
      const entry = state.repositories.get(key);
      if (!entry) return null;
      
      // Check expiration
      if (new Date(entry.expiresAt) < new Date()) {
        state.repositories.delete(key);
        state.currentSize -= entry.size;
        return null;
      }
      
      return entry.data;
    },
    
    // Analysis caching
    cacheAnalysis(key: string, analysis: AnalysisResult, ttlHours: number = 12): void {
      const entry: CacheEntry<AnalysisResult> = {
        data: analysis,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
        version: '1.0.0',
        size: JSON.stringify(analysis).length
      };
      
      state.analyses.set(key, entry);
      state.currentSize += entry.size;
      this.cleanup();
      persistState('cacheManager', state);
    },
    
    getAnalysis(key: string): AnalysisResult | null {
      const entry = state.analyses.get(key);
      if (!entry) return null;
      
      if (new Date(entry.expiresAt) < new Date()) {
        state.analyses.delete(key);
        state.currentSize -= entry.size;
        return null;
      }
      
      return entry.data;
    },
    
    // AI description caching
    cacheAIDescription(key: string, description: string, ttlHours: number = 48): void {
      const entry: CacheEntry<string> = {
        data: description,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
        version: '1.0.0',
        size: description.length
      };
      
      state.aiDescriptions.set(key, entry);
      state.currentSize += entry.size;
      this.cleanup();
      persistState('cacheManager', state);
    },
    
    getAIDescription(key: string): string | null {
      const entry = state.aiDescriptions.get(key);
      if (!entry) return null;
      
      if (new Date(entry.expiresAt) < new Date()) {
        state.aiDescriptions.delete(key);
        state.currentSize -= entry.size;
        return null;
      }
      
      return entry.data;
    },
    
    // Cache management
    cleanup(): void {
      // Remove expired entries
      this.removeExpired();
      
      // LRU eviction if over size limit
      if (state.currentSize > state.maxSize) {
        this.evictLRU();
      }
      
      state.lastCleanup = new Date().toISOString();
    },
    
    removeExpired(): void {
      const now = new Date();
      
      // Clean repositories
      for (const [key, entry] of state.repositories) {
        if (new Date(entry.expiresAt) < now) {
          state.repositories.delete(key);
          state.currentSize -= entry.size;
        }
      }
      
      // Clean analyses
      for (const [key, entry] of state.analyses) {
        if (new Date(entry.expiresAt) < now) {
          state.analyses.delete(key);
          state.currentSize -= entry.size;
        }
      }
      
      // Clean AI descriptions
      for (const [key, entry] of state.aiDescriptions) {
        if (new Date(entry.expiresAt) < now) {
          state.aiDescriptions.delete(key);
          state.currentSize -= entry.size;
        }
      }
    },
    
    evictLRU(): void {
      // Collect all entries with timestamps
      const allEntries: Array<{ key: string; timestamp: string; size: number; type: string }> = [];
      
      for (const [key, entry] of state.repositories) {
        allEntries.push({ key, timestamp: entry.timestamp, size: entry.size, type: 'repository' });
      }
      
      for (const [key, entry] of state.analyses) {
        allEntries.push({ key, timestamp: entry.timestamp, size: entry.size, type: 'analysis' });
      }
      
      for (const [key, entry] of state.aiDescriptions) {
        allEntries.push({ key, timestamp: entry.timestamp, size: entry.size, type: 'description' });
      }
      
      // Sort by timestamp (oldest first)
      allEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Remove oldest entries until under size limit
      for (const entry of allEntries) {
        if (state.currentSize <= state.maxSize * 0.8) break; // Leave some buffer
        
        switch (entry.type) {
          case 'repository':
            state.repositories.delete(entry.key);
            break;
          case 'analysis':
            state.analyses.delete(entry.key);
            break;
          case 'description':
            state.aiDescriptions.delete(entry.key);
            break;
        }
        
        state.currentSize -= entry.size;
      }
    },
    
    clear(): void {
      state = createDefaultCacheManager();
      clearPersistedState('cacheManager');
    },
    
    // Statistics
    getStats() {
      return {
        totalEntries: state.repositories.size + state.analyses.size + state.aiDescriptions.size,
        currentSize: state.currentSize,
        maxSize: state.maxSize,
        utilizationPercent: Math.round((state.currentSize / state.maxSize) * 100),
        repositories: state.repositories.size,
        analyses: state.analyses.size,
        aiDescriptions: state.aiDescriptions.size,
        lastCleanup: state.lastCleanup
      };
    }
  };
})();

// Validation functions
function validateRepo(repo: FirestoreRepo): void {
  if (!repo.id || !repo.fullName) {
    throw new ValidationError('Repository must have id and fullName', 'repo', repo);
  }
}

// Persistence utilities
function persistState(key: string, data: any): void {
  if (!browser) return;
  
  try {
    const serialized = PERSISTENCE_CONFIG.serializer.serialize(data);
    const storageKey = `${PERSISTENCE_CONFIG.key}_${key}`;
    
    if (PERSISTENCE_CONFIG.storage === 'localStorage') {
      localStorage.setItem(storageKey, serialized);
    } else if (PERSISTENCE_CONFIG.storage === 'sessionStorage') {
      sessionStorage.setItem(storageKey, serialized);
    }
  } catch (error) {
    console.warn(`Failed to persist ${key}:`, error);
    throw new PersistenceError(`Failed to persist ${key}`, 'save');
  }
}

function loadPersistedState<T>(key: string, defaultValue: T): T {
  if (!browser) return defaultValue;
  
  try {
    const storageKey = `${PERSISTENCE_CONFIG.key}_${key}`;
    let stored: string | null = null;
    
    if (PERSISTENCE_CONFIG.storage === 'localStorage') {
      stored = localStorage.getItem(storageKey);
    } else if (PERSISTENCE_CONFIG.storage === 'sessionStorage') {
      stored = sessionStorage.getItem(storageKey);
    }
    
    if (!stored) return defaultValue;
    
    return PERSISTENCE_CONFIG.serializer.deserialize(stored);
  } catch (error) {
    console.warn(`Failed to load persisted ${key}:`, error);
    return defaultValue;
  }
}

function clearPersistedState(key: string): void {
  if (!browser) return;
  
  try {
    const storageKey = `${PERSISTENCE_CONFIG.key}_${key}`;
    
    if (PERSISTENCE_CONFIG.storage === 'localStorage') {
      localStorage.removeItem(storageKey);
    } else if (PERSISTENCE_CONFIG.storage === 'sessionStorage') {
      sessionStorage.removeItem(storageKey);
    }
  } catch (error) {
    console.warn(`Failed to clear persisted ${key}:`, error);
    throw new PersistenceError(`Failed to clear ${key}`, 'clear');
  }
}

// Store initialization and utility functions

/**
 * Initialize all stores on app startup
 */
export function initializeStores(): void {
  if (!browser) return;
  
  try {
    // Load persisted state for all stores
    const loadedRepo = loadPersistedState('currentRepo', createDefaultRepoState());
    const loadedDocs = loadPersistedState('documentationData', createDefaultDocumentationData());
    const loadedChat = loadPersistedState('chatHistory', createDefaultChatHistory());
    const loadedNav = loadPersistedState('navigationState', createDefaultNavigationState());
    const loadedSearch = loadPersistedState('searchState', createDefaultSearchState());
    const loadedPrefs = loadPersistedState('userPreferences', DEFAULT_USER_PREFERENCES);
    const loadedCache = loadPersistedState('cacheManager', createDefaultCacheManager());
    
    // Initialize stores with loaded data
    Object.assign(currentRepo.value, loadedRepo);
    Object.assign(documentationData.value, loadedDocs);
    Object.assign(chatHistory.value, loadedChat);
    Object.assign(navigationState.value, loadedNav);
    Object.assign(searchState.value, loadedSearch);
    Object.assign(userPreferences.value, loadedPrefs);
    Object.assign(cacheManager.value, loadedCache);
    
    // Cleanup cache on startup
    cacheManager.cleanup();
    
  } catch (error) {
    console.warn('Failed to initialize stores:', error);
  }
}

/**
 * Clear all store data (useful for logout or reset)
 */
export function clearAllStores(): void {
  currentRepo.clear();
  documentationData.clear();
  chatHistory.clear();
  navigationState.clear();
  searchState.clear();
  userPreferences.clear();
  cacheManager.clear();
}

// Legacy compatibility functions for existing code
export function getRepoDocId(): string | null {
  return currentRepo.value.current?.id || null;
}

export function isRepoAnalyzed(): boolean {
  return currentRepo.value.analysis !== null;
}

export function getSubsystemByName(name: string): Subsystem | null {
  const analysis = currentRepo.value.analysis;
  if (!analysis?.subsystems) return null;
  
  return analysis.subsystems.find(subsystem => 
    subsystem.name.toLowerCase() === name.toLowerCase()
  ) || null;
}

export function getAllSubsystems(): Subsystem[] {
  return currentRepo.value.analysis?.subsystems || [];
}

export function getLanguageDistribution(): Record<string, number> {
  return currentRepo.value.analysis?.languages || {};
}

export function getFileCount(): number {
  return currentRepo.value.analysis?.fileCount || 0;
}

export function hasFramework(framework: string): boolean {
  const currentFramework = currentRepo.value.analysis?.framework;
  return currentFramework?.toLowerCase() === framework.toLowerCase();
}