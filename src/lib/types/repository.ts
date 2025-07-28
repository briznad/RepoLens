import type { Timestamp } from 'firebase/firestore';
import type { AnalysisResult } from '../types';

export interface StoredRepository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  createdAt: Date;
  updatedAt: Date;
  lastAnalyzed: Date;
  analysisVersion: string;
  data: AnalysisResult;
  status: 'analyzing' | 'completed' | 'failed';
  error?: string;
}

export interface StoredRepositoryFirestore {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastAnalyzed: Timestamp;
  analysisVersion: string;
  data: AnalysisResult;
  status: 'analyzing' | 'completed' | 'failed';
  error?: string;
}