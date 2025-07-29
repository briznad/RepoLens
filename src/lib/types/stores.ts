import type { ChatMessage } from '$types/chat';
import type { AnalysisResult, Subsystem, SubsystemDescription, Framework, SearchResult } from '$types/analysis';
import type { FirestoreRepo, AnalysisStatus } from '$types/repository';

// Store-specific interfaces for state management
export interface RepoState {
  current: FirestoreRepo | null;
  analysis: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  freshness: {
    isStale: boolean;
    lastChecked: string;
    reason?: 'github-updated' | 'analysis-missing' | 'firestore-error';
  };
}

export interface DocumentationData {
  subsystems: Array<Subsystem & { description?: SubsystemDescription }>;
  searchResults: SearchResult[];
  recentlyViewed: Array<{
    subsystemName: string;
    timestamp: string;
    repoId: string;
    repoName: string;
  }>;
  aiDescriptions: Map<string, {
    content: string;
    timestamp: string;
    expiresAt: string;
  }>;
  currentSubsystem: string | null;
  searchQuery: string;
  filterState: {
    framework: Framework | 'all';
    sortBy: 'name' | 'files' | 'alphabetical';
    showEmptySubsystems: boolean;
  };
}

export interface ChatHistory {
  sessions: Map<string, {
    repoId: string;
    messages: ChatMessage[];
    createdAt: string;
    lastUpdated: string;
  }>;
  currentSession: string | null;
  isStreaming: boolean;
  error: string | null;
  preferences: {
    enableAutoScroll: boolean;
    showTimestamps: boolean;
    enableSounds: boolean;
    maxHistorySize: number;
  };
}

export interface NavigationState {
  currentPage: 'home' | 'analyze' | 'repo' | 'docs' | 'chat' | 'architecture';
  previousPage: string | null;
  breadcrumbs: Array<{
    label: string;
    path: string;
    icon?: string;
  }>;
  repoContext: {
    repoId: string | null;
    repoName: string | null;
    currentSubsystem: string | null;
  };
  sidebarOpen: boolean;
  selectedFiles: string[];
  expandedDirectories: string[];
  scrollPositions: Map<string, number>;
  routeHistory: string[];
}

// Enhanced search types for store
export interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  filters: {
    type: 'file' | 'content' | 'symbol' | 'all';
    languages: string[];
    subsystems: string[];
    dateRange?: {
      from: string;
      to: string;
    };
  };
  recentSearches: Array<{
    query: string;
    timestamp: string;
    resultCount: number;
  }>;
  suggestions: string[];
}

// Cache management interfaces
export interface CacheEntry<T> {
  data: T;
  timestamp: string;
  expiresAt: string;
  version: string;
  size: number;
}

export interface CacheManager {
  repositories: Map<string, CacheEntry<FirestoreRepo>>;
  analyses: Map<string, CacheEntry<AnalysisResult>>;
  aiDescriptions: Map<string, CacheEntry<string>>;
  maxSize: number;
  currentSize: number;
  lastCleanup: string;
}

// Persistence configuration
export interface PersistenceConfig {
  storage: 'localStorage' | 'sessionStorage' | 'indexedDB';
  key: string;
  version: string;
  compress: boolean;
  encrypt: boolean;
  maxAge: number; // milliseconds
  serializer: {
    serialize: (data: any) => string;
    deserialize: (data: string) => any;
  };
}

// Store interfaces for application state
export interface RepoStore {
  docId: string | null;
  url: string | null;
  owner: string | null;
  name: string | null;
  fullName: string | null;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  defaultBranch: string | null;
  analysisData: AnalysisResult | null;
  analysisStatus: AnalysisStatus;
  lastAnalyzed: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface AnalysisStatusStore {
  isAnalyzing: boolean;
  currentStep: string;
  progress: number;
  totalSteps: number;
  error: string | null;
  completedAt: string | null;
}