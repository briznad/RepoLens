import type { NavigationState } from '$types/stores';
import { navigationStore } from '$stores/navigation.svelte';
import { persistence } from './persistence';

/**
 * Navigation management service - handles business logic for navigation operations
 */

export class NavigationManager {

  /**
   * Navigate to a new page
   */
  navigateTo(page: NavigationState['currentPage']): void {
    navigationStore.setCurrentPage(page);
    navigationStore.addToRouteHistory(page);
    navigationStore.limitRouteHistory(20);

    persistence.save('navigationState', navigationStore.value);
  }

  /**
   * Set repository context for navigation
   */
  setRepositoryContext(repoId: string | null, repoName: string | null): void {
    navigationStore.setRepoContext(repoId, repoName);

    // Auto-generate breadcrumbs for repository context
    if (repoId && repoName) {
      this.updateBreadcrumbs([
        { label: 'Home', path: '/', icon: 'home' },
        { label: repoName, path: `/repo/${repoId}`, icon: 'folder' }
      ]);
    } else {
      this.updateBreadcrumbs([]);
    }

    persistence.save('navigationState', navigationStore.value);
  }

  /**
   * Set current subsystem in navigation context
   */
  setCurrentSubsystem(subsystemName: string | null): void {
    navigationStore.setCurrentSubsystem(subsystemName);

    // Update breadcrumbs to include subsystem
    const repoContext = navigationStore.value.repoContext;
    if (subsystemName && repoContext.repoId && repoContext.repoName) {
      this.updateBreadcrumbs([
        { label: 'Home', path: '/', icon: 'home' },
        { label: repoContext.repoName, path: `/repo/${repoContext.repoId}`, icon: 'folder' },
        { label: 'Documentation', path: `/repo/${repoContext.repoId}/docs`, icon: 'book' },
        { label: subsystemName, path: `/repo/${repoContext.repoId}/docs/${encodeURIComponent(subsystemName)}`, icon: 'code' }
      ]);
    }
  }

  /**
   * Update breadcrumbs
   */
  updateBreadcrumbs(breadcrumbs: NavigationState['breadcrumbs']): void {
    navigationStore.setBreadcrumbs(breadcrumbs);
    persistence.save('navigationState', navigationStore.value);
  }

  /**
   * Add a breadcrumb to the current trail
   */
  addBreadcrumb(label: string, path: string, icon?: string): void {
    navigationStore.addBreadcrumb(label, path, icon);
    persistence.save('navigationState', navigationStore.value);
  }

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar(): void {
    const isCurrentlyOpen = navigationStore.value.sidebarOpen;
    navigationStore.setSidebarOpen(!isCurrentlyOpen);
    persistence.save('navigationState', navigationStore.value);
  }

  /**
   * Set sidebar visibility
   */
  setSidebarOpen(open: boolean): void {
    navigationStore.setSidebarOpen(open);
    persistence.save('navigationState', navigationStore.value);
  }

  /**
   * Toggle file selection
   */
  toggleFileSelection(filePath: string): void {
    navigationStore.toggleFileSelection(filePath);
    // File selection is UI state, might not need persistence
  }

  /**
   * Clear all selected files
   */
  clearFileSelection(): void {
    navigationStore.clearFileSelection();
  }

  /**
   * Toggle directory expansion
   */
  toggleDirectoryExpansion(dirPath: string): void {
    navigationStore.toggleDirectoryExpansion(dirPath);
    // Directory expansion is UI state, might not need persistence
  }

  /**
   * Save scroll position for a route
   */
  saveScrollPosition(path: string, position: number): void {
    navigationStore.saveScrollPosition(path, position);
    persistence.save('navigationState', navigationStore.value);
  }

  /**
   * Get saved scroll position for a route
   */
  getScrollPosition(path: string): number {
    return navigationStore.getScrollPosition(path);
  }

  /**
   * Get current page
   */
  getCurrentPage(): NavigationState['currentPage'] {
    return navigationStore.value.currentPage;
  }

  /**
   * Get previous page
   */
  getPreviousPage(): string | null {
    return navigationStore.value.previousPage;
  }

  /**
   * Get current repository context
   */
  getRepositoryContext() {
    return navigationStore.value.repoContext;
  }

  /**
   * Get current breadcrumbs
   */
  getBreadcrumbs() {
    return navigationStore.value.breadcrumbs;
  }

  /**
   * Check if sidebar is open
   */
  isSidebarOpen(): boolean {
    return navigationStore.value.sidebarOpen;
  }

  /**
   * Get selected files
   */
  getSelectedFiles(): string[] {
    return navigationStore.value.selectedFiles;
  }

  /**
   * Get expanded directories
   */
  getExpandedDirectories(): string[] {
    return navigationStore.value.expandedDirectories;
  }

  /**
   * Get route history
   */
  getRouteHistory(): string[] {
    return navigationStore.value.routeHistory;
  }

  /**
   * Clear all navigation state
   */
  clear(): void {
    navigationStore.reset();
    persistence.clear('navigationState');
  }

  /**
   * Initialize navigation manager with persisted data
   */
  initialize(): void {
    const defaultState = {
      currentPage: 'home' as const,
      previousPage: null,
      breadcrumbs: [],
      repoContext: {
        repoId: null,
        repoName: null,
        currentSubsystem: null
      },
      sidebarOpen: false,
      selectedFiles: [],
      expandedDirectories: [],
      scrollPositions: new Map(),
      routeHistory: []
    };

    const persistedState = persistence.load('navigationState', defaultState);

    // Restore critical navigation state
    if (persistedState.currentPage) {
      navigationStore.setCurrentPage(persistedState.currentPage);
    }

    if (persistedState.repoContext) {
      navigationStore.setRepoContext(
        persistedState.repoContext.repoId,
        persistedState.repoContext.repoName
      );
      if (persistedState.repoContext.currentSubsystem) {
        navigationStore.setCurrentSubsystem(persistedState.repoContext.currentSubsystem);
      }
    }

    if (persistedState.breadcrumbs) {
      navigationStore.setBreadcrumbs(persistedState.breadcrumbs);
    }

    if (typeof persistedState.sidebarOpen === 'boolean') {
      navigationStore.setSidebarOpen(persistedState.sidebarOpen);
    }

    if (persistedState.scrollPositions instanceof Map) {
      for (const [path, position] of persistedState.scrollPositions) {
        navigationStore.saveScrollPosition(path, position);
      }
    }

    if (Array.isArray(persistedState.routeHistory)) {
      for (const route of persistedState.routeHistory) {
        navigationStore.addToRouteHistory(route);
      }
    }
  }
}

// Create default navigation manager instance
export const navigationManager = new NavigationManager();