import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubAPI, fetchRepo, fetchFileContent, validateRepo } from './github-api';
import type { RepoData, FileTree, GitHubFileContent } from '$types/repository';

// Mock the error classes - they need to be available for instanceof checks
vi.mock('$types/error', () => {
  class GitHubApiError extends Error {
    constructor(message: string, public status: number, public response?: any) {
      super(message);
      this.name = 'GitHubApiError';
    }
  }

  class GitHubRateLimitError extends GitHubApiError {
    constructor(message: string, public resetTime: number, public remainingRequests: number) {
      super(message, 403);
      this.name = 'GitHubRateLimitError';
    }
  }

  class GitHubRepoNotFoundError extends GitHubApiError {
    constructor(public owner: string, public repo: string) {
      super(`Repository ${owner}/${repo} not found or is private`, 404);
      this.name = 'GitHubRepoNotFoundError';
    }
  }

  return {
    GitHubApiError,
    GitHubRateLimitError,
    GitHubRepoNotFoundError
  };
});

import {
  GitHubApiError,
  GitHubRateLimitError,
  GitHubRepoNotFoundError
} from '$types/error';

// Mock fetch globally
global.fetch = vi.fn();
global.atob = vi.fn();

// Mock the AI analyzer
vi.mock('./ai-analyzer', () => ({
  analyzeRepoWithAI: vi.fn().mockResolvedValue({
    metadata: {},
    fileTree: {},
    version: { fileTreeSha: 'mocked' },
    analyzedAt: '2024-01-01T00:00:00Z',
    fileCount: 0,
    languages: {},
    framework: 'unknown',
    subsystems: [],
    mainFiles: [],
    configFiles: [],
    documentationFiles: [],
    testFiles: []
  })
}));

