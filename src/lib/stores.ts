import { browser } from '$app/environment';
import { getRepoById } from '$lib/services/repository';
import type { 
  RepoStore, 
  AnalysisStatusStore, 
  ChatMessage, 
  NavigationState, 
  FirestoreRepo, 
  AnalysisResult,
  Subsystem
} from '$lib/types';

// Storage keys for localStorage
const STORAGE_KEYS = {
  RECENT_REPOS: 'repolens_recent_repos',
  NAVIGATION_PREFS: 'repolens_navigation_prefs',
  UI_STATE: 'repolens_ui_state'
} as const;

// Initialize default states
const createDefaultRepoStore = (): RepoStore => ({
  docId: null,
  url: null,
  owner: null,
  name: null,
  fullName: null,
  description: null,
  language: null,
  stars: 0,
  forks: 0,
  defaultBranch: null,
  analysisData: null,
  analysisStatus: 'pending',
  lastAnalyzed: null,
  isLoading: false,
  error: null
});

const createDefaultAnalysisStatus = (): AnalysisStatusStore => ({
  isAnalyzing: false,
  currentStep: '',
  progress: 0,
  totalSteps: 6,
  error: null,
  completedAt: null
});

const createDefaultNavigationState = (): NavigationState => ({
  currentPage: 'home',
  previousPage: null,
  repoDocId: null,
  breadcrumbs: [],
  sidebarOpen: false,
  selectedFiles: [],
  expandedDirectories: []
});

// Create reactive stores using Svelte 5 runes
export const currentRepo = $state<RepoStore>(createDefaultRepoStore());
export const analysisStatus = $state<AnalysisStatusStore>(createDefaultAnalysisStatus());
export const chatHistory = $state<ChatMessage[]>([]);
export const navigationState = $state<NavigationState>(createDefaultNavigationState());

// Derived states
export const isRepoLoaded = $derived(currentRepo.docId !== null);
export const isAnalysisComplete = $derived(currentRepo.analysisStatus === 'completed');
export const hasAnalysisData = $derived(currentRepo.analysisData !== null);
export const currentRepoFullName = $derived(currentRepo.fullName || 'Unknown Repository');

// Store functions with Firestore integration

/**
 * Set repository data from Firestore document
 */
export function setRepoFromFirestore(docId: string, repoData: FirestoreRepo): void {
  Object.assign(currentRepo, {
    docId,
    url: repoData.url,
    owner: repoData.owner,
    name: repoData.name,
    fullName: repoData.fullName,
    description: repoData.description,
    language: repoData.language,
    stars: repoData.stars,
    forks: repoData.forks,
    defaultBranch: repoData.defaultBranch,
    analysisData: repoData.analysisData || null,
    analysisStatus: repoData.analysisStatus,
    lastAnalyzed: repoData.lastAnalyzed,
    isLoading: false,
    error: repoData.errorMessage || null
  });

  // Update navigation state
  navigationState.repoDocId = docId;
  
  // Cache recent repository
  if (browser) {
    cacheRecentRepo(docId, repoData);
  }
}

/**
 * Update analysis results in current repository
 */
export function updateAnalysisResults(analysisData: AnalysisResult): void {
  if (currentRepo.docId) {
    currentRepo.analysisData = analysisData;
    currentRepo.analysisStatus = 'completed';
    currentRepo.lastAnalyzed = new Date().toISOString();
    currentRepo.error = null;
    
    // Update analysis status
    analysisStatus.isAnalyzing = false;
    analysisStatus.completedAt = new Date().toISOString();
    analysisStatus.progress = 100;
  }
}

/**
 * Sync repository data with Firestore
 */
export async function syncWithFirestore(docId: string): Promise<void> {
  try {
    currentRepo.isLoading = true;
    currentRepo.error = null;
    
    const firestoreRepo = await getRepoById(docId);
    
    if (firestoreRepo) {
      setRepoFromFirestore(docId, firestoreRepo);
    } else {
      throw new Error('Repository not found');
    }
  } catch (error) {
    currentRepo.error = error instanceof Error ? error.message : 'Failed to sync with database';
    currentRepo.isLoading = false;
  }
}

/**
 * Clear current repository data
 */
export function clearRepo(): void {
  Object.assign(currentRepo, createDefaultRepoStore());
  Object.assign(analysisStatus, createDefaultAnalysisStatus());
  chatHistory.length = 0; // Clear array while maintaining reactivity
  navigationState.repoDocId = null;
}

/**
 * Update analysis status during processing
 */
export function updateAnalysisStatus(
  isAnalyzing: boolean,
  currentStep: string = '',
  progress: number = 0,
  error: string | null = null
): void {
  analysisStatus.isAnalyzing = isAnalyzing;
  analysisStatus.currentStep = currentStep;
  analysisStatus.progress = Math.min(100, Math.max(0, progress));
  analysisStatus.error = error;
  
  if (!isAnalyzing && error) {
    currentRepo.error = error;
  }
}

/**
 * Add message to chat history
 */
export function addChatMessage(
  content: string,
  role: 'user' | 'assistant',
  metadata?: ChatMessage['metadata']
): void {
  const message: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: currentRepo.docId || 'no-session',
    content,
    role,
    timestamp: new Date().toISOString(),
    repoDocId: currentRepo.docId || undefined,
    metadata
  };
  
  chatHistory.push(message);
  
  // Persist to localStorage
  if (browser && currentRepo.docId) {
    persistChatHistory(currentRepo.docId, chatHistory);
  }
}

/**
 * Clear chat history
 */
export function clearChatHistory(): void {
  chatHistory.length = 0;
  
  if (browser && currentRepo.docId) {
    localStorage.removeItem(`repolens_chat_${currentRepo.docId}`);
  }
}

