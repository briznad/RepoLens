/**
 * Simplified stores entry point - exports the new architecture directly
 */

// Export reactive stores
export { repositoryStore } from '$stores/repository';
export { documentationStore } from '$stores/documentation';
export { chatStore } from '$stores/chat';
export { navigationStore } from '$stores/navigation';
export { searchStore } from '$stores/search';
export { preferencesStore } from '$stores/preferences';

// Export business logic managers
export { repositoryManager } from '$services/repository-manager';
export { chatManager } from '$services/chat-manager';
export { documentationManager } from '$services/documentation-manager';
export { navigationManager } from '$services/navigation-manager';
export { cache } from '$services/cache';
export { persistence } from '$services/persistence';

// Import to access utility functions
import { repositoryManager } from '$services/repository-manager';
import { chatManager } from '$services/chat-manager';
import { documentationManager } from '$services/documentation-manager';
import { navigationManager } from '$services/navigation-manager';
import { cache } from '$services/cache';
import { searchStore } from '$stores/search';
import { preferencesStore } from '$stores/preferences';

// Export utility functions directly from repository manager for backward compatibility
export const { 
  isRepoLoaded,
  getRepoDocId,
  isRepoAnalyzed,
  getSubsystemByName,
  getAllSubsystems,
  getLanguageDistribution,
  getFileCount,
  hasFramework
} = repositoryManager;

// For backward compatibility - export stores with old names
export { repositoryStore as currentRepo } from '$stores/repository';
export { documentationStore as documentationData } from '$stores/documentation';
export { chatStore as chatHistory } from '$stores/chat';
export { navigationStore as navigationState } from '$stores/navigation';
export { searchStore as searchState } from '$stores/search';
export { preferencesStore as userPreferences } from '$stores/preferences';

// Initialize function
export function initializeStores(): void {
  repositoryManager.initialize();
  chatManager.initialize();
  documentationManager.initialize();
  navigationManager.initialize();
  
  // Cleanup cache on startup
  cache.cleanup();
}

// Clear function
export function clearAllStores(): void {
  repositoryManager.clearRepository();
  documentationManager.clear();
  chatManager.clear();
  navigationManager.clear();
  searchStore.reset();
  preferencesStore.reset();
  cache.clear();
}