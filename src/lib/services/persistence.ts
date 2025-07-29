import { browser } from '$app/environment';
import type { PersistenceConfig } from '$types/stores';
import { PersistenceError } from '$types/error';
import { serializer } from '$utilities/serialization';

/**
 * Persistence service for managing localStorage/sessionStorage operations
 */

const DEFAULT_CONFIG: PersistenceConfig = {
  storage: 'localStorage',
  key: 'repolens-store',
  version: '1.0.0',
  compress: false,
  encrypt: false,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  serializer
};

export class PersistenceService {
  private config: PersistenceConfig;

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Persist data to storage
   */
  save<T>(key: string, data: T): void {
    if (!browser) return;

    try {
      const serialized = this.config.serializer.serialize(data);
      const storageKey = `${this.config.key}_${key}`;

      if (this.config.storage === 'localStorage') {
        localStorage.setItem(storageKey, serialized);
      } else if (this.config.storage === 'sessionStorage') {
        sessionStorage.setItem(storageKey, serialized);
      }
    } catch (error) {
      console.warn(`Failed to persist ${key}:`, error);
      throw new PersistenceError(`Failed to persist ${key}`, 'save');
    }
  }

  /**
   * Load data from storage
   */
  load<T>(key: string, defaultValue: T): T {
    if (!browser) return defaultValue;

    try {
      const storageKey = `${this.config.key}_${key}`;
      let stored: string | null = null;

      if (this.config.storage === 'localStorage') {
        stored = localStorage.getItem(storageKey);
      } else if (this.config.storage === 'sessionStorage') {
        stored = sessionStorage.getItem(storageKey);
      }

      if (!stored) return defaultValue;

      return this.config.serializer.deserialize(stored);
    } catch (error) {
      console.warn(`Failed to load persisted ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Clear data from storage
   */
  clear(key: string): void {
    if (!browser) return;

    try {
      const storageKey = `${this.config.key}_${key}`;

      if (this.config.storage === 'localStorage') {
        localStorage.removeItem(storageKey);
      } else if (this.config.storage === 'sessionStorage') {
        sessionStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn(`Failed to clear persisted ${key}:`, error);
      throw new PersistenceError(`Failed to clear ${key}`, 'clear');
    }
  }

  /**
   * Clear all app data from storage
   */
  clearAll(): void {
    if (!browser) return;

    try {
      const storage = this.config.storage === 'localStorage' ? localStorage : sessionStorage;
      const keysToRemove: string[] = [];

      // Find all keys that start with our app prefix
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(this.config.key)) {
          keysToRemove.push(key);
        }
      }

      // Remove all matching keys
      keysToRemove.forEach(key => storage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear all persisted data:', error);
      throw new PersistenceError('Failed to clear all data', 'clear');
    }
  }
}

// Create default persistence service instance
export const persistence = new PersistenceService();