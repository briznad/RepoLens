import type { GitHubFile, RepoData, RepoVersion, Repository } from '$types/repository';

// Framework detection types
export type Framework = 'react' | 'nextjs' | 'svelte' | 'flask' | 'fastapi' | 'python-cli' | 'python-lib' | 'multi-framework' | 'unknown';

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

// Enhanced subsystem types for OpenAI integration
export interface SubsystemDescription {
  name: string;
  description: string;
  keyFiles: string[];
  entryPoints: string[];
  purpose: string;
  technologies: string[];
  dependencies: string[];
}

export interface FileInterface {
  filePath: string;
  type: 'function' | 'class' | 'component' | 'constant' | 'type' | 'interface';
  name: string;
  signature?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    optional?: boolean;
  }>;
  returnType?: string;
  visibility: 'public' | 'private' | 'protected';
  lineNumber?: number;
}

export interface CitationLink {
  type: 'file' | 'line' | 'function' | 'class';
  url: string;
  displayText: string;
  filePath: string;
  lineNumber?: number;
  context?: string;
}

export interface OpenAIResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Analysis result interface
export interface AnalysisResult {
  metadata: RepoData;
  fileTree: Record<string, GitHubFile>; // Object with file path as key
  version: RepoVersion;
  analyzedAt: string;
  fileCount: number;
  languages: Record<string, number>;
  framework: Framework;
  subsystems: SubsystemReference[];
  mainFiles: string[]; // Array of file path keys
  configFiles: string[]; // Array of file path keys
  documentationFiles: string[]; // Array of file path keys
  testFiles: string[]; // Array of file path keys
  // Enhanced documentation fields
  subsystemDescriptions?: SubsystemDescription[];
  keyInterfaces?: FileInterface[];
  citations?: CitationLink[];
  architectureDescription?: string;
}

// Updated subsystem interface to reference files by key
export interface SubsystemReference {
  name: string;
  description: string;
  files: string[]; // Array of file path keys instead of full file objects
  pattern: string;
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

// Analysis metrics
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