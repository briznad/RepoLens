import type {
  RepoData,
  FileTree,
  GitHubFile,
  GitHubFileContent,
  AnalysisResult,
  RepoVersion,
  GitHubRateLimit,
  GitHubApiResponse
} from './types';

import {
  GitHubApiError,
  GitHubRateLimitError,
  GitHubRepoNotFoundError,
  GitHubInvalidUrlError
} from './types';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * GitHub API client with rate limiting and error handling
 */
class GitHubAPI {
  private token?: string;
  private rateLimitInfo: GitHubRateLimit | null = null;

  constructor(token?: string) {
    this.token = token;
  }

  /**
   * Make authenticated request to GitHub API
   */
  async request<T>(endpoint: string): Promise<GitHubApiResponse<T>> {
    // Check rate limit before making request
    if (this.rateLimitInfo && this.rateLimitInfo.remaining <= 0) {
      const resetTime = this.rateLimitInfo.reset * 1000;
      if (Date.now() < resetTime) {
        throw new GitHubRateLimitError(
          `Rate limit exceeded. Reset at ${new Date(resetTime).toISOString()}`,
          this.rateLimitInfo.reset,
          this.rateLimitInfo.remaining
        );
      }
    }

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'RepoLens/1.0',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
      headers
    });

    // Update rate limit info from headers
    this.updateRateLimitInfo(response.headers);

    if (!response.ok) {
      let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;
      let errorResponse: any;

      try {
        errorResponse = await response.json();
        errorMessage = errorResponse.message || errorMessage;
      } catch {
        // Use default error message if response is not JSON
      }

      if (response.status === 403 && errorResponse?.message?.includes('rate limit')) {
        throw new GitHubRateLimitError(
          errorMessage,
          parseInt(response.headers.get('x-ratelimit-reset') || '0'),
          parseInt(response.headers.get('x-ratelimit-remaining') || '0')
        );
      }

      if (response.status === 404) {
        // Check if it might be a private repo or doesn't exist
        const repoPath = url.match(/\/repos\/([^\/]+)\/([^\/]+)(?:\/|$)/);
        if (repoPath) {
          throw new GitHubRepoNotFoundError(
            `Repository not found or is private. Only public repositories are supported. Please check the repository exists and is publicly accessible.`
          );
        }
        throw new GitHubApiError(errorMessage, response.status, errorResponse);
      }

      if (response.status === 403) {
        throw new GitHubApiError(
          `Access denied. This repository may be private or you may have exceeded API limits. Only public repositories are supported.`,
          response.status,
          errorResponse
        );
      }

      throw new GitHubApiError(errorMessage, response.status, errorResponse);
    }

    const data = await response.json();

    return {
      data,
      status: response.status,
      headers: {
        'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || undefined,
        'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || undefined,
        'x-ratelimit-reset': response.headers.get('x-ratelimit-reset') || undefined,
        'x-ratelimit-used': response.headers.get('x-ratelimit-used') || undefined,
        'x-ratelimit-resource': response.headers.get('x-ratelimit-resource') || undefined,
      }
    };
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    const used = headers.get('x-ratelimit-used');
    const resource = headers.get('x-ratelimit-resource');

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: parseInt(reset),
        used: parseInt(used || '0'),
        resource: resource || 'core'
      };
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitInfo(): GitHubRateLimit | null {
    return this.rateLimitInfo;
  }

  /**
   * Fetch complete repository data including metadata and file tree
   */
  async fetchRepo(owner: string, repo: string): Promise<AnalysisResult> {
    try {
      // Fetch repository metadata
      const repoResponse = await this.request<RepoData>(`/repos/${owner}/${repo}`);
      const repoData = repoResponse.data;

      // Fetch complete file tree (recursive)
      const treeResponse = await this.request<FileTree>(
        `/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`
      );
      const fileTree = treeResponse.data;

      // Fetch languages
      const languagesResponse = await this.request<Record<string, number>>(
        `/repos/${owner}/${repo}/languages`
      );
      const languages = languagesResponse.data;

      // Create version info
      const version: RepoVersion = {
        pushedAt: repoData.pushed_at,
        updatedAt: repoData.updated_at,
        defaultBranch: repoData.default_branch,
        fileTreeSha: fileTree.sha
      };

      // Categorize files
      const { mainFiles, configFiles, documentationFiles, testFiles } = this.categorizeFiles(fileTree.tree);

      return {
        repoData,
        fileTree,
        version,
        analyzedAt: new Date().toISOString(),
        fileCount: fileTree.tree.filter(item => item.type === 'blob').length,
        languages,
        mainFiles,
        configFiles,
        documentationFiles,
        testFiles
      };
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404) {
        throw new GitHubRepoNotFoundError(owner, repo);
      }
      throw error;
    }
  }

  /**
   * Fetch specific file content
   */
  async fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
    try {
      const response = await this.request<GitHubFileContent>(`/repos/${owner}/${repo}/contents/${path}`);
      const fileContent = response.data;

      if (fileContent.type !== 'file') {
        throw new GitHubApiError(`Path ${path} is not a file`, 400);
      }

      if (fileContent.content && fileContent.encoding === 'base64') {
        return atob(fileContent.content.replace(/\n/g, ''));
      }

      if (fileContent.download_url) {
        // Fallback: fetch from download URL for large files
        const downloadResponse = await fetch(fileContent.download_url);
        if (!downloadResponse.ok) {
          throw new GitHubApiError(`Failed to download file content for ${path}`, downloadResponse.status);
        }
        return await downloadResponse.text();
      }

      throw new GitHubApiError(`Unable to decode file content for ${path}`, 400);
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404) {
        throw new GitHubApiError(`File not found: ${path}`, 404);
      }
      throw error;
    }
  }

  /**
   * Categorize files by their purpose
   */
  private categorizeFiles(files: GitHubFile[]): {
    mainFiles: GitHubFile[];
    configFiles: GitHubFile[];
    documentationFiles: GitHubFile[];
    testFiles: GitHubFile[];
  } {
    const mainFiles: GitHubFile[] = [];
    const configFiles: GitHubFile[] = [];
    const documentationFiles: GitHubFile[] = [];
    const testFiles: GitHubFile[] = [];

    // File patterns
    const mainFilePatterns = /^(index|main|app|server|client)\.(js|ts|jsx|tsx|py|java|go|rs|php|rb|cpp|c|cs|swift|kt|scala|clj|hs|ml|elm|dart)$/i;
    const configFilePatterns = /\.(json|yaml|yml|toml|ini|cfg|conf|config)$|^(Dockerfile|Makefile|CMakeLists\.txt|build\.gradle|pom\.xml|requirements\.txt|package\.json|composer\.json|Cargo\.toml|go\.mod|setup\.py|pyproject\.toml)$/i;
    const docFilePatterns = /\.(md|txt|rst|adoc|org)$|^(README|CHANGELOG|CONTRIBUTING|LICENSE|DOCS|GUIDE|MANUAL)/i;
    const testFilePatterns = /\.(test|spec)\.|\/test\/|\/tests\/|\/__tests__\/|\.test\.|\.spec\.|_test\.|_spec\./i;

    for (const file of files) {
      if (file.type !== 'blob') continue;

      const fileName = file.path.split('/').pop() || '';
      const filePath = file.path;

      if (testFilePatterns.test(filePath)) {
        testFiles.push(file);
      } else if (mainFilePatterns.test(fileName)) {
        mainFiles.push(file);
      } else if (configFilePatterns.test(fileName)) {
        configFiles.push(file);
      } else if (docFilePatterns.test(fileName)) {
        documentationFiles.push(file);
      }
    }

    return { mainFiles, configFiles, documentationFiles, testFiles };
  }
}