/**
 * Update navigation state
 */
export function updateNavigationState(
  updates: Partial<NavigationState>
): void {
  Object.assign(navigationState, updates);
  
  // Persist navigation preferences
  if (browser) {
    persistNavigationPrefs();
  }
}

/**
 * Add breadcrumb to navigation
 */
export function addBreadcrumb(label: string, path: string): void {
  const existingIndex = navigationState.breadcrumbs.findIndex(b => b.path === path);
  
  if (existingIndex >= 0) {
    // Remove all breadcrumbs after this one
    navigationState.breadcrumbs = navigationState.breadcrumbs.slice(0, existingIndex + 1);
  } else {
    navigationState.breadcrumbs.push({ label, path });
  }
}

/**
 * Toggle file selection
 */
export function toggleFileSelection(filePath: string): void {
  const index = navigationState.selectedFiles.indexOf(filePath);
  
  if (index >= 0) {
    navigationState.selectedFiles.splice(index, 1);
  } else {
    navigationState.selectedFiles.push(filePath);
  }
}

/**
 * Toggle directory expansion
 */
export function toggleDirectoryExpansion(dirPath: string): void {
  const index = navigationState.expandedDirectories.indexOf(dirPath);
  
  if (index >= 0) {
    navigationState.expandedDirectories.splice(index, 1);
  } else {
    navigationState.expandedDirectories.push(dirPath);
  }
}

// Utility functions with full TypeScript support

/**
 * Get current repository's Firestore document ID
 */
export function getRepoDocId(): string | null {
  return currentRepo.docId;
}

/**
 * Check if current repository has completed analysis
 */
export function isRepoAnalyzed(): boolean {
  return currentRepo.analysisStatus === 'completed' && currentRepo.analysisData !== null;
}

/**
 * Get subsystem by name from current repository
 */
export function getSubsystemByName(name: string): Subsystem | null {
  if (!currentRepo.analysisData?.subsystems) {
    return null;
  }
  
  return currentRepo.analysisData.subsystems.find(subsystem => 
    subsystem.name.toLowerCase() === name.toLowerCase()
  ) || null;
}

/**
 * Get all subsystems from current repository
 */
export function getAllSubsystems(): Subsystem[] {
  return currentRepo.analysisData?.subsystems || [];
}

/**
 * Get repository language distribution
 */
export function getLanguageDistribution(): Record<string, number> {
  return currentRepo.analysisData?.languages || {};
}

/**
 * Get total file count
 */
export function getFileCount(): number {
  return currentRepo.analysisData?.fileCount || 0;
}

/**
 * Check if repository has specific framework
 */
export function hasFramework(framework: string): boolean {
  return currentRepo.analysisData?.framework.toLowerCase() === framework.toLowerCase();
}

// localStorage persistence functions

/**
 * Cache recent repository for quick access
 */
function cacheRecentRepo(docId: string, repoData: FirestoreRepo): void {
  try {
    const recent = getRecentReposFromStorage();
    const repoInfo = {
      docId,
      fullName: repoData.fullName,
      lastAccessed: new Date().toISOString()
    };
    
    // Remove existing entry if present
    const filtered = recent.filter(r => r.docId !== docId);
    
    // Add to beginning and limit to 10
    const updated = [repoInfo, ...filtered].slice(0, 10);
    
    localStorage.setItem(STORAGE_KEYS.RECENT_REPOS, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to cache recent repository:', error);
  }
}

/**
 * Get recent repositories from localStorage
 */
function getRecentReposFromStorage(): Array<{docId: string; fullName: string; lastAccessed: string}> {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RECENT_REPOS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Persist chat history to localStorage
 */
function persistChatHistory(docId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(`repolens_chat_${docId}`, JSON.stringify(messages));
  } catch (error) {
    console.warn('Failed to persist chat history:', error);
  }
}

/**
 * Load chat history from localStorage
 */
export function loadChatHistory(docId: string): void {
  if (!browser) return;
  
  try {
    const stored = localStorage.getItem(`repolens_chat_${docId}`);
    if (stored) {
      const messages = JSON.parse(stored) as ChatMessage[];
      chatHistory.length = 0;
      chatHistory.push(...messages);
    }
  } catch (error) {
    console.warn('Failed to load chat history:', error);
  }
}

/**
 * Persist navigation preferences
 */
function persistNavigationPrefs(): void {
  try {
    const prefs = {
      sidebarOpen: navigationState.sidebarOpen,
      expandedDirectories: navigationState.expandedDirectories
    };
    localStorage.setItem(STORAGE_KEYS.NAVIGATION_PREFS, JSON.stringify(prefs));
  } catch (error) {
    console.warn('Failed to persist navigation preferences:', error);
  }
}

/**
 * Load navigation preferences from localStorage
 */
export function loadNavigationPrefs(): void {
  if (!browser) return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.NAVIGATION_PREFS);
    if (stored) {
      const prefs = JSON.parse(stored);
      navigationState.sidebarOpen = prefs.sidebarOpen ?? false;
      navigationState.expandedDirectories = prefs.expandedDirectories ?? [];
    }
  } catch (error) {
    console.warn('Failed to load navigation preferences:', error);
  }
}

/**
 * Get cached recent repositories for quick access
 */
export function getCachedRecentRepos(): Array<{docId: string; fullName: string; lastAccessed: string}> {
  if (!browser) return [];
  return getRecentReposFromStorage();
}

/**
 * Initialize stores on app startup
 */
export function initializeStores(): void {
  if (browser) {
    loadNavigationPrefs();
  }
}