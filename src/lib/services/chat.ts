import { firestore } from '$services/firestore';
import type { ChatMessage, ChatSession } from '$types/chat';
import { createId } from 'briznads-helpers';

// Collection names
const CHAT_SESSIONS_COLLECTION = 'chat_sessions';
const CHAT_MESSAGES_COLLECTION = 'chat_messages';

/**
 * Chat service for managing persistent chat sessions and messages
 */
export class ChatService {
  /**
   * Create a new chat session for a repository
   */
  async createSession(repositoryId: string): Promise<string> {
    try {
      const sessionData = {
        repositoryId,
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const sessionId = await firestore.create(CHAT_SESSIONS_COLLECTION, sessionData);
      return sessionId;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw new Error('Failed to create chat session');
    }
  }

  /**
   * Get existing chat session for a repository or create a new one
   */
  async getOrCreateSession(repositoryId: string): Promise<string> {
    try {
      // Try to find existing session
      const existingSession = await firestore.findOne<any>(
        CHAT_SESSIONS_COLLECTION,
        'repositoryId',
        repositoryId
      );

      if (existingSession) {
        return existingSession.id;
      }

      // Create new session if none exists
      return await this.createSession(repositoryId);
    } catch (error) {
      console.error('Error getting or creating chat session:', error);
      throw new Error('Failed to get chat session');
    }
  }

  /**
   * Save a message to the session
   */
  async saveMessage(sessionId: string, message: Omit<ChatMessage, 'sessionId'>): Promise<void> {
    try {
      const messageData = {
        ...message,
        sessionId,
        createdAt: new Date().toISOString()
      };

      await firestore.create(CHAT_MESSAGES_COLLECTION, messageData, message.id);

      // Update session's updatedAt timestamp and increment message count
      await firestore.update(CHAT_SESSIONS_COLLECTION, sessionId, {
        updatedAt: new Date().toISOString(),
        messageCount: await this.getMessageCount(sessionId)
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
      throw new Error('Failed to save chat message');
    }
  }

  /**
   * Load all messages for a session
   */
  async loadMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const messages = await firestore.findMany<ChatMessage>(
        CHAT_MESSAGES_COLLECTION,
        'sessionId',
        sessionId,
        undefined, // no limit
        'timestamp', // order by timestamp
        'asc' // ascending order (oldest first)
      );

      return messages;
    } catch (error) {
      console.error('Error loading chat messages:', error);
      throw new Error('Failed to load chat messages');
    }
  }

  /**
   * Get message count for a session
   */
  private async getMessageCount(sessionId: string): Promise<number> {
    try {
      const messages = await firestore.findMany<ChatMessage>(
        CHAT_MESSAGES_COLLECTION,
        'sessionId',
        sessionId
      );
      return messages.length;
    } catch (error) {
      console.error('Error getting message count:', error);
      return 0;
    }
  }

  /**
   * Delete a chat session and all its messages
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Delete all messages first
      const messages = await this.loadMessages(sessionId);
      const deletePromises = messages.map(message => 
        firestore.delete(CHAT_MESSAGES_COLLECTION, message.id)
      );
      await Promise.all(deletePromises);

      // Delete the session
      await firestore.delete(CHAT_SESSIONS_COLLECTION, sessionId);
    } catch (error) {
      console.error('Error deleting chat session:', error);
      throw new Error('Failed to delete chat session');
    }
  }

  /**
   * Get session info
   */
  async getSession(sessionId: string): Promise<any> {
    try {
      return await firestore.getById(CHAT_SESSIONS_COLLECTION, sessionId);
    } catch (error) {
      console.error('Error getting chat session:', error);
      return null;
    }
  }

  /**
   * Get all sessions for a repository (if needed for multiple sessions support)
   */
  async getRepositorySessions(repositoryId: string): Promise<any[]> {
    try {
      return await firestore.findMany(
        CHAT_SESSIONS_COLLECTION,
        'repositoryId',
        repositoryId,
        undefined,
        'updatedAt',
        'desc'
      );
    } catch (error) {
      console.error('Error getting repository sessions:', error);
      return [];
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();