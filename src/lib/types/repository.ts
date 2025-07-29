import type { Timestamp } from 'firebase/firestore';

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

export interface RepoVersion {
  pushedAt: string; // ISO date string - primary version indicator
  updatedAt: string; // ISO date string
  defaultBranch: string;
  lastCommitSha?: string;
  fileTreeSha: string;
}

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

// Firestore document interfaces
export type AnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed';

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
  analysisData?: any; // AnalysisResult - avoiding circular import
  errorMessage?: string;
}

export interface StoredRepository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  createdAt: Date;
  updatedAt: Date;
  lastAnalyzed: Date;
  analysisVersion: string;
  data: any; // Will be typed as AnalysisResult when imported
  status: 'analyzing' | 'completed' | 'failed';
  error?: string;
}

export interface StoredRepositoryFirestore {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastAnalyzed: Timestamp;
  analysisVersion: string;
  data: any; // Will be typed as AnalysisResult when imported
  status: 'analyzing' | 'completed' | 'failed';
  error?: string;
}

// GitHub API error types are now in $types/error

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