/**
 * Simplified stores entry point - exports the new architecture directly
 */

// Export reactive stores
export { repositoryStore } from '$stores/repository.svelte';
export { documentationStore } from '$stores/documentation.svelte';
export { chatStore } from '$stores/chat.svelte';
export { navigationStore } from '$stores/navigation.svelte';
export { searchStore } from '$stores/search.svelte';
export { preferencesStore } from '$stores/preferences.svelte';

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
import { searchStore } from '$stores/search.svelte';
import { preferencesStore } from '$stores/preferences.svelte';

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