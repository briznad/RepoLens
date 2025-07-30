import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to import the class and instance separately for static method testing
let Firestore: any;
let firestore: any;

// Dynamic import to get both the class and instance after mocking
beforeEach(async () => {
  const module = await import('./firestore');
  firestore = module.firestore;
  Firestore = firestore.constructor;
});

import type { DocumentData } from 'firebase/firestore';

// Mock Firebase modules
const mockDb = { name: 'mock-firestore-db' };

vi.mock('firebase/firestore', () => {
  class MockFirestoreTimestamp {
    static now = vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 }));
    constructor(public seconds: number, public nanoseconds: number) {}
  }

  return {
    getFirestore: vi.fn(() => mockDb),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    Timestamp: MockFirestoreTimestamp
  };
});

vi.mock('$services/firebase', () => ({
  firebase: {
    app: {}
  }
}));

vi.mock('briznads-helpers', () => ({
  createId: vi.fn(() => 'generated-id')
}));

// Import mocked modules
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  collection,
  where,
  orderBy,
  limit,
  Timestamp as FirestoreTimestamp
} from 'firebase/firestore';
import { createId } from 'briznads-helpers';

describe('firestore service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create method', () => {
    it('should create document with auto-generated ID', async () => {
      const mockData = { name: 'Test Document', value: 42 };
      const mockDocRef = { id: 'generated-id' };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(setDoc).mockResolvedValue(undefined);

      const result = await firestore.create('test-collection', mockData);

      expect(createId).toHaveBeenCalledWith('lowercase', 9);
      expect(doc).toHaveBeenCalledWith(
        mockDb,
        'test-collection',
        'generated-id'
      );
      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          name: 'Test Document',
          value: 42,
          createdAt: expect.anything(),
          updatedAt: expect.anything()
        })
      );
      expect(result).toBe('generated-id');
    });

    it('should create document with custom ID', async () => {
      const mockData = { name: 'Test Document' };
      const customId = 'custom-doc-id';
      const mockDocRef = { id: customId };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(setDoc).mockResolvedValue(undefined);

      const result = await firestore.create('test-collection', mockData, customId);

      expect(createId).not.toHaveBeenCalled();
      expect(doc).toHaveBeenCalledWith(
        mockDb,
        'test-collection',
        customId
      );
      expect(result).toBe(customId);
    });

    it('should sanitize undefined values to null', async () => {
      const mockData = {
        name: 'Test',
        undefinedValue: undefined,
        nested: {
          value: 'defined',
          anotherUndefined: undefined
        },
        array: ['item1', undefined, 'item3']
      };

      const mockDocRef = { id: 'test-id' };
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(setDoc).mockResolvedValue(undefined);

      await firestore.create('test-collection', mockData, 'test-id');

      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          name: 'Test',
          undefinedValue: null,
          nested: {
            value: 'defined',
            anotherUndefined: null
          },
          array: ['item1', null, 'item3']
        })
      );
    });

    it('should handle creation errors', async () => {
      const mockData = { name: 'Test' };
      const error = new Error('Firestore error');

      vi.mocked(doc).mockReturnValue({} as any);
      vi.mocked(setDoc).mockRejectedValue(error);

      await expect(
        firestore.create('test-collection', mockData)
      ).rejects.toThrow('Firestore error');
    });

    it('should preserve Date and Timestamp objects', async () => {
      const testDate = new Date('2024-01-01');
      const testTimestamp = FirestoreTimestamp.now();
      
      const mockData = {
        regularDate: testDate,
        firestoreTimestamp: testTimestamp,
        nested: {
          anotherDate: testDate
        }
      };

      const mockDocRef = { id: 'test-id' };
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(setDoc).mockResolvedValue(undefined);

      await firestore.create('test-collection', mockData, 'test-id');

      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          regularDate: testDate,
          firestoreTimestamp: testTimestamp,
          nested: {
            anotherDate: testDate
          }
        })
      );
    });
  });

  describe('getById method', () => {
    it('should retrieve existing document', async () => {
      const mockData = { name: 'Test Document', value: 42 };
      const mockDocRef = { id: 'test-id' };
      const mockDocSnap = {
        exists: () => true,
        id: 'test-id',
        data: () => mockData
      };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await firestore.getById('test-collection', 'test-id');

      expect(doc).toHaveBeenCalledWith(
        mockDb,
        'test-collection',
        'test-id'
      );
      expect(getDoc).toHaveBeenCalledWith(mockDocRef);
      expect(result).toEqual({
        id: 'test-id',
        name: 'Test Document',
        value: 42
      });
    });

    it('should return null for non-existent document', async () => {
      const mockDocRef = { id: 'non-existent' };
      const mockDocSnap = {
        exists: () => false
      };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const result = await firestore.getById('test-collection', 'non-existent');

      expect(result).toBeNull();
    });

    it('should handle retrieval errors', async () => {
      const error = new Error('Firestore error');
      const mockDocRef = { id: 'test-id' };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(getDoc).mockRejectedValue(error);

      const result = await firestore.getById('test-collection', 'test-id');

      expect(result).toBeNull();
    });
  });

  describe('update method', () => {
    it('should update document successfully', async () => {
      const updates = { name: 'Updated Name', value: 100 };
      const mockDocRef = { id: 'test-id' };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      await firestore.update('test-collection', 'test-id', updates);

      expect(doc).toHaveBeenCalledWith(
        mockDb,
        'test-collection',
        'test-id'
      );
      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          name: 'Updated Name',
          value: 100,
          updatedAt: expect.anything()
        })
      );
    });

    it('should sanitize undefined values in updates', async () => {
      const updates = {
        name: 'Updated',
        undefinedValue: undefined,
        nested: {
          value: 'defined',
          anotherUndefined: undefined
        }
      };
      const mockDocRef = { id: 'test-id' };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      await firestore.update('test-collection', 'test-id', updates);

      expect(updateDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          name: 'Updated',
          undefinedValue: null,
          nested: {
            value: 'defined',
            anotherUndefined: null
          }
        })
      );
    });

    it('should handle update errors', async () => {
      const updates = { name: 'Updated' };
      const error = new Error('Update failed');
      const mockDocRef = { id: 'test-id' };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(updateDoc).mockRejectedValue(error);

      await expect(
        firestore.update('test-collection', 'test-id', updates)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('delete method', () => {
    it('should delete document successfully', async () => {
      const mockDocRef = { id: 'test-id' };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(deleteDoc).mockResolvedValue(undefined);

      await firestore.delete('test-collection', 'test-id');

      expect(doc).toHaveBeenCalledWith(
        mockDb,
        'test-collection',
        'test-id'
      );
      expect(deleteDoc).toHaveBeenCalledWith(mockDocRef);
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Delete failed');
      const mockDocRef = { id: 'test-id' };

      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(deleteDoc).mockRejectedValue(error);

      await expect(
        firestore.delete('test-collection', 'test-id')
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('query method', () => {
    it('should execute query with constraints', async () => {
      const mockConstraints = [where('status', '==', 'active'), limit(10)];
      const mockCollection = { name: 'test-collection' };
      const mockQuery = { constraints: mockConstraints };
      const mockDocs = [
        { id: 'doc1', data: () => ({ name: 'Document 1' }) },
        { id: 'doc2', data: () => ({ name: 'Document 2' }) }
      ];
      const mockQuerySnapshot = { docs: mockDocs };

      vi.mocked(collection).mockReturnValue(mockCollection as any);
      vi.mocked(query).mockReturnValue(mockQuery as any);
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);

      const result = await firestore.query('test-collection', mockConstraints);

      expect(collection).toHaveBeenCalledWith(
        mockDb,
        'test-collection'
      );
      expect(query).toHaveBeenCalledWith(mockCollection, ...mockConstraints);
      expect(getDocs).toHaveBeenCalledWith(mockQuery);
      expect(result).toEqual([
        { id: 'doc1', name: 'Document 1' },
        { id: 'doc2', name: 'Document 2' }
      ]);
    });

    it('should execute query without constraints', async () => {
      const mockCollection = { name: 'test-collection' };
      const mockQuery = { constraints: [] };
      const mockQuerySnapshot = { docs: [] };

      vi.mocked(collection).mockReturnValue(mockCollection as any);
      vi.mocked(query).mockReturnValue(mockQuery as any);
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);

      const result = await firestore.query('test-collection');

      expect(query).toHaveBeenCalledWith(mockCollection);
      expect(result).toEqual([]);
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      const mockCollection = { name: 'test-collection' };
      const mockQuery = { constraints: [] };

      vi.mocked(collection).mockReturnValue(mockCollection as any);
      vi.mocked(query).mockReturnValue(mockQuery as any);
      vi.mocked(getDocs).mockRejectedValue(error);

      const result = await firestore.query('test-collection');

      expect(result).toEqual([]);
    });
  });

  describe('findOne method', () => {
    it('should find first matching document', async () => {
      const mockDoc = { id: 'found-doc', data: () => ({ name: 'Found Document' }) };
      const mockQuerySnapshot = { 
        empty: false,
        docs: [mockDoc] 
      };

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(where).mockReturnValue({} as any);
      vi.mocked(limit).mockReturnValue({} as any);
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);

      const result = await firestore.findOne('test-collection', 'status', 'active');

      expect(where).toHaveBeenCalledWith('status', '==', 'active');
      expect(limit).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        id: 'found-doc',
        name: 'Found Document'
      });
    });

    it('should return null when no documents found', async () => {
      const mockQuerySnapshot = { 
        empty: true,
        docs: [] 
      };

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(where).mockReturnValue({} as any);
      vi.mocked(limit).mockReturnValue({} as any);
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);

      const result = await firestore.findOne('test-collection', 'status', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should handle findOne errors', async () => {
      const error = new Error('FindOne failed');

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(where).mockReturnValue({} as any);
      vi.mocked(limit).mockReturnValue({} as any);
      vi.mocked(getDocs).mockRejectedValue(error);

      const result = await firestore.findOne('test-collection', 'field', 'value');

      expect(result).toBeNull();
    });
  });

  describe('findMany method', () => {
    it('should find multiple matching documents', async () => {
      const mockDocs = [
        { id: 'doc1', data: () => ({ name: 'Document 1', status: 'active' }) },
        { id: 'doc2', data: () => ({ name: 'Document 2', status: 'active' }) }
      ];
      const mockQuerySnapshot = { docs: mockDocs };

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(where).mockReturnValue({} as any);
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);

      const result = await firestore.findMany('test-collection', 'status', 'active');

      expect(where).toHaveBeenCalledWith('status', '==', 'active');
      expect(result).toEqual([
        { id: 'doc1', name: 'Document 1', status: 'active' },
        { id: 'doc2', name: 'Document 2', status: 'active' }
      ]);
    });

    it('should apply ordering and limit', async () => {
      const mockDocs = [
        { id: 'doc1', data: () => ({ name: 'Document 1', createdAt: '2024-01-01' }) }
      ];
      const mockQuerySnapshot = { docs: mockDocs };

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(where).mockReturnValue({} as any);
      vi.mocked(orderBy).mockReturnValue({} as any);
      vi.mocked(limit).mockReturnValue({} as any);
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);

      await firestore.findMany(
        'test-collection',
        'status',
        'active',
        5,
        'createdAt',
        'asc'
      );

      expect(where).toHaveBeenCalledWith('status', '==', 'active');
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'asc');
      expect(limit).toHaveBeenCalledWith(5);
    });

    it('should use default ordering direction', async () => {
      const mockQuerySnapshot = { docs: [] };

      vi.mocked(collection).mockReturnValue({} as any);
      vi.mocked(query).mockReturnValue({} as any);
      vi.mocked(where).mockReturnValue({} as any);
      vi.mocked(orderBy).mockReturnValue({} as any);
      vi.mocked(getDocs).mockResolvedValue(mockQuerySnapshot as any);

      await firestore.findMany(
        'test-collection',
        'status',
        'active',
        undefined,
        'createdAt'
      );

      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });
  });

  describe('Static methods', () => {
    describe('timestamp', () => {
      it('should return Firestore Timestamp class', () => {
        const result = Firestore.timestamp();
        expect(result).toBe(FirestoreTimestamp);
      });
    });

    describe('now', () => {
      it('should return current timestamp', () => {
        const mockTimestamp = { seconds: 1640995200, nanoseconds: 0 };
        vi.mocked(FirestoreTimestamp.now).mockReturnValue(mockTimestamp as any);

        const result = Firestore.now();
        expect(result).toBe(mockTimestamp);
        expect(FirestoreTimestamp.now).toHaveBeenCalled();
      });
    });
  });

  describe('Data sanitization', () => {
    it('should handle deeply nested objects', async () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              value: undefined,
              array: [1, undefined, { nested: undefined }]
            }
          },
          undefinedValue: undefined
        },
        array: [
          { item: 1, undefined: undefined },
          undefined,
          'string'
        ]
      };

      const mockDocRef = { id: 'test-id' };
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(setDoc).mockResolvedValue(undefined);

      await firestore.create('test-collection', complexData, 'test-id');

      expect(setDoc).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          level1: {
            level2: {
              level3: {
                value: null,
                array: [1, null, { nested: null }]
              }
            },
            undefinedValue: null
          },
          array: [
            { item: 1, undefined: null },
            null,
            'string'
          ]
        })
      );
    });

    it('should not modify non-object, non-array values', async () => {
      const data = {
        string: 'test',
        number: 42,
        boolean: true,
        nullValue: null,
        date: new Date('2024-01-01'),
        timestamp: FirestoreTimestamp.now()
      };

      const mockDocRef = { id: 'test-id' };
      vi.mocked(doc).mockReturnValue(mockDocRef as any);
      vi.mocked(setDoc).mockResolvedValue(undefined);

      await firestore.create('test-collection', data, 'test-id');

      const setDocCall = vi.mocked(setDoc).mock.calls[0][1];
      expect(setDocCall).toMatchObject({
        string: 'test',
        number: 42,
        boolean: true,
        nullValue: null,
        date: data.date,
        timestamp: data.timestamp
      });
    });
  });
});