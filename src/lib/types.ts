// Repository-related types
export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  owner: {
    login: string;
    avatarUrl: string;
  };
  language: string | null;
  stargazers: number;
  forks: number;
  createdAt: string;
  updatedAt: string;
  size: number;
  defaultBranch: string;
}

export interface AnalysisSession {
  id: string;
  repositoryUrl: string;
  repository: Repository | null;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// Chat-related types
export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  metadata?: {
    files?: string[];
    codeBlocks?: CodeBlock[];
    suggestions?: string[];
  };
}

export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
  startLine?: number;
  endLine?: number;
}

export interface ChatSession {
  id: string;
  repositoryId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// File system types
export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
  language?: string;
  children?: FileNode[];
  depth: number;
  isExpanded?: boolean;
}

export interface FileContent {
  path: string;
  content: string;
  language?: string;
  size: number;
  lastModified?: string;
}

// Analysis types
export interface RepositoryMetrics {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  fileTypes: Record<string, number>;
  languages: Record<string, number>;
  averageFileSize: number;
  largestFiles: Array<{ path: string; size: number }>;
  deepestPath: { path: string; depth: number };
  complexity?: ComplexityMetrics;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  codeSmells: string[];
}

export interface ArchitectureInsight {
  id: string;
  type: 'pattern' | 'structure' | 'dependency' | 'quality' | 'security';
  title: string;
  description: string;
  files: string[];
  importance: 'low' | 'medium' | 'high';
  category: string;
  recommendations?: string[];
}

// Documentation types
export interface DocumentationFile {
  path: string;
  title: string;
  type: 'markdown' | 'text' | 'generated' | 'api';
  content: string;
  wordCount: number;
  lastModified?: string;
  sections?: DocumentationSection[];
}

export interface DocumentationSection {
  title: string;
  level: number;
  content: string;
  anchor: string;
}

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

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    rateLimitRemaining?: number;
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context?: {
    repositoryId?: string;
    sessionId?: string;
    userId?: string;
    action?: string;
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
}

// Search types
export interface SearchQuery {
  term: string;
  type: 'file' | 'content' | 'symbol' | 'all';
  filters: {
    languages?: string[];
    fileTypes?: string[];
    directories?: string[];
    dateRange?: {
      from: string;
      to: string;
    };
  };
}

export interface SearchResult {
  type: 'file' | 'content' | 'symbol';
  path: string;
  filename: string;
  matches: SearchMatch[];
  score: number;
}

export interface SearchMatch {
  line: number;
  column: number;
  text: string;
  context: string;
}

// GitHub API types
export interface RepoData {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  git_url: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
    type: string;
  };
  private: boolean;
  fork: boolean;
  language: string | null;
  languages_url: string;
  forks_count: number;
  stargazers_count: number;
  watchers_count: number;
  size: number;
  default_branch: string;
  open_issues_count: number;
  topics: string[];
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_downloads: boolean;
  archived: boolean;
  disabled: boolean;
  visibility: 'public' | 'private';
  pushed_at: string; // ISO date string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  permissions?: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
  license?: {
    key: string;
    name: string;
    spdx_id: string;
    url: string;
    node_id: string;
  };
}

export interface FileTree {
  sha: string;
  url: string;
  tree: GitHubFile[];
  truncated: boolean;
}

export interface GitHubFile {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string;
  encoding?: 'base64' | 'utf-8';
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

// Framework detection types
export type Framework = 'react' | 'nextjs' | 'svelte' | 'flask' | 'fastapi' | 'unknown';

// Subsystem types
export interface Subsystem {
  name: string;
  description: string;
  files: GitHubFile[];
  pattern: string;
}

export interface SubsystemPattern {
  name: string;
  description: string;
  patterns: string[];
  extensions?: string[];
  priority: number;
}

// Updated AnalysisResult with framework and subsystems
export interface AnalysisResult {
  metadata: RepoData;
  fileTree: GitHubFile[];
  version: RepoVersion;
  analyzedAt: string;
  fileCount: number;
  languages: Record<string, number>;
  framework: Framework;
  subsystems: Subsystem[];
  mainFiles: GitHubFile[];
  configFiles: GitHubFile[];
  documentationFiles: GitHubFile[];
  testFiles: GitHubFile[];
}

export interface RepoVersion {
  pushedAt: string; // ISO date string - primary version indicator
  updatedAt: string; // ISO date string
  defaultBranch: string;
  lastCommitSha?: string;
  fileTreeSha: string;
}

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  used: number;
  resource: string;
}

export interface GitHubApiResponse<T> {
  data: T;
  status: number;
  headers: {
    'x-ratelimit-limit'?: string;
    'x-ratelimit-remaining'?: string;
    'x-ratelimit-reset'?: string;
    'x-ratelimit-used'?: string;
    'x-ratelimit-resource'?: string;
  };
}

// Custom Error Types
export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

export class GitHubRateLimitError extends GitHubApiError {
  constructor(
    message: string,
    public resetTime: number,
    public remaining: number = 0
  ) {
    super(message, 403);
    this.name = 'GitHubRateLimitError';
  }
}

export class GitHubRepoNotFoundError extends GitHubApiError {
  constructor(owner: string, repo: string) {
    super(`Repository ${owner}/${repo} not found or not accessible`, 404);
    this.name = 'GitHubRepoNotFoundError';
  }
}

export class GitHubInvalidUrlError extends Error {
  constructor(url: string) {
    super(`Invalid GitHub URL: ${url}`);
    this.name = 'GitHubInvalidUrlError';
  }
}

// Firestore document interfaces
export type AnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

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

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  repoDocId?: string;
  metadata?: {
    files?: string[];
    codeBlocks?: CodeBlock[];
    suggestions?: string[];
  };
}

export interface NavigationState {
  currentPage: 'home' | 'analyze' | 'repo' | 'chat';
  previousPage: string | null;
  repoDocId: string | null;
  breadcrumbs: Array<{
    label: string;
    path: string;
  }>;
  sidebarOpen: boolean;
  selectedFiles: string[];
  expandedDirectories: string[];
}

export interface RepoDocument {
  id: string;
  url: string;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  visibility: 'public' | 'private';
  defaultBranch: string;
  githubPushedAt: string; // ISO date string from GitHub
  lastAnalyzed: string; // ISO date string when analysis was completed
  analysisStatus: AnalysisStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreRepo extends RepoDocument {
  // Firestore metadata
  analysisData?: AnalysisResult;
  errorMessage?: string;
}

// Export all types for easier importing
export type {
  // Re-export commonly used types
  Repository as Repo,
  ChatMessage as Message,
  FileNode as TreeNode,
  ArchitectureInsight as Insight,
};