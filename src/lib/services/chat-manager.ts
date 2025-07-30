import type { ChatMessage } from '$types/chat';
import { chatStore } from '$stores/chat.svelte';
import { persistence } from './persistence';
import { validateChatMessage, validateSessionId } from '$utilities/validation';
import { StoreError } from '$types/error';

/**
 * Chat management service - handles business logic for chat operations
 */

export class ChatManager {

  /**
   * Create a new chat session
   */
  createSession(repoId: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    chatStore.createSession(sessionId, repoId);
    chatStore.setCurrentSession(sessionId);

    persistence.save('chatHistory', chatStore.value);
    return sessionId;
  }

  /**
   * Set the current active session
   */
  setCurrentSession(sessionId: string | null): void {
    if (sessionId) {
      validateSessionId(sessionId);

      if (!chatStore.getSession(sessionId)) {
        throw new StoreError('Chat session not found', 'SESSION_NOT_FOUND', { sessionId });
      }
    }

    chatStore.setCurrentSession(sessionId);
    persistence.save('chatHistory', chatStore.value);
  }

  /**
   * Add a message to the current session
   */
  addMessage(message: ChatMessage): void {
    const currentSession = chatStore.value.currentSession;

    if (!currentSession) {
      throw new StoreError('No active chat session', 'NO_SESSION');
    }

    validateChatMessage(message);

    chatStore.addMessage(currentSession, message);

    // Limit message history based on preferences
    const maxSize = chatStore.value.preferences.maxHistorySize;
    chatStore.limitSessionMessages(currentSession, maxSize);

    persistence.save('chatHistory', chatStore.value);
  }

  /**
   * Set streaming state
   */
  setStreaming(isStreaming: boolean): void {
    chatStore.setStreaming(isStreaming);
  }

  /**
   * Set error state
   */
  setError(error: string | null): void {
    chatStore.setError(error);
  }

  /**
   * Delete a chat session
   */
  deleteSession(sessionId: string): void {
    validateSessionId(sessionId);
    chatStore.deleteSession(sessionId);
    persistence.save('chatHistory', chatStore.value);
  }

  /**
   * Clear all chat sessions
   */
  clearAllSessions(): void {
    chatStore.clearAllSessions();
    persistence.save('chatHistory', chatStore.value);
  }

  /**
   * Update chat preferences
   */
  updatePreferences(prefs: Partial<typeof chatStore.value.preferences>): void {
    chatStore.setPreferences(prefs);
    persistence.save('chatHistory', chatStore.value);
  }

  /**
   * Get messages for a specific session
   */
  getSessionMessages(sessionId: string): ChatMessage[] {
    return chatStore.getSessionMessages(sessionId);
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return chatStore.value.currentSession;
  }

  /**
   * Check if currently streaming
   */
  isStreaming(): boolean {
    return chatStore.value.isStreaming;
  }

  /**
   * Get current error
   */
  getError(): string | null {
    return chatStore.value.error;
  }

  /**
   * Clear all chat data
   */
  clear(): void {
    chatStore.reset();
    persistence.clear('chatHistory');
  }

  /**
   * Initialize chat manager with persisted data
   */
  initialize(): void {
    const defaultState = {
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
    };

    const persistedState = persistence.load('chatHistory', defaultState);

    // Restore sessions
    if (persistedState.sessions instanceof Map) {
      for (const [sessionId, sessionData] of persistedState.sessions) {
        chatStore.createSession(sessionId, sessionData.repoId);

        // Add messages
        for (const message of sessionData.messages) {
          chatStore.addMessage(sessionId, message);
        }
      }
    }

    // Restore other state
    chatStore.setCurrentSession(persistedState.currentSession);
    chatStore.setPreferences(persistedState.preferences);
  }
}

// Create default chat manager instance
export const chatManager = new ChatManager();