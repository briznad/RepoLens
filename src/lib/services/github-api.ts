import type {
  RepoData,
  FileTree,
  GitHubFileContent,
  AnalysisResult,
  GitHubRateLimit,
  GitHubApiResponse
} from '$types';

import {
  GitHubApiError,
  GitHubRateLimitError,
  GitHubRepoNotFoundError
} from '$types';

import { analyzeRepo } from '$utilities/repo-analyzer';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * GitHub API client with rate limiting and error handling
 */
export class GitHubAPI {
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
        const repoPath = endpoint.match(/\/repos\/([^\/]+)\/([^\/]+)(?:\/|$)/);
        if (repoPath) {
          const [, owner, repo] = repoPath;
          throw new GitHubRepoNotFoundError(owner || 'unknown', repo || 'unknown');
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

      // Use the analyzer to process the repository
      const analysisResult = analyzeRepo(repoData, fileTree.tree);

      // Update the file tree SHA in the version
      analysisResult.version.fileTreeSha = fileTree.sha;

      return analysisResult;
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
   * Validate if repository exists and is accessible
   */
  async validateRepo(owner: string, repo: string): Promise<boolean> {
    try {
      await this.request<RepoData>(`/repos/${owner}/${repo}`);
      return true;
    } catch (error) {
      if (error instanceof GitHubApiError && error.status === 404) {
        return false;
      }
      throw error;
    }
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

export async function validateRepo(owner: string, repo: string, token?: string): Promise<boolean> {
  const api = token ? new GitHubAPI(token) : githubApi;
  return api.validateRepo(owner, repo);
}