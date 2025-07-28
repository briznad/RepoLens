import type { Firestore as FirestoreType } from 'firebase/firestore';

import type { RepoData, AnalysisResult } from '../types';
import type { StoredRepository, StoredRepositoryFirestore } from '$types/repository';

import { getFirestore, doc, getDocs, getDoc, collection, query, where, orderBy, limit, setDoc, updateDoc, Timestamp as FirestoreTimestamp } from 'firebase/firestore';

import { firebase } from '$services/firebase';


class Firestore {
	private db : FirestoreType;


	constructor() {
		this.db = getFirestore(firebase.app);
	}



	// Repository-related methods
	private readonly REPOSITORIES_COLLECTION = 'repositories';

	/**
	 * Generate a repository ID from owner and name
	 * Uses double dash separator instead of forward slash to avoid Firestore path issues
	 */
	generateRepoId(owner: string, name: string): string {
		return `${owner}--${name}`.toLowerCase();
	}

	/**
	 * Parse a repository ID back to owner and name
	 */
	parseRepoId(repoId: string): { owner: string; name: string } {
		const [owner, name] = repoId.split('--');
		if (!owner || !name) {
			throw new Error(`Invalid repository ID format: ${repoId}`);
		}
		return { owner, name };
	}

	/**
	 * Check if a repository exists and is fresh
	 */
	async checkRepository(owner: string, name: string): Promise<StoredRepository | null> {
		const repoId = this.generateRepoId(owner, name);
		const docRef = doc(this.db, this.REPOSITORIES_COLLECTION, repoId);

		try {
			const docSnap = await getDoc(docRef);

			if (!docSnap.exists()) {
				return null;
			}

			const data = docSnap.data() as StoredRepositoryFirestore;
			return {
				id: repoId,
				...data,
				createdAt: data.createdAt.toDate(),
				updatedAt: data.updatedAt.toDate(),
				lastAnalyzed: data.lastAnalyzed.toDate()
			} as StoredRepository;
		} catch (error) {
			console.error(`Something went wrong when attempting to check repository ${repoId}:`, error);
			return null;
		}
	}

	/**
	 * Store a new repository analysis
	 */
	async storeRepository(
		owner: string,
		name: string,
		repoData: RepoData,
		analysisResult: AnalysisResult,
		status: 'analyzing' | 'completed' | 'failed' = 'completed',
		error?: string
	): Promise<string> {
		const repoId = this.generateRepoId(owner, name);
		const now = FirestoreTimestamp.now();

		const storedRepo: StoredRepositoryFirestore = {
			owner,
			name,
			fullName: repoData.full_name,
			url: repoData.html_url,
			description: repoData.description,
			language: repoData.language,
			stars: repoData.stargazers_count,
			forks: repoData.forks_count,
			createdAt: FirestoreTimestamp.fromDate(new Date(repoData.created_at)),
			updatedAt: FirestoreTimestamp.fromDate(new Date(repoData.updated_at)),
			lastAnalyzed: now,
			analysisVersion: '1.0.0',
			data: analysisResult,
			status,
			error
		};

		const docRef = doc(this.db, this.REPOSITORIES_COLLECTION, repoId);

		try {
			await setDoc(docRef, storedRepo);
			return repoId;
		} catch (error) {
			console.error(`Something went wrong when attempting to store repository ${repoId}:`, error);
			throw error;
		}
	}

	/**
	 * Update repository status
	 */
	async updateRepositoryStatus(
		repoId: string,
		status: 'analyzing' | 'completed' | 'failed',
		error?: string
	): Promise<void> {
		const docRef = doc(this.db, this.REPOSITORIES_COLLECTION, repoId);
		const updates: any = {
			status,
			lastAnalyzed: FirestoreTimestamp.now()
		};

		if (error) {
			updates.error = error;
		}

		try {
			await updateDoc(docRef, updates);
		} catch (updateError) {
			console.error(`Something went wrong when attempting to update repository status for ${repoId}:`, updateError);
			throw updateError;
		}
	}

	/**
	 * Get recent repositories
	 */
	async getRecentRepositories(limitCount: number = 10): Promise<StoredRepository[]> {
		const q = query(
			collection(this.db, this.REPOSITORIES_COLLECTION),
			where('status', '==', 'completed'),
			orderBy('lastAnalyzed', 'desc'),
			limit(limitCount)
		);

		try {
			const querySnapshot = await getDocs(q);
			return querySnapshot.docs.map(doc => {
				const data = doc.data() as StoredRepositoryFirestore;
				return {
					id: doc.id,
					...data,
					createdAt: data.createdAt.toDate(),
					updatedAt: data.updatedAt.toDate(),
					lastAnalyzed: data.lastAnalyzed.toDate()
				} as StoredRepository;
			});
		} catch (error) {
			console.error('Something went wrong when attempting to get recent repositories:', error);
			return [];
		}
	}

	/**
	 * Check if repository needs refresh (older than 24 hours)
	 */
	isRepositoryStale(repo: StoredRepository): boolean {
		const oneDayAgo = new Date();
		oneDayAgo.setDate(oneDayAgo.getDate() - 1);
		return repo.lastAnalyzed < oneDayAgo;
	}
}

export const firestore = new Firestore();
