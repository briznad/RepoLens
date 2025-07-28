import type { Firestore as FirestoreType } from 'firebase/firestore';

import { 
  getFirestore, 
  doc, 
  getDoc,
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp as FirestoreTimestamp,
  QueryConstraint
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { createId } from 'briznads-helpers';

import { firebase } from '$services/firebase';

/**
 * Generic Firestore service providing CRUD operations for any collection
 */
class Firestore {
	private db : FirestoreType;

	constructor() {
		this.db = getFirestore(firebase.app);
	}

	/**
	 * Create a new document with auto-generated ID
	 */
	async create<T extends DocumentData>(
		collectionName: string, 
		data: T, 
		customId?: string
	): Promise<string> {
		const docId = customId || createId('lowercase', 9);
		const docRef = doc(this.db, collectionName, docId);

		try {
			await setDoc(docRef, {
				...data,
				createdAt: FirestoreTimestamp.now(),
				updatedAt: FirestoreTimestamp.now()
			});
			return docId;
		} catch (error) {
			console.error(`Error creating document in ${collectionName}:`, error);
			throw error;
		}
	}

	/**
	 * Get a document by ID
	 */
	async getById<T extends DocumentData>(
		collectionName: string, 
		docId: string
	): Promise<T | null> {
		const docRef = doc(this.db, collectionName, docId);

		try {
			const docSnap = await getDoc(docRef);
			
			if (!docSnap.exists()) {
				return null;
			}

			return {
				id: docSnap.id,
				...docSnap.data()
			} as unknown as T;
		} catch (error) {
			console.error(`Error getting document ${docId} from ${collectionName}:`, error);
			return null;
		}
	}

	/**
	 * Update a document by ID
	 */
	async update<T extends Partial<DocumentData>>(
		collectionName: string, 
		docId: string, 
		updates: T
	): Promise<void> {
		const docRef = doc(this.db, collectionName, docId);

		try {
			await updateDoc(docRef, {
				...updates,
				updatedAt: FirestoreTimestamp.now()
			});
		} catch (error) {
			console.error(`Error updating document ${docId} in ${collectionName}:`, error);
			throw error;
		}
	}

	/**
	 * Delete a document by ID
	 */
	async delete(collectionName: string, docId: string): Promise<void> {
		const docRef = doc(this.db, collectionName, docId);

		try {
			await deleteDoc(docRef);
		} catch (error) {
			console.error(`Error deleting document ${docId} from ${collectionName}:`, error);
			throw error;
		}
	}

	/**
	 * Query documents with filters
	 */
	async query<T extends DocumentData>(
		collectionName: string,
		constraints: QueryConstraint[] = []
	): Promise<T[]> {
		const q = query(collection(this.db, collectionName), ...constraints);

		try {
			const querySnapshot = await getDocs(q);
			return querySnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			} as unknown as T));
		} catch (error) {
			console.error(`Error querying ${collectionName}:`, error);
			return [];
		}
	}

	/**
	 * Find first document matching conditions
	 */
	async findOne<T extends DocumentData>(
		collectionName: string,
		field: string,
		value: any
	): Promise<T | null> {
		const q = query(
			collection(this.db, collectionName),
			where(field, '==', value),
			limit(1)
		);

		try {
			const querySnapshot = await getDocs(q);
			
			if (querySnapshot.empty) {
				return null;
			}

			const doc = querySnapshot.docs[0];
			return {
				id: doc.id,
				...doc.data()
			} as unknown as T;
		} catch (error) {
			console.error(`Error finding document in ${collectionName}:`, error);
			return null;
		}
	}

	/**
	 * Find multiple documents matching conditions
	 */
	async findMany<T extends DocumentData>(
		collectionName: string,
		field: string,
		value: any,
		limitCount?: number,
		orderByField?: string,
		orderDirection: 'asc' | 'desc' = 'desc'
	): Promise<T[]> {
		const constraints: QueryConstraint[] = [where(field, '==', value)];
		
		if (orderByField) {
			constraints.push(orderBy(orderByField, orderDirection));
		}
		
		if (limitCount) {
			constraints.push(limit(limitCount));
		}

		return this.query<T>(collectionName, constraints);
	}

	/**
	 * Get Firestore Timestamp utility
	 */
	static timestamp() {
		return FirestoreTimestamp;
	}

	/**
	 * Get current timestamp
	 */
	static now() {
		return FirestoreTimestamp.now();
	}
}

export const firestore = new Firestore();
