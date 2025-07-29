import type { CacheEntry, CacheManager } from '$types/stores';
import type { FirestoreRepo } from '$types/repository';
import type { AnalysisResult } from '$types/analysis';
import { persistence } from './persistence';

/**
 * Intelligent caching service with LRU eviction and expiration
 */

export class CacheService {
  private state: CacheManager;

  constructor() {
    this.state = {
      repositories: new Map(),
      analyses: new Map(),
      aiDescriptions: new Map(),
      maxSize: 50 * 1024 * 1024, // 50MB
      currentSize: 0,
      lastCleanup: new Date().toISOString()
    };
    
    // Load persisted cache state
    this.loadFromPersistence();
  }

  // Repository caching
  cacheRepository(key: string, repo: FirestoreRepo, ttlHours: number = 24): void {
    const entry: CacheEntry<FirestoreRepo> = {
      data: repo,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
      version: '1.0.0',
      size: JSON.stringify(repo).length
    };

    this.state.repositories.set(key, entry);
    this.state.currentSize += entry.size;
    this.cleanup();
    this.persist();
  }

  getRepository(key: string): FirestoreRepo | null {
    const entry = this.state.repositories.get(key);
    if (!entry) return null;

    // Check expiration
    if (new Date(entry.expiresAt) < new Date()) {
      this.state.repositories.delete(key);
      this.state.currentSize -= entry.size;
      return null;
    }

    return entry.data;
  }

  // Analysis caching
  cacheAnalysis(key: string, analysis: AnalysisResult, ttlHours: number = 12): void {
    const entry: CacheEntry<AnalysisResult> = {
      data: analysis,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
      version: '1.0.0',
      size: JSON.stringify(analysis).length
    };

    this.state.analyses.set(key, entry);
    this.state.currentSize += entry.size;
    this.cleanup();
    this.persist();
  }

  getAnalysis(key: string): AnalysisResult | null {
    const entry = this.state.analyses.get(key);
    if (!entry) return null;

    if (new Date(entry.expiresAt) < new Date()) {
      this.state.analyses.delete(key);
      this.state.currentSize -= entry.size;
      return null;
    }

    return entry.data;
  }

  // AI description caching
  cacheAIDescription(key: string, description: string, ttlHours: number = 48): void {
    const entry: CacheEntry<string> = {
      data: description,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
      version: '1.0.0',
      size: description.length
    };

    this.state.aiDescriptions.set(key, entry);
    this.state.currentSize += entry.size;
    this.cleanup();
    this.persist();
  }

  getAIDescription(key: string): string | null {
    const entry = this.state.aiDescriptions.get(key);
    if (!entry) return null;

    if (new Date(entry.expiresAt) < new Date()) {
      this.state.aiDescriptions.delete(key);
      this.state.currentSize -= entry.size;
      return null;
    }

    return entry.data;
  }

  // Cache management
  cleanup(): void {
    // Remove expired entries
    this.removeExpired();

    // LRU eviction if over size limit
    if (this.state.currentSize > this.state.maxSize) {
      this.evictLRU();
    }

    this.state.lastCleanup = new Date().toISOString();
  }

  private removeExpired(): void {
    const now = new Date();

    // Clean repositories
    for (const [key, entry] of this.state.repositories) {
      if (new Date(entry.expiresAt) < now) {
        this.state.repositories.delete(key);
        this.state.currentSize -= entry.size;
      }
    }

    // Clean analyses
    for (const [key, entry] of this.state.analyses) {
      if (new Date(entry.expiresAt) < now) {
        this.state.analyses.delete(key);
        this.state.currentSize -= entry.size;
      }
    }

    // Clean AI descriptions
    for (const [key, entry] of this.state.aiDescriptions) {
      if (new Date(entry.expiresAt) < now) {
        this.state.aiDescriptions.delete(key);
        this.state.currentSize -= entry.size;
      }
    }
  }

  private evictLRU(): void {
    // Collect all entries with timestamps
    const allEntries: Array<{ key: string; timestamp: string; size: number; type: string }> = [];

    for (const [key, entry] of this.state.repositories) {
      allEntries.push({ key, timestamp: entry.timestamp, size: entry.size, type: 'repository' });
    }

    for (const [key, entry] of this.state.analyses) {
      allEntries.push({ key, timestamp: entry.timestamp, size: entry.size, type: 'analysis' });
    }

    for (const [key, entry] of this.state.aiDescriptions) {
      allEntries.push({ key, timestamp: entry.timestamp, size: entry.size, type: 'description' });
    }

    // Sort by timestamp (oldest first)
    allEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Remove oldest entries until under size limit
    for (const entry of allEntries) {
      if (this.state.currentSize <= this.state.maxSize * 0.8) break; // Leave some buffer

      switch (entry.type) {
        case 'repository':
          this.state.repositories.delete(entry.key);
          break;
        case 'analysis':
          this.state.analyses.delete(entry.key);
          break;
        case 'description':
          this.state.aiDescriptions.delete(entry.key);
          break;
      }

      this.state.currentSize -= entry.size;
    }
  }

  clear(): void {
    this.state = {
      repositories: new Map(),
      analyses: new Map(),
      aiDescriptions: new Map(),
      maxSize: 50 * 1024 * 1024, // 50MB
      currentSize: 0,
      lastCleanup: new Date().toISOString()
    };
    persistence.clear('cacheManager');
  }

  // Statistics
  getStats() {
    return {
      totalEntries: this.state.repositories.size + this.state.analyses.size + this.state.aiDescriptions.size,
      currentSize: this.state.currentSize,
      maxSize: this.state.maxSize,
      utilizationPercent: Math.round((this.state.currentSize / this.state.maxSize) * 100),
      repositories: this.state.repositories.size,
      analyses: this.state.analyses.size,
      aiDescriptions: this.state.aiDescriptions.size,
      lastCleanup: this.state.lastCleanup
    };
  }

  // Persistence methods
  private persist(): void {
    persistence.save('cacheManager', this.state);
  }

  private loadFromPersistence(): void {
    const defaultState = {
      repositories: new Map(),
      analyses: new Map(),
      aiDescriptions: new Map(),
      maxSize: 50 * 1024 * 1024, // 50MB
      currentSize: 0,
      lastCleanup: new Date().toISOString()
    };
    
    this.state = persistence.load('cacheManager', defaultState);
  }
}

// Create default cache service instance
export const cache = new CacheService();