import type { UserPreferences } from '$types/ui';

/**
 * Pure reactive store for user preferences
 * Contains only reactive state, no business logic
 */

const createDefaultState = (): UserPreferences => ({
  theme: 'system',
  language: 'en',
  codeEditor: {
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    lineNumbers: true,
    wordWrap: true,
    theme: 'dark'
  },
  analysis: {
    includeTests: true,
    includeConfig: true,
    maxFileSize: 1024 * 1024, // 1MB
    languages: ['typescript', 'javascript', 'python', 'svelte']
  },
  notifications: {
    analysisComplete: true,
    newInsights: true,
    errors: true
  },
  documentation: {
    autoExpandSubsystems: true,
    showFilePreview: true,
    enableAIDescriptions: true,
    recentViewLimit: 10
  },
  navigation: {
    rememberLastPage: true,
    showBreadcrumbs: true,
    sidebarCollapsed: false
  }
});

export const preferencesStore = (() => {
  let state = $state<UserPreferences>(createDefaultState());

  return {
    get value() { return state; },

    // Theme settings
    setTheme(theme: UserPreferences['theme']): void {
      state.theme = theme;
    },

    setLanguage(language: string): void {
      state.language = language;
    },

    // Code editor preferences
    setCodeEditorPrefs(prefs: Partial<UserPreferences['codeEditor']>): void {
      state.codeEditor = { ...state.codeEditor, ...prefs };
    },

    // Analysis preferences
    setAnalysisPrefs(prefs: Partial<UserPreferences['analysis']>): void {
      state.analysis = { ...state.analysis, ...prefs };
    },

    // Notification preferences
    setNotificationPrefs(prefs: Partial<UserPreferences['notifications']>): void {
      state.notifications = { ...state.notifications, ...prefs };
    },

    // Documentation preferences
    setDocumentationPrefs(prefs: Partial<UserPreferences['documentation']>): void {
      state.documentation = { ...state.documentation, ...prefs };
    },

    // Navigation preferences
    setNavigationPrefs(prefs: Partial<UserPreferences['navigation']>): void {
      state.navigation = { ...state.navigation, ...prefs };
    },

    // Bulk operations
    updatePreferences(prefs: Partial<UserPreferences>): void {
      Object.assign(state, prefs);
    },

    resetToDefaults(): void {
      state = createDefaultState();
    },

    reset(): void {
      state = createDefaultState();
    }
  };
})();