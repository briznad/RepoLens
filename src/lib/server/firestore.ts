import type { Firestore, CollectionReference, Query, QuerySnapshot } from 'firebase-admin/firestore';

import type { VectorQuery, VectorQuerySnapshot } from '@google-cloud/firestore';

import type { ListOrRecipe } from '$types/list-or-recipe';
import type { Recipe } from '$types/recipe';

import { serverFirebase } from '$lib/server/firebase';

import { browser } from '$app/environment';


type WhereQuery = [ string, FirebaseFirestore.WhereFilterOp, string | number | boolean ];


class ServerFirestore {
	private db! : Firestore;


	constructor() {
		if (browser) {
			console.error('server Firestore module not available in browser context');

			return;
		}

		this.init();
	}


	private async init() : Promise<void> {
		if (this.db) {
			console.info('server Firestore module already initialized');

			return;
		}

		this.db = await serverFirebase.firestorePromise;

		if (!this.db) {
			console.error('failed to initialize server Firestore');

			return;
		}

		console.info('server Firestore initialized');
	}

	private async publicPreamble() : Promise<void> {
		if (!this.db) {
			await this.init();
		}
	}

	public async getSimilarRecipes(queryVector : any, limit = 20) : Promise<Recipe[]> {
		await this.publicPreamble();

		const collectionRef = this.db.collection('recipes');

		const vectorQuery : VectorQuery = collectionRef.findNearest({
			limit,
			queryVector,
			vectorField     : 'embedding',
			distanceMeasure : 'DOT_PRODUCT'
		});

		const vectorQuerySnapshot : VectorQuerySnapshot = await vectorQuery.get();

		const recipes : Recipe[] = [];

		vectorQuerySnapshot.forEach(doc => {
			recipes.push(doc.data() as Recipe);
		});

		return recipes;
	}

	private getColRef(collection : 'users' | 'lists' | 'recipes') : CollectionReference {
		return this.db.collection(collection);
	}

	private getColQuery(collection : 'users' | 'lists' | 'recipes', queryArg? : WhereQuery | WhereQuery[]) : CollectionReference | Query {
		const queries : WhereQuery[] = typeof queryArg?.[0] === 'string'
			? [ (queryArg as WhereQuery) ]
			: [ ...((queryArg as WhereQuery[]) ?? []) ];

		let query : CollectionReference | Query = this.getColRef(collection);

		if (queries && queries.length) {
			for (const whereQuery of queries) {
				query = query.where(...whereQuery);
			}
		}

		return query;
	}

	private getColSnap(collection : 'users' | 'lists' | 'recipes', queryArg? : WhereQuery | WhereQuery[]) : Promise<QuerySnapshot> {
		return this.getColQuery(collection, queryArg).get();
	}

	private getDocsFromQuerySnap<T>(snap : QuerySnapshot) : T[] {
		const docs : T[] = [];

		if (snap.empty) {
			console.log(`No matching documents.`);

			return docs;
		}

		snap.forEach((doc : FirebaseFirestore.QueryDocumentSnapshot) => {
			docs.push(doc.data() as T);
		});

		return docs;
	}

	private async getDocs<T>(collection : 'users' | 'lists' | 'recipes', queryArg? : WhereQuery | WhereQuery[]) : Promise<T[]> {
		const snap = await this.getColSnap(collection, queryArg);

		return this.getDocsFromQuerySnap<T>(snap);
	}

	private getDocRef(collection : 'users' | 'lists' | 'recipes', id : string) : FirebaseFirestore.DocumentReference {
		return this.getColRef(collection)
			.doc(id);
	}

	private getDocSnap(collection : 'users' | 'lists' | 'recipes', id : string) : Promise<FirebaseFirestore.DocumentSnapshot> {
		return this.getDocRef(collection, id).get();
	}

	private async getDoc<T>(collection : 'users' | 'lists' | 'recipes', docId : string) : Promise<null | T> {
		const snapshot = await this.getDocSnap(collection, docId);

		if (!snapshot.exists) {
			console.error(`No matching ${collection} document!`);

			return null;
		}

		return (snapshot.data() as T) ?? null;
	}

	public async deleteDoc(collection : 'users' | 'lists' | 'recipes', docId : string) : Promise<boolean> {
		await this.publicPreamble();

		try {
			// first, delete user document
			await this.getDocRef('users', docId).delete();

			return true;
		} catch (error) {
			console.error(`an error occurred when deleting doc: ${collection}/${docId}:`, error);

			return false;
		}
	}


	public async deleteUser(uid : string) : Promise<boolean> {
		await this.publicPreamble();

		try {
			// first, delete user document
			await this.deleteDoc('users', uid);

			let cumulativeResult : boolean = true;

			for (const collection of ['lists', 'recipes']) {
				const result = await this.removeUserFromDocs(uid, collection as 'lists' | 'recipes');

				cumulativeResult = cumulativeResult && result;
			}

			return cumulativeResult;
		} catch (error) {
			console.error(`an error occurred when deleting user ${uid}:`, error);

			return false;
		}
	}

	private async removeUserFromDocs(uid : string, collection : 'lists' | 'recipes') : Promise<boolean> {
		const userDocsQueryRef = this.getColQuery(collection, ["viewers", "array-contains", uid]);

		try {
			// then, delete all user-related documents
			return await this.db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
				const querySnap = await transaction.get(userDocsQueryRef);

				if (querySnap.empty) {
					console.info(`user ${uid} lacks viewing access to any ${collection} documents.`);

					return true;
				}

				querySnap.forEach((doc : FirebaseFirestore.QueryDocumentSnapshot) => {
					const data = <ListOrRecipe>doc.data();

					const updatedViewers = (data.viewers ?? [])
						.filter((viewerUid : string) => viewerUid !== uid);

					if (updatedViewers.length === 0) {
						// if no viewers left, delete the document
						transaction.delete(doc.ref);
					} else {
						const updatedEditors = (data.editors ?? [])
							.filter((editorUid : string) => editorUid !== uid);

						transaction.update(doc.ref, {
							viewers: updatedViewers,
							editors: updatedEditors,
						});
					}
				});

				return true;
			});
		} catch (error) {
			console.log('transaction failure:', error);

			return false;
		}
	}
}

export const serverFirestore = new ServerFirestore();