describe('github-api', () => {
  let githubApi: GitHubAPI;
  let mockRepoData: RepoData;
  let mockFileTree: FileTree;

  beforeEach(() => {
    vi.clearAllMocks();
    githubApi = new GitHubAPI('test-token');

    mockRepoData = {
      id: 123456,
      name: 'test-repo',
      full_name: 'testuser/test-repo',
      owner: {
        id: 1,
        login: 'testuser',
        avatar_url: 'https://github.com/avatar.jpg',
        html_url: 'https://github.com/testuser'
      },
      private: false,
      html_url: 'https://github.com/testuser/test-repo',
      description: 'A test repository',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      pushed_at: '2024-01-02T00:00:00Z',
      stargazers_count: 10,
      forks_count: 5,
      language: 'TypeScript',
      default_branch: 'main',
      topics: ['test', 'repo'],
      license: {
        key: 'mit',
        name: 'MIT License',
        url: 'https://opensource.org/licenses/MIT'
      }
    };

    mockFileTree = {
      sha: 'abc123',
      url: 'https://api.github.com/repos/testuser/test-repo/git/trees/abc123',
      tree: [
        { path: 'src/index.ts', type: 'blob', size: 100, url: 'test', html_url: 'test' },
        { path: 'package.json', type: 'blob', size: 200, url: 'test', html_url: 'test' },
        { path: 'README.md', type: 'blob', size: 150, url: 'test', html_url: 'test' }
      ],
      truncated: false
    };
  });

  describe('GitHubAPI class', () => {
    describe('constructor', () => {
      it('should initialize with token', () => {
        const api = new GitHubAPI('my-token');
        expect(api).toBeInstanceOf(GitHubAPI);
      });

      it('should initialize without token', () => {
        const api = new GitHubAPI();
        expect(api).toBeInstanceOf(GitHubAPI);
      });
    });

    describe('request method', () => {
      it('should make successful authenticated request', async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          headers: new Map([
            ['x-ratelimit-limit', '5000'],
            ['x-ratelimit-remaining', '4999'],
            ['x-ratelimit-reset', '1640995200'],
            ['x-ratelimit-used', '1'],
            ['x-ratelimit-resource', 'core']
          ]),
          json: vi.fn().mockResolvedValue(mockRepoData)
        };

        // Create a proper Headers object
        const headers = new Headers({
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640995200',
          'x-ratelimit-used': '1',
          'x-ratelimit-resource': 'core'
        });

        vi.mocked(fetch).mockResolvedValue({
          ...mockResponse,
          headers
        } as any);

        const result = await githubApi.request<RepoData>('/repos/testuser/test-repo');

        expect(fetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/testuser/test-repo',
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'RepoLens/1.0',
              'X-GitHub-Api-Version': '2022-11-28',
              'Authorization': 'Bearer test-token'
            }
          }
        );

        expect(result.data).toEqual(mockRepoData);
        expect(result.status).toBe(200);
        
        // Verify rate limit info is updated
        const rateLimitInfo = githubApi.getRateLimitInfo();
        expect(rateLimitInfo?.limit).toBe(5000);
        expect(rateLimitInfo?.remaining).toBe(4999);
      });

      it('should make unauthenticated request when no token provided', async () => {
        const unauthenticatedApi = new GitHubAPI();
        
        const mockResponse = {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue(mockRepoData)
        };

        vi.mocked(fetch).mockResolvedValue(mockResponse as any);

        await unauthenticatedApi.request<RepoData>('/repos/testuser/test-repo');

        expect(fetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/testuser/test-repo',
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'RepoLens/1.0',
              'X-GitHub-Api-Version': '2022-11-28'
              // No Authorization header
            }
          }
        );
      });

      it('should handle 404 repository not found error', async () => {
        const mockResponse = {
          ok: false,
          status: 404,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue({
            message: 'Not Found'
          })
        };

        vi.mocked(fetch).mockResolvedValue(mockResponse as any);

        await expect(
          githubApi.request('/repos/testuser/nonexistent-repo')
        ).rejects.toThrow(GitHubRepoNotFoundError);
      });

      it('should handle rate limit exceeded error', async () => {
        const mockResponse = {
          ok: false,
          status: 403,
          headers: new Headers({
            'x-ratelimit-reset': '1640995200',
            'x-ratelimit-remaining': '0'
          }),
          json: vi.fn().mockResolvedValue({
            message: 'API rate limit exceeded'
          })
        };

        vi.mocked(fetch).mockResolvedValue(mockResponse as any);

        await expect(
          githubApi.request('/repos/testuser/test-repo')
        ).rejects.toThrow(GitHubRateLimitError);
      });

      it('should handle 403 access denied error', async () => {
        const mockResponse = {
          ok: false,
          status: 403,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue({
            message: 'Forbidden'
          })
        };

        vi.mocked(fetch).mockResolvedValue(mockResponse as any);

        await expect(
          githubApi.request('/repos/testuser/private-repo')
        ).rejects.toThrow(GitHubApiError);

        try {
          await githubApi.request('/repos/testuser/private-repo');
        } catch (error) {
          expect(error).toBeInstanceOf(GitHubApiError);
          expect((error as GitHubApiError).message).toContain('Access denied');
        }
      });

      it('should handle generic API errors', async () => {
        const mockResponse = {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers(),
          json: vi.fn().mockResolvedValue({
            message: 'Server error'
          })
        };

        vi.mocked(fetch).mockResolvedValue(mockResponse as any);

        await expect(
          githubApi.request('/repos/testuser/test-repo')
        ).rejects.toThrow(GitHubApiError);
      });

      it('should handle rate limit check before request', async () => {
        // First, set up rate limit state by making a request
        const headers = new Headers({
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600) // 1 hour from now
        });

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers,
          json: vi.fn().mockResolvedValue({})
        } as any);

        await githubApi.request('/test');

        // Now the next request should throw rate limit error
        await expect(
          githubApi.request('/test-2')
        ).rejects.toThrow(GitHubRateLimitError);
      });

      it('should handle non-JSON error responses', async () => {
        const mockResponse = {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers(),
          json: vi.fn().mockRejectedValue(new Error('Not JSON'))
        };

        vi.mocked(fetch).mockResolvedValue(mockResponse as any);

        await expect(
          githubApi.request('/repos/testuser/test-repo')
        ).rejects.toThrow(GitHubApiError);
      });
    });

    describe('fetchRepo method', () => {
      it('should fetch complete repository analysis', async () => {
        // Mock repo data request
        vi.mocked(fetch)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: vi.fn().mockResolvedValue(mockRepoData)
          } as any)
          // Mock file tree request
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: vi.fn().mockResolvedValue(mockFileTree)
          } as any);

        const result = await githubApi.fetchRepo('testuser', 'test-repo');

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenNthCalledWith(1,
          'https://api.github.com/repos/testuser/test-repo',
          expect.any(Object)
        );
        expect(fetch).toHaveBeenNthCalledWith(2,
          'https://api.github.com/repos/testuser/test-repo/git/trees/main?recursive=1',
          expect.any(Object)
        );

        expect(result.version.fileTreeSha).toBe('abc123');
      });

      it('should handle repo not found error', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: false,
          status: 404,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue({ message: 'Not Found' })
        } as any);

        await expect(
          githubApi.fetchRepo('testuser', 'nonexistent')
        ).rejects.toThrow(GitHubRepoNotFoundError);
      });
    });

    describe('fetchFileContent method', () => {
      it('should fetch file content successfully', async () => {
        const fileContent = 'console.log("Hello, World!");';
        const base64Content = btoa(fileContent);
        
        const mockFileData: GitHubFileContent = {
          name: 'index.ts',
          path: 'src/index.ts',
          sha: 'abc123',
          size: fileContent.length,
          url: 'https://api.github.com/repos/testuser/test-repo/contents/src/index.ts',
          html_url: 'https://github.com/testuser/test-repo/blob/main/src/index.ts',
          git_url: 'https://api.github.com/repos/testuser/test-repo/git/blobs/abc123',
          download_url: 'https://raw.githubusercontent.com/testuser/test-repo/main/src/index.ts',
          type: 'file',
          content: base64Content,
          encoding: 'base64'
        };

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue(mockFileData)
        } as any);

        vi.mocked(atob).mockReturnValue(fileContent);

        const result = await githubApi.fetchFileContent('testuser', 'test-repo', 'src/index.ts');

        expect(result).toBe(fileContent);
        expect(fetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/testuser/test-repo/contents/src/index.ts',
          expect.any(Object)
        );
      });

      it('should handle large files via download URL', async () => {
        const fileContent = 'Large file content';
        
        const mockFileData: GitHubFileContent = {
          name: 'large-file.txt',
          path: 'large-file.txt',
          sha: 'def456',
          size: 1000000, // Large file
          url: 'https://api.github.com/repos/testuser/test-repo/contents/large-file.txt',
          html_url: 'https://github.com/testuser/test-repo/blob/main/large-file.txt',
          git_url: 'https://api.github.com/repos/testuser/test-repo/git/blobs/def456',
          download_url: 'https://raw.githubusercontent.com/testuser/test-repo/main/large-file.txt',
          type: 'file',
          content: null, // No content for large files
          encoding: 'none'
        };

        vi.mocked(fetch)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: vi.fn().mockResolvedValue(mockFileData)
          } as any)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: vi.fn().mockResolvedValue(fileContent)
          } as any);

        const result = await githubApi.fetchFileContent('testuser', 'test-repo', 'large-file.txt');

        expect(result).toBe(fileContent);
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch).toHaveBeenNthCalledWith(2, mockFileData.download_url);
      });

      it('should handle directory instead of file error', async () => {
        const mockDirData = {
          type: 'dir',
          name: 'components',
          path: 'src/components'
        };

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue(mockDirData)
        } as any);

        await expect(
          githubApi.fetchFileContent('testuser', 'test-repo', 'src/components')
        ).rejects.toThrow(GitHubApiError);
      });

      it('should handle file not found error', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: false,
          status: 404,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue({ message: 'Not Found' })
        } as any);

        await expect(
          githubApi.fetchFileContent('testuser', 'test-repo', 'nonexistent.txt')
        ).rejects.toThrow(GitHubApiError);
      });

      it('should handle download URL failure', async () => {
        const mockFileData: GitHubFileContent = {
          name: 'file.txt',
          path: 'file.txt',
          sha: 'abc123',
          size: 100,
          url: 'https://api.github.com/repos/testuser/test-repo/contents/file.txt',
          html_url: 'https://github.com/testuser/test-repo/blob/main/file.txt',
          git_url: 'https://api.github.com/repos/testuser/test-repo/git/blobs/abc123',
          download_url: 'https://raw.githubusercontent.com/testuser/test-repo/main/file.txt',
          type: 'file',
          content: null,
          encoding: 'none'
        };

        vi.mocked(fetch)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: vi.fn().mockResolvedValue(mockFileData)
          } as any)
          .mockResolvedValueOnce({
            ok: false,
            status: 500
          } as any);

        await expect(
          githubApi.fetchFileContent('testuser', 'test-repo', 'file.txt')
        ).rejects.toThrow(GitHubApiError);
      });
    });

    describe('validateRepo method', () => {
      it('should return true for valid repository', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue(mockRepoData)
        } as any);

        const result = await githubApi.validateRepo('testuser', 'test-repo');

        expect(result).toBe(true);
      });

      it('should return false for non-existent repository', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: false,
          status: 404,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue({ message: 'Not Found' })
        } as any);

        const result = await githubApi.validateRepo('testuser', 'nonexistent');

        expect(result).toBe(false);
      });

      it('should throw other API errors', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: new Headers(),
          json: vi.fn().mockResolvedValue({ message: 'Server error' })
        } as any);

        await expect(
          githubApi.validateRepo('testuser', 'test-repo')
        ).rejects.toThrow(GitHubApiError);
      });
    });

    describe('getRateLimitInfo method', () => {
      it('should return null initially', () => {
        const api = new GitHubAPI();
        expect(api.getRateLimitInfo()).toBeNull();
      });

      it('should return rate limit info after request', async () => {
        const headers = new Headers({
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': '1640995200',
          'x-ratelimit-used': '1',
          'x-ratelimit-resource': 'core'
        });

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          status: 200,
          headers,
          json: vi.fn().mockResolvedValue({})
        } as any);

        await githubApi.request('/test');

        const rateLimitInfo = githubApi.getRateLimitInfo();
        expect(rateLimitInfo).toEqual({
          limit: 5000,
          remaining: 4999,
          reset: 1640995200,
          used: 1,
          resource: 'core'
        });
      });
    });
  });

  describe('Standalone functions', () => {
    describe('fetchRepo', () => {
      it('should use provided token', async () => {
        vi.mocked(fetch)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: vi.fn().mockResolvedValue(mockRepoData)
          } as any)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: vi.fn().mockResolvedValue(mockFileTree)
          } as any);

        await fetchRepo('testuser', 'test-repo', 'custom-token');

        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer custom-token'
            })
          })
        );
      });

      it('should use default API instance when no token provided', async () => {
        vi.mocked(fetch)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: vi.fn().mockResolvedValue(mockRepoData)
          } as any)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: vi.fn().mockResolvedValue(mockFileTree)
          } as any);

        await fetchRepo('testuser', 'test-repo');

        expect(fetch).toHaveBeenCalled();
      });
    });

    describe('fetchFileContent', () => {
      it('should use provided token', async () => {
        const fileContent = 'test content';
        const mockFileData: GitHubFileContent = {
          name: 'test.txt',
          path: 'test.txt',
          sha: 'abc123',
          size: fileContent.length,
          url: 'test',
          html_url: 'test',
          git_url: 'test',
          download_url: 'test',
          type: 'file',
          content: btoa(fileContent),
          encoding: 'base64'
        };

        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue(mockFileData)
        } as any);

        vi.mocked(atob).mockReturnValue(fileContent);

        await fetchFileContent('testuser', 'test-repo', 'test.txt', 'custom-token');

        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer custom-token'
            })
          })
        );
      });
    });

    describe('validateRepo', () => {
      it('should use provided token', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue(mockRepoData)
        } as any);

        await validateRepo('testuser', 'test-repo', 'custom-token');

        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer custom-token'
            })
          })
        );
      });
    });
  });
});