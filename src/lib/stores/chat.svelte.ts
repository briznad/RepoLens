import type { ChatHistory } from '$types/stores';
import type { ChatMessage } from '$types/chat';

/**
 * Pure reactive store for chat state
 * Contains only reactive state, no business logic
 */

const createDefaultState = (): ChatHistory => ({
  sessions: new Map(),
  currentSession: null,
  isStreaming: false,
  error: null,
  preferences: {
    enableAutoScroll: true,
    showTimestamps: true,
    enableSounds: false,
    maxHistorySize: 100
  }
});

export const chatStore = (() => {
  let state = $state<ChatHistory>(createDefaultState());

  return {
    get value() { return state; },

    // Session management
    createSession(sessionId: string, repoId: string): void {
      state.sessions.set(sessionId, {
        repoId,
        messages: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    },

    setCurrentSession(sessionId: string | null): void {
      state.currentSession = sessionId;
    },

    deleteSession(sessionId: string): void {
      state.sessions.delete(sessionId);
      if (state.currentSession === sessionId) {
        state.currentSession = null;
      }
    },

    clearAllSessions(): void {
      state.sessions.clear();
      state.currentSession = null;
    },

    // Message management
    addMessage(sessionId: string, message: ChatMessage): void {
      const session = state.sessions.get(sessionId);
      if (session) {
        session.messages.push(message);
        session.lastUpdated = new Date().toISOString();
      }
    },

    limitSessionMessages(sessionId: string, maxSize: number): void {
      const session = state.sessions.get(sessionId);
      if (session && session.messages.length > maxSize) {
        session.messages = session.messages.slice(-maxSize);
      }
    },

    // State management
    setStreaming(isStreaming: boolean): void {
      state.isStreaming = isStreaming;
    },

    setError(error: string | null): void {
      state.error = error;
    },

    // Preferences
    setPreferences(prefs: Partial<ChatHistory['preferences']>): void {
      state.preferences = { ...state.preferences, ...prefs };
    },

    // Getters
    getSession(sessionId: string) {
      return state.sessions.get(sessionId) || null;
    },

    getSessionMessages(sessionId: string): ChatMessage[] {
      return state.sessions.get(sessionId)?.messages || [];
    },

    reset(): void {
      state = createDefaultState();
    }
  };
})();