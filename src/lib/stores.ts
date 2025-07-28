import { writable, derived, readable } from 'svelte/store';
import type { 
  AnalysisSession, 
  Repository, 
  ChatMessage, 
  FileNode, 
  RepositoryMetrics,
  ArchitectureInsight,
  DocumentationFile,
  UIState,
  UserPreferences,
  ArchitectureGraph
} from './types';

// Current analysis session
export const currentSession = writable<AnalysisSession | null>(null);

// Repository data
export const currentRepository = writable<Repository | null>(null);

// File tree structure
export const fileTree = writable<FileNode[]>([]);

// Repository metrics
export const repositoryMetrics = writable<RepositoryMetrics | null>(null);

// Architecture insights
export const architectureInsights = writable<ArchitectureInsight[]>([]);

// Documentation files
export const documentationFiles = writable<DocumentationFile[]>([]);

// Chat messages for current session
export const chatMessages = writable<ChatMessage[]>([]);

// Currently selected files
export const selectedFiles = writable<string[]>([]);

// Architecture graph data
export const architectureGraph = writable<ArchitectureGraph | null>(null);

// UI state
export const uiState = writable<UIState>({
  sidebarOpen: true,
  currentView: 'chat',
  selectedFiles: [],
  expandedDirectories: [],
  graphSettings: {
    layout: 'force',
    nodeSize: 'file-size',
    showLabels: true,
    filterBy: []
  }
});

// User preferences (persisted to localStorage)
const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  codeEditor: {
    fontSize: 14,
    fontFamily: 'Monaco, Consolas, monospace',
    lineNumbers: true,
    wordWrap: true,
    theme: 'dark'
  },
  analysis: {
    includeTests: true,
    includeConfig: true,
    maxFileSize: 1024 * 1024, // 1MB
    languages: []
  },
  notifications: {
    analysisComplete: true,
    newInsights: true,
    errors: true
  }
};

function createPersistedStore<T>(key: string, defaultValue: T) {
  const { subscribe, set, update } = writable(defaultValue);

  // Load from localStorage on initialization
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        set(JSON.parse(stored));
      } catch (error) {
        console.warn(`Failed to parse stored value for ${key}:`, error);
      }
    }
  }

  return {
    subscribe,
    set: (value: T) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
      set(value);
    },
    update: (updater: (value: T) => T) => {
      update((current) => {
        const updated = updater(current);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, JSON.stringify(updated));
        }
        return updated;
      });
    }
  };
}

export const userPreferences = createPersistedStore('repolens-preferences', defaultPreferences);

// Loading states
export const isAnalyzing = writable(false);
export const isLoadingChat = writable(false);
export const isLoadingFiles = writable(false);

// Error handling
export const errors = writable<string[]>([]);

// Derived stores
export const isRepositoryLoaded = derived(
  currentRepository,
  ($repository) => $repository !== null
);

export const analysisProgress = derived(
  currentSession,
  ($session) => $session?.progress || 0
);

export const currentStep = derived(
  currentSession,
  ($session) => $session?.currentStep || ''
);

export const repositoryLanguages = derived(
  repositoryMetrics,
  ($metrics) => {
    if (!$metrics) return [];
    
    const total = Object.values($metrics.languages).reduce((sum, count) => sum + count, 0);
    return Object.entries($metrics.languages)
      .map(([language, bytes]) => ({
        language,
        bytes,
        percentage: (bytes / total) * 100
      }))
      .sort((a, b) => b.bytes - a.bytes);
  }
);

export const fileTypeDistribution = derived(
  repositoryMetrics,
  ($metrics) => {
    if (!$metrics) return [];
    
    const total = Object.values($metrics.fileTypes).reduce((sum, count) => sum + count, 0);
    return Object.entries($metrics.fileTypes)
      .map(([extension, count]) => ({
        extension,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }
);

export const highPriorityInsights = derived(
  architectureInsights,
  ($insights) => $insights.filter(insight => insight.importance === 'high')
);

export const recentChatMessages = derived(
  chatMessages,
  ($messages) => $messages.slice(-50) // Keep only recent 50 messages for performance
);

// Actions/functions to interact with stores

export const sessionActions = {
  create: (repositoryUrl: string) => {
    const session: AnalysisSession = {
      id: `session-${Date.now()}`,
      repositoryUrl,
      repository: null,
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing...',
      startedAt: new Date().toISOString()
    };
    currentSession.set(session);
    return session;
  },

  updateProgress: (progress: number, step: string) => {
    currentSession.update(session => {
      if (session) {
        return { ...session, progress, currentStep: step };
      }
      return session;
    });
  },

  complete: (repository: Repository) => {
    currentSession.update(session => {
      if (session) {
        return {
          ...session,
          repository,
          status: 'completed',
          progress: 100,
          currentStep: 'Analysis complete',
          completedAt: new Date().toISOString()
        };
      }
      return session;
    });
    currentRepository.set(repository);
  },

  error: (error: string) => {
    currentSession.update(session => {
      if (session) {
        return { ...session, status: 'error', error };
      }
      return session;
    });
  },

  reset: () => {
    currentSession.set(null);
    currentRepository.set(null);
    fileTree.set([]);
    repositoryMetrics.set(null);
    architectureInsights.set([]);
    documentationFiles.set([]);
    chatMessages.set([]);
    selectedFiles.set([]);
    architectureGraph.set(null);
  }
};

export const chatActions = {
  addMessage: (content: string, role: 'user' | 'assistant', sessionId: string) => {
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      content,
      role,
      timestamp: new Date().toISOString()
    };
    
    chatMessages.update(messages => [...messages, message]);
    return message;
  },

  clearMessages: () => {
    chatMessages.set([]);
  },

  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => {
    chatMessages.update(messages =>
      messages.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }
};

export const uiActions = {
  toggleSidebar: () => {
    uiState.update(state => ({ ...state, sidebarOpen: !state.sidebarOpen }));
  },

  setView: (view: UIState['currentView']) => {
    uiState.update(state => ({ ...state, currentView: view }));
  },

  toggleFileSelection: (filePath: string) => {
    selectedFiles.update(files => {
      const index = files.indexOf(filePath);
      if (index >= 0) {
        return files.filter((_, i) => i !== index);
      } else {
        return [...files, filePath];
      }
    });
  },

  toggleDirectoryExpansion: (dirPath: string) => {
    uiState.update(state => {
      const expanded = state.expandedDirectories;
      const index = expanded.indexOf(dirPath);
      
      if (index >= 0) {
        return {
          ...state,
          expandedDirectories: expanded.filter((_, i) => i !== index)
        };
      } else {
        return {
          ...state,
          expandedDirectories: [...expanded, dirPath]
        };
      }
    });
  }
};

export const errorActions = {
  add: (error: string) => {
    errors.update(errs => [...errs, error]);
  },

  remove: (index: number) => {
    errors.update(errs => errs.filter((_, i) => i !== index));
  },

  clear: () => {
    errors.set([]);
  }
};

// Utility function to get current store values synchronously
export function getStoreValue<T>(store: { subscribe: (fn: (value: T) => void) => () => void }): T {
  let value: T;
  const unsubscribe = store.subscribe(v => value = v);
  unsubscribe();
  return value!;
}