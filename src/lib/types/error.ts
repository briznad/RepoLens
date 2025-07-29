export type ErrorPayload = {
  error: string;
};

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context?: {
    repositoryId?: string;
    sessionId?: string;
    userId?: string;
    action?: string;
  };
}

// Error classes for stores
export class StoreError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

export class PersistenceError extends StoreError {
  constructor(message: string, public operation: 'save' | 'load' | 'clear') {
    super(message, 'PERSISTENCE_ERROR', { operation });
    this.name = 'PersistenceError';
  }
}

export class ValidationError extends StoreError {
  constructor(message: string, public field: string, public value: any) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

// GitHub API Error classes
export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

export class GitHubRateLimitError extends GitHubApiError {
  constructor(
    message: string,
    public resetTime: number,
    public remainingRequests: number
  ) {
    super(message, 403);
    this.name = 'GitHubRateLimitError';
  }
}

export class GitHubRepoNotFoundError extends GitHubApiError {
  constructor(
    public owner: string,
    public repo: string
  ) {
    super(`Repository ${owner}/${repo} not found or is private`, 404);
    this.name = 'GitHubRepoNotFoundError';
  }
}

export class GitHubInvalidUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubInvalidUrlError';
  }
}