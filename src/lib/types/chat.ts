// Chat-related types
export interface CodeBlock {
  language: string;
  code: string;
  filename?: string;
  startLine?: number;
  endLine?: number;
}

export interface ChatMessage {
  id: string;
  sessionId?: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  repoDocId?: string;
  metadata?: {
    files?: string[];
    codeBlocks?: CodeBlock[];
    suggestions?: string[];
  };
}

export interface ChatSession {
  id: string;
  repositoryId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}