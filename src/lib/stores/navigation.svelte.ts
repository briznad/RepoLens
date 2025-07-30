import type { NavigationState } from '$types/stores';

/**
 * Pure reactive store for navigation state
 * Contains only reactive state, no business logic
 */

const createDefaultState = (): NavigationState => ({
  currentPage: 'home',
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
});

export const navigationStore = (() => {
  let state = $state<NavigationState>(createDefaultState());

  return {
    get value() { return state; },

    // Page navigation
    setCurrentPage(page: NavigationState['currentPage']): void {
      state.previousPage = state.currentPage;
      state.currentPage = page;
    },

    addToRouteHistory(page: string): void {
      state.routeHistory.push(page);
    },

    limitRouteHistory(maxLength: number): void {
      if (state.routeHistory.length > maxLength) {
        state.routeHistory = state.routeHistory.slice(-maxLength);
      }
    },

    // Repository context
    setRepoContext(repoId: string | null, repoName: string | null): void {
      state.repoContext.repoId = repoId;
      state.repoContext.repoName = repoName;
      state.repoContext.currentSubsystem = null;
    },

    setCurrentSubsystem(subsystemName: string | null): void {
      state.repoContext.currentSubsystem = subsystemName;
    },

    // Breadcrumbs
    setBreadcrumbs(breadcrumbs: NavigationState['breadcrumbs']): void {
      state.breadcrumbs = breadcrumbs;
    },

    addBreadcrumb(label: string, path: string, icon?: string): void {
      const existingIndex = state.breadcrumbs.findIndex(b => b.path === path);
      
      if (existingIndex >= 0) {
        // Remove all breadcrumbs after this one
        state.breadcrumbs = state.breadcrumbs.slice(0, existingIndex + 1);
      } else {
        state.breadcrumbs.push({ label, path, icon });
      }
    },

    // UI state
    setSidebarOpen(open: boolean): void {
      state.sidebarOpen = open;
    },

    // File operations
    toggleFileSelection(filePath: string): void {
      const index = state.selectedFiles.indexOf(filePath);
      if (index >= 0) {
        state.selectedFiles.splice(index, 1);
      } else {
        state.selectedFiles.push(filePath);
      }
    },

    clearFileSelection(): void {
      state.selectedFiles = [];
    },

    // Directory operations
    toggleDirectoryExpansion(dirPath: string): void {
      const index = state.expandedDirectories.indexOf(dirPath);
      if (index >= 0) {
        state.expandedDirectories.splice(index, 1);
      } else {
        state.expandedDirectories.push(dirPath);
      }
    },

    // Scroll positions
    saveScrollPosition(path: string, position: number): void {
      state.scrollPositions.set(path, position);
    },

    getScrollPosition(path: string): number {
      return state.scrollPositions.get(path) || 0;
    },

    reset(): void {
      state = createDefaultState();
    }
  };
})();