// Helper functions

/**
 * Parse GitHub repository URL to extract owner and repo name
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  // Clean the URL
  const cleanUrl = url.trim();

  // Patterns to match GitHub URL formats (default branch only)
  const patterns = [
    // https://github.com/owner/repo (exact match - no additional paths)
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/,
    // github.com/owner/repo (no protocol)
    /^github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/)?$/,
    // git@github.com:owner/repo.git (SSH format)
    /^git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/
  ];

  // Check for branch-specific URLs and reject them
  if (cleanUrl.includes('/tree/') || cleanUrl.includes('/blob/') || 
      cleanUrl.includes('/commit/') || cleanUrl.includes('/pull/') || 
      cleanUrl.includes('/issues/') || cleanUrl.includes('/releases/') ||
      cleanUrl.includes('/wiki/') || cleanUrl.includes('/actions/')) {
    throw new GitHubInvalidUrlError(
      `Branch-specific and other GitHub URLs are not supported. Please use the main repository URL (e.g., https://github.com/owner/repo)`
    );
  }

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, ''); // Remove .git suffix if present
      
      // Validate owner and repo names
      if (owner && repo && !owner.includes('.') && !repo.includes('.') && 
          owner.length > 0 && repo.length > 0) {
        return { owner, repo };
      }
    }
  }

  throw new GitHubInvalidUrlError(
    `Invalid GitHub repository URL. Please use format: https://github.com/owner/repo`
  );
}

/**
 * Validate if repository exists and is accessible
 */
export async function validateRepo(owner: string, repo: string, token?: string): Promise<boolean> {
  try {
    const api = new GitHubAPI(token);
    await api.request<RepoData>(`/repos/${owner}/${repo}`);
    return true;
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Extract version information from repository data
 */
export function getRepoVersion(repoData: RepoData, fileTreeSha?: string): RepoVersion {
  return {
    pushedAt: repoData.pushed_at,
    updatedAt: repoData.updated_at,
    defaultBranch: repoData.default_branch,
    fileTreeSha: fileTreeSha || ''
  };
}

/**
 * Compare repository versions to determine if GitHub repo is newer
 */
export function compareRepoVersions(github: RepoVersion, firestore: RepoVersion): boolean {
  // Primary comparison: pushed_at timestamp
  const githubPushed = new Date(github.pushedAt).getTime();
  const firestorePushed = new Date(firestore.pushedAt).getTime();
  
  if (githubPushed !== firestorePushed) {
    return githubPushed > firestorePushed;
  }

  // Secondary comparison: file tree SHA
  if (github.fileTreeSha && firestore.fileTreeSha) {
    return github.fileTreeSha !== firestore.fileTreeSha;
  }

  // Fallback: updated_at timestamp
  const githubUpdated = new Date(github.updatedAt).getTime();
  const firestoreUpdated = new Date(firestore.updatedAt).getTime();
  
  return githubUpdated > firestoreUpdated;
}

/**
 * Check if GitHub URL is valid
 */
export function isValidGitHubUrl(url: string): boolean {
  try {
    parseGitHubUrl(url);
    return true;
  } catch {
    return false;
  }
}

// Default API instance
export const githubApi = new GitHubAPI();

// Main functions for external use
export async function fetchRepo(owner: string, repo: string, token?: string): Promise<AnalysisResult> {
  const api = token ? new GitHubAPI(token) : githubApi;
  return api.fetchRepo(owner, repo);
}

export async function fetchFileContent(owner: string, repo: string, path: string, token?: string): Promise<string> {
  const api = token ? new GitHubAPI(token) : githubApi;
  return api.fetchFileContent(owner, repo, path);
}