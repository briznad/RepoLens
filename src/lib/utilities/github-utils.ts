import type { RepoData, RepoVersion } from '$types/repository';
import { GitHubInvalidUrlError } from '$types/error';

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