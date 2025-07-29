import type { FirestoreRepo } from '$types/repository';
import { ValidationError } from '$types/error';

/**
 * Validation utilities for store data
 */

export function validateRepo(repo: FirestoreRepo): void {
  if (!repo.id || !repo.fullName) {
    throw new ValidationError('Repository must have id and fullName', 'repo', repo);
  }
}

export function validateChatMessage(message: any): void {
  if (!message.id || !message.content || !message.role) {
    throw new ValidationError('Chat message must have id, content, and role', 'message', message);
  }
}

export function validateSessionId(sessionId: string): void {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new ValidationError('Session ID must be a non-empty string', 'sessionId', sessionId);
  }
}