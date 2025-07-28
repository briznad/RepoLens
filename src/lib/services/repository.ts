import { firestore } from './firestore';
import { parseGitHubUrl } from '../github';
import { where, orderBy, limit, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import type {
  RepoDocument,
  FirestoreRepo,
  AnalysisStatus,
  RepoData,
  AnalysisResult
} from '../types';

// Collection name constant
const REPOSITORIES_COLLECTION = 'repositories';

// Repository-specific interfaces for Firestore operations
interface StoredRepositoryFirestore {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  lastAnalyzed: any; // Firestore Timestamp
  analysisVersion: string;
  data: AnalysisResult;
  status: 'analyzing' | 'completed' | 'failed';
  error?: string;
}

interface StoredRepository {
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
  data: AnalysisResult;
  status: 'analyzing' | 'completed' | 'failed';
  error?: string;
}

/**
 * Convert Firestore document to StoredRepository format
 */
function convertFirestoreToStoredRepo(doc: any): StoredRepository {
  return {
    id: doc.id,
    ...doc,
    createdAt: doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt),
    updatedAt: doc.updatedAt?.toDate ? doc.updatedAt.toDate() : new Date(doc.updatedAt),
    lastAnalyzed: doc.lastAnalyzed?.toDate ? doc.lastAnalyzed.toDate() : new Date(doc.lastAnalyzed)
  } as StoredRepository;
}

/**
 * Convert StoredRepository to FirestoreRepo format
 */
function convertToFirestoreRepo(repo: StoredRepository): FirestoreRepo {
  return {
    id: repo.id,
    url: repo.url,
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
    description: repo.description,
    language: repo.language,
    stars: repo.stars,
    forks: repo.forks,
    visibility: 'public', // Default since StoredRepository doesn't have this
    defaultBranch: 'main', // Default since StoredRepository doesn't have this
    githubPushedAt: repo.updatedAt.toISOString(),
    lastAnalyzed: repo.lastAnalyzed.toISOString(),
    analysisStatus: repo.status as AnalysisStatus,
    analysisData: repo.data,
    createdAt: repo.createdAt.toISOString(),
    updatedAt: repo.updatedAt.toISOString(),
    errorMessage: repo.error
  };
}

/**
 * Check if a repository exists by URL
 */
export async function checkRepositoryByUrl(url: string): Promise<FirestoreRepo | null> {
  try {
    const repo = await firestore.findOne<StoredRepositoryFirestore>(
      REPOSITORIES_COLLECTION,
      'url',
      url
    );

    if (!repo) {
      return null;
    }

    const storedRepo = convertFirestoreToStoredRepo(repo);
    return convertToFirestoreRepo(storedRepo);
  } catch (error) {
    console.error('Error checking repository by URL:', error);
    return null;
  }
}

/**
 * Store a new repository analysis
 */
export async function storeRepository(
  owner: string,
  name: string,
  repoData: RepoData,
  analysisResult: AnalysisResult,
  status: 'analyzing' | 'completed' | 'failed' = 'completed',
  error?: string
): Promise<string> {
  try {
    const storedRepo: Omit<StoredRepositoryFirestore, 'createdAt' | 'updatedAt'> = {
      owner,
      name,
      fullName: repoData.full_name,
      url: repoData.html_url,
      description: repoData.description,
      language: repoData.language,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      lastAnalyzed: FirestoreTimestamp.now(),
      analysisVersion: '1.0.0',
      data: analysisResult,
      status,
      error
    };

    return await firestore.create(REPOSITORIES_COLLECTION, storedRepo);
  } catch (error) {
    console.error('Error storing repository:', error);
    throw error;
  }
}

/**
 * Update repository status
 */
export async function updateRepositoryStatus(
  repoId: string,
  status: 'analyzing' | 'completed' | 'failed',
  error?: string
): Promise<void> {
  try {
    const updates: any = {
      status,
      lastAnalyzed: FirestoreTimestamp.now()
    };

    if (error) {
      updates.error = error;
    }

    await firestore.update(REPOSITORIES_COLLECTION, repoId, updates);
  } catch (updateError) {
    console.error(`Error updating repository status for ${repoId}:`, updateError);
    throw updateError;
  }
}

/**
 * Get recent repositories
 */
export async function getRecentRepositories(limitCount: number = 10): Promise<FirestoreRepo[]> {
  try {
    const repos = await firestore.query<StoredRepositoryFirestore>(
      REPOSITORIES_COLLECTION,
      [
        where('status', '==', 'completed'),
        orderBy('lastAnalyzed', 'desc'),
        limit(limitCount)
      ]
    );

    return repos.map(repo => {
      const storedRepo = convertFirestoreToStoredRepo(repo);
      return convertToFirestoreRepo(storedRepo);
    });
  } catch (error) {
    console.error('Error getting recent repositories:', error);
    return [];
  }
}

