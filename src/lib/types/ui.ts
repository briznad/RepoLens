// Graph/Visualization types
export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'directory' | 'module' | 'component' | 'function' | 'class';
  path?: string;
  language?: string;
  size?: number;
  complexity?: number;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'import' | 'dependency' | 'inheritance' | 'composition' | 'reference';
  weight?: number;
  metadata?: Record<string, any>;
}

export interface ArchitectureGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    repositoryId: string;
    generatedAt: string;
    type: 'dependency' | 'architecture' | 'module' | 'component';
  };
}

// UI State types
export interface UIState {
  sidebarOpen: boolean;
  currentView: 'chat' | 'graph' | 'docs';
  selectedFiles: string[];
  expandedDirectories: string[];
  graphSettings: {
    layout: 'force' | 'hierarchy' | 'circular';
    nodeSize: 'file-size' | 'complexity' | 'uniform';
    showLabels: boolean;
    filterBy: string[];
  };
}

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  codeEditor: {
    fontSize: number;
    fontFamily: string;
    lineNumbers: boolean;
    wordWrap: boolean;
    theme: string;
  };
  analysis: {
    includeTests: boolean;
    includeConfig: boolean;
    maxFileSize: number;
    languages: string[];
  };
  notifications: {
    analysisComplete: boolean;
    newInsights: boolean;
    errors: boolean;
  };
  documentation: {
    autoExpandSubsystems: boolean;
    showFilePreview: boolean;
    enableAIDescriptions: boolean;
    recentViewLimit: number;
  };
  navigation: {
    rememberLastPage: boolean;
    showBreadcrumbs: boolean;
    sidebarCollapsed: boolean;
  };
}