/**
 * Get repository by document ID
 */
export async function getRepoById(docId: string): Promise<FirestoreRepo | null> {
  try {
    const repo = await firestore.getById<StoredRepositoryFirestore>(
      REPOSITORIES_COLLECTION,
      docId
    );

    if (!repo) {
      return null;
    }

    const storedRepo = convertFirestoreToStoredRepo(repo);
    return convertToFirestoreRepo(storedRepo);
  } catch (error) {
    console.error('Error getting repository by ID:', error);
    throw new Error(`Failed to get repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find existing repository or create new one
 * Returns the Firestore document ID
 */
export async function findOrCreateRepo(url: string): Promise<string> {
  try {
    const { owner, repo } = parseGitHubUrl(url);

    // Check if repo already exists
    const existingRepo = await checkRepositoryByUrl(url);

    if (existingRepo) {
      return existingRepo.id;
    }

    // Create new repo document with minimal data
    const githubData: RepoData = {
      id: 0,
      name: repo,
      full_name: `${owner}/${repo}`,
      description: null,
      html_url: url,
      clone_url: '',
      ssh_url: '',
      git_url: '',
      owner: {
        login: owner,
        id: 0,
        avatar_url: '',
        html_url: '',
        type: 'User'
      },
      private: false,
      fork: false,
      language: null,
      languages_url: '',
      forks_count: 0,
      stargazers_count: 0,
      watchers_count: 0,
      size: 0,
      default_branch: 'main',
      open_issues_count: 0,
      topics: [],
      has_issues: true,
      has_projects: true,
      has_wiki: true,
      has_pages: false,
      has_downloads: true,
      archived: false,
      disabled: false,
      visibility: 'public',
      pushed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const analysisResult: AnalysisResult = {
      metadata: githubData,
      fileTree: [],
      version: {
        pushedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        defaultBranch: 'main',
        fileTreeSha: ''
      },
      analyzedAt: new Date().toISOString(),
      fileCount: 0,
      languages: {},
      framework: 'unknown',
      subsystems: [],
      mainFiles: [],
      configFiles: [],
      documentationFiles: [],
      testFiles: []
    };

    const repoId = await storeRepository(
      owner,
      repo,
      githubData,
      analysisResult,
      'analyzing'
    );

    return repoId;

  } catch (error) {
    console.error('Error in findOrCreateRepo:', error);
    throw new Error(`Failed to find or create repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if repository needs fresh analysis by comparing GitHub vs Firestore versions
 */
export async function checkRepoFreshness(url: string, githubRepoData: RepoData): Promise<boolean> {
  try {
    const existingRepo = await checkRepositoryByUrl(url);

    if (!existingRepo) {
      return false; // Repo doesn't exist, needs fresh analysis
    }

    // If analysis is not completed, needs fresh analysis
    if (existingRepo.analysisStatus !== 'completed') {
      return false;
    }

    // Check if repository is stale (older than 24 hours)
    return !isRepositoryStale(existingRepo);

  } catch (error) {
    console.error('Error checking repository freshness:', error);
    return false; // Default to requiring fresh analysis on error
  }
}

/**
 * Update repository with fresh GitHub data and analysis results
 */
export async function updateRepoWithAnalysis(
  repoId: string,
  githubData: RepoData,
  analysisData: AnalysisResult
): Promise<void> {
  try {
    // Extract owner and repo from GitHub data
    const { owner, repo } = parseGitHubUrl(githubData.html_url);

    // Store the updated repository data
    await storeRepository(
      owner,
      repo,
      githubData,
      analysisData,
      'completed'
    );

  } catch (error) {
    console.error('Error updating repository with analysis:', error);
    throw new Error(`Failed to update repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update analysis status of a repository
 */
export async function updateAnalysisStatus(
  repoId: string,
  status: AnalysisStatus,
  errorMessage?: string
): Promise<void> {
  try {
    // Map AnalysisStatus to firestore service status
    const firestoreStatus = status === 'completed' ? 'completed' :
                           status === 'failed' ? 'failed' : 'analyzing';

    await updateRepositoryStatus(repoId, firestoreStatus, errorMessage);

  } catch (error) {
    console.error('Error updating analysis status:', error);
    throw new Error(`Failed to update analysis status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if repository analysis is stale (older than 24 hours)
 */
export function isRepositoryStale(repo: FirestoreRepo): boolean {
  if (!repo.lastAnalyzed || repo.analysisStatus !== 'completed') {
    return true;
  }

  const lastAnalyzed = new Date(repo.lastAnalyzed).getTime();
  const now = new Date().getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  return (now - lastAnalyzed) > twentyFourHours;
}