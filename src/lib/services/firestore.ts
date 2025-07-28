import type { Firestore as FirestoreType, CollectionReference, DocumentData, Query, QuerySnapshot, Unsubscribe, DocumentSnapshot, Transaction, DocumentReference, QueryDocumentSnapshot, WhereFilterOp } from 'firebase/firestore';

import type { AnyMap } from 'briznads-helpers';

import type { User, Settings, EmailNotifications } from '$types/user';
import type { List, ListItem, ListItemMap, ListRecipe } from '$types/list';
import type { Recipe, PartialRecipe } from '$types/recipe';
import type { Item, PartialItem, ItemMap } from '$types/item';
import type { Mail, Message } from '$types/mail';
import type { Share, Collaborator } from '$types/share';

import { getFirestore, doc, getDocs, getDoc, runTransaction, collection, query, where, orderBy, limit, onSnapshot, setDoc, updateDoc, deleteDoc, getCountFromServer } from 'firebase/firestore';

import { createId, objectEntries, objectValues, smartSort } from 'briznads-helpers';

import { PUBLIC_USE_AI_PARSER } from '$env/static/public';

import { callApi } from '$utilities/helper';

import { parseItemsWithAi } from "$utilities/parse-items";

import { firebase } from '$services/firebase';


// firestore allows updating individual properties within a map by using dot notation when specifying the key
// https://firebase.google.com/docs/firestore/manage-data/add-data#update_fields_in_nested_objects
// we must create a new type that extends Recipe to include the additional properties that we want to update
interface RecipeUpdate extends Partial<Recipe> {
	'order.added'        : string[];
	'order.alphabetical' : string[];
	'order.custom'?      : string[];
}

type UserUpdate = Partial<Pick<User, "displayName">>;

type QueryOrCollectionRef =
	| CollectionReference<DocumentData, DocumentData>
	| Query<DocumentData, DocumentData>
	;

type NewDocument = {
	title  : string;
	items? : PartialItem[];
}

type NewList = Partial<List> & NewDocument;

type NewRecipe = PartialRecipe & NewDocument;

type NewListOrRecipe = NewList | NewRecipe;


class Firestore {
	private db : FirestoreType;


	constructor() {
		this.db = getFirestore(firebase.app);
	}


	async getUserById(userId : string) : Promise<User | null> {
		if (!userId) {
			console.error('User ID is required');

			return null;
		}

		const docRef = doc(this.db, 'users', userId);

		try {
			const docSnapshot = await getDoc(docRef);

			if (!docSnapshot.exists()) {
				return null;
			}

			return docSnapshot.data() as User;
		} catch (error) {
			console.error(`Something went wrong when attempting to retrieve user by ID ${ userId }:`, error);

			return null;
		}
	}

	async getUserEmailNotifications(userId : string) : Promise<null | EmailNotifications> {
		if (!userId) {
			console.error('User ID is required to get email notifications');

			return null;
		}

		try {
			const user = await this.getUserById(userId);

			if (!user) {
				console.error(`User with ID ${ userId } not found`);

				return null;
			}

			return user.emailNotifications ?? null;
		} catch (error) {
			console.error(`Something went wrong when attempting to retrieve email notifications for user ${ userId }:`, error);

			return null;
		}
	}

	async getUserByEmail(email : string) : Promise<User | null> {
		if (!email) {
			console.error('Email is required');

			return null;
		}

		const colRef = collection(this.db, 'users');

		const q = query(colRef, where('email', '==', email), limit(1));

		try {
			const querySnapshot = await getDocs(q);

			if (querySnapshot.empty) {
				return null;
			}

			const doc = querySnapshot.docs[0];

			return doc.data() as User;
		} catch (error) {
			console.error(`Something went wrong when attempting to retrieve user by email ${ email }:`, error);

			return null;
		}
	}

	getUserReactive(id : string, callback : (doc : null | User) => void) : Unsubscribe {
		const docRef = doc(this.db, 'users', id);

		return onSnapshot(docRef, (docSnapshot : DocumentSnapshot) : void => {
			const doc : null | User = docSnapshot.exists()
				? docSnapshot.data() as User
				: null;

			callback(doc);
		});
	}

	async upsertUser(user : any) : Promise<boolean> {
		const id = user.uid;

		const docRef = doc(this.db, 'users', id);

		try {
			await runTransaction(this.db, async (transaction) => {
				const docSnapshot = await transaction.get(docRef);

				const timestamp = new Date().toISOString();

				let partialData : Partial<User> = {
					updatedAt     : timestamp,
					updatedBy     : id,
					email         : user.email,
					emailVerified : user.emailVerified ?? false,
					provider      : user.providerData?.[0]?.providerId ?? 'unknown',
				};

				if (user.displayName) {
					partialData.displayNameExternal = user.displayName;
				}

				if (user.photoURL) {
					partialData.imageUrl = user.photoURL;
				}

				if (docSnapshot.exists()) {
					transaction.update(docRef, partialData);
				} else {
					const parsedUser = <User>{
						...partialData,
						id,
						createdAt : timestamp,
						createdBy : id,
						settings  : {
							showTips          : true,
							showAbbreviations : true,
							showFractions     : true,
						},
						emailNotifications : {
							shareInvitation : true,
						},
					};

					transaction.set(docRef, parsedUser);
				}
			});
		} catch (error) {
			console.error('Something went wrong when attempting to upsert user:', error);

			return false;
		}

		return true;
	}

	async updateUser(userId : string, updates : UserUpdate) : Promise<boolean> {
		const docRef = doc(this.db, 'users', userId);

		const updatePayload : Partial<User> = {
			...updates,
			updatedAt : new Date().toISOString(),
			updatedBy : userId,
		};

		try {
			await updateDoc(docRef, updatePayload);
		} catch (error) {
			console.error(`Something went wrong when attempting to update user ${ userId }:`, error);

			return false;
		}

		return true;
	}

	async getUserDocumentCount(userId : string, type : 'list' | 'recipe', status : 'creator' | 'viewer' = 'creator') : Promise<null | number> {
		let colRef : QueryOrCollectionRef = collection(this.db, type + 's');

		let equalityParams : [string, WhereFilterOp] = ['', '=='];

		if (status === 'creator') {
			equalityParams[0] = "createdBy";
		} else if (status === 'viewer') {
			equalityParams = ["viewers", "array-contains"];
		}

		const queryRef = query(colRef, where(...equalityParams, userId));

		try {
			const snapshot = await getCountFromServer(queryRef);

			return snapshot?.data()?.count ?? null;
		} catch (error) {
			console.error(`Something went wrong when attempting to retrieve user document counts from server for user ${ userId }:`, error);

			return null;
		}
	}

	async updateSettingsOrEmailNotifications<T>(type : 'settings' | 'emailNotifications', userId : string, updates : Partial<T>) : Promise<boolean> {
		const docRef = doc(this.db, 'users', userId);

		const updatePayload : any = {
			updatedAt : new Date().toISOString(),
			updatedBy : userId,
		};

		for (const [ key, value ] of objectEntries(updates)) {
			updatePayload[ `${ type }.${ key.toString() }` ] = value;
		}

		try {
			await updateDoc(docRef, updatePayload);
		} catch (error) {
			console.error(`Something went wrong when attempting to update ${ type } for user ${ userId }:`, error);

			return false;
		}

		return true;
	}

	async updateSettings(userId : string, updates : Partial<Settings>) : Promise<boolean> {
		return this.updateSettingsOrEmailNotifications<Settings>('settings', userId, updates);
	}

	async updateEmailNotifications(userId : string, updates : Partial<EmailNotifications>) : Promise<boolean> {
		return this.updateSettingsOrEmailNotifications<EmailNotifications>('emailNotifications', userId, updates);
	}

	async getListOrRecipe<T>(userId : string, type : 'list' | 'recipe', id : string) : Promise<T | null> {
		if (!userId) {
			console.error('userId is required to get list or recipe');

			return null;
		}

		const query = this.getListsOrRecipesQuery(userId, type, undefined, undefined, id);

		const querySnapshot = await getDocs(query);

		return this.getListOrRecipeFromSnapshot<T>(querySnapshot);
	}

	getListOrRecipeReactive<T>(userId : string, type : 'list' | 'recipe', id : string, callback : (doc : null | T) => void) : Unsubscribe {
		if (!userId) {
			console.error('userId is required to get list or recipe');

			return () => {};
		}

		const q = this.getListsOrRecipesQuery(userId, type, 1, false, id);

		return onSnapshot(q, (querySnapshot : QuerySnapshot<DocumentData, DocumentData>) => {
			const item = this.getListOrRecipeFromSnapshot<T>(querySnapshot);

			callback(item);
		});
	}

	getListsOrRecipesReactive<T>(userId : string, type : 'list' | 'recipe', callback : (documents : T[]) => void, limitDocuments? : number, sortByUpdated = true) : Unsubscribe {
		if (!userId) {
			console.error('userId is required to get lists or recipes');

			return () => {};
		}

		const q = this.getListsOrRecipesQuery(userId, type, limitDocuments, sortByUpdated);

		return onSnapshot(q, (querySnapshot : QuerySnapshot<DocumentData, DocumentData>) => {
			const items : T[] = this.getListsOrRecipesFromSnapshot<T>(querySnapshot);

			callback(items);
		});
	}

	private getListsOrRecipesQuery(userId : string, type : 'list' | 'recipe', limitDocuments? : number, sortByUpdated = true, id? : string) : QueryOrCollectionRef {
		let queryRef : QueryOrCollectionRef = collection(this.db, type + 's');

		let localLimit = limitDocuments;

		const queryParameters : any[] = [];

		if (id) {
			queryParameters.push(where("id", "==", id));

			localLimit = 1; // if id is provided, we only want to return one document
		}

		// only return lists or recipes that the user has access to
		queryParameters.push(where("viewers", "array-contains", userId));

		if (sortByUpdated && !id) {
			queryParameters.push(orderBy('updatedAt', 'desc'));
		}

		if (localLimit != null) {
			queryParameters.push(limit(localLimit));
		}

		queryRef = query(queryRef, ...queryParameters);

		return queryRef;
	}

	private getListsOrRecipesFromSnapshot<T>(querySnapshot : QuerySnapshot<DocumentData, DocumentData>) : T[] {
		const docs : QueryDocumentSnapshot<DocumentData, DocumentData>[] = querySnapshot.docs;

		const items : T[] = docs
			.map((doc) => doc.data() as T);

		return items;
	}

	private getListOrRecipeFromSnapshot<T>(querySnapshot : QuerySnapshot<DocumentData, DocumentData>) : T | null {
		return this.getListsOrRecipesFromSnapshot<T>(querySnapshot)[0] ?? null;
	}

	async createListOrRecipe(type : 'list' | 'recipe', userId : string, partialDocument : NewListOrRecipe) : Promise<List | Recipe | null> {
		const id = createId('lowercase', 8);

		const docRef = doc(this.db, type + 's', id);

		const timestamp = new Date().toISOString();

		let parsedItemsPayload = {};

		if (partialDocument.items) {
			parsedItemsPayload = this.parseItems(partialDocument.items, userId, timestamp, 'create');

			delete partialDocument.items;
		}

		let document : List | Recipe = {
			...partialDocument,
			id,
			createdAt : timestamp,
			createdBy : userId,
			viewers	: [ userId ],
			editors	: [ userId ],
			updatedAt : timestamp,
			updatedBy : userId,
			order     : {
				added        : [],
				alphabetical : [],
			},
			...parsedItemsPayload,
		};

		try {
			await setDoc(docRef, document);

			return document;
		} catch (error) {
			console.error(`Something went wrong when attempting to create ${ type }:`, error);
		}

		return null;
	}

	async updateListOrRecipe(type : 'list' | 'recipe', id : string, userId : string, updates : Partial<List | RecipeUpdate>) : Promise<boolean> {
		const docRef = doc(this.db, type + 's', id);

		const updatePayload = {
			...updates,
			updatedAt : new Date().toISOString(),
			updatedBy : userId,
		};

		try {
			await updateDoc(docRef, updatePayload);
		} catch (error) {
			console.error(`Something went wrong when attempting to update ${ type } with id ${ id }:`, error);

			return false;
		}

		return true;
	}

	async toggleDocumentCollaborator(type : 'list' | 'recipe', id : string, userId : string, add : boolean = true) : Promise<boolean> {
		const docRef = doc(this.db, type + 's', id);

		try {
			await runTransaction(this.db, async (transaction) => {
				const docData = await this.getTransactionDocData(transaction, docRef, type);

				let { viewers, editors } = docData;

				if (add) {
					if (!viewers.includes(userId)) {
						viewers.push(userId);
					}

					if (!editors.includes(userId)) {
						editors.push(userId);
					}
				} else {
					viewers = viewers.filter((viewerId : string) => viewerId !== userId);
					editors = editors.filter((editorId : string) => editorId !== userId);
				}

				const updatePayload : any = {
					viewers,
					editors,
					updatedBy : userId,
					updatedAt : new Date().toISOString(),
				};

				transaction.update(docRef, updatePayload);
			});
		} catch (error) {
			console.error(`Something went wrong when attempting to ${ add ? 'add' : 'remove' } ${ type } collaborator:`, error);

			return false;
		}

		return true;
	}

	async addUserCollaborator(inviterId : string, inviteeId : string) : Promise<boolean> {
		const type = 'user';

		const docRef = doc(this.db, type + 's', inviterId);

		try {
			await runTransaction(this.db, async (transaction) => {
				const docData = await this.getTransactionDocData(transaction, docRef, type);

				let { collaborators = {} } = docData;

				const timestamp = new Date().toISOString();

				collaborators[ inviteeId ] = timestamp;

				const updatePayload : any = {
					collaborators,
					updatedBy : inviteeId,
					updatedAt : timestamp,
				};

				transaction.update(docRef, updatePayload);
			});
		} catch (error) {
			console.error(`Something went wrong when attempting to add ${ inviteeId } to the collaborators list of ${ inviterId }: `, error);

			return false;
		}

		return true;
	}

	async deleteListOrRecipe(type : 'list' | 'recipe', id : string) : Promise<boolean> {
		const docRef = doc(this.db, type + 's', id);

		try {
			await deleteDoc(docRef);
		} catch (error) {
			console.error(`Something went wrong when attempting to delete ${ type } with id ${ id }:`, error);

			return false;
		}

		return true;
	}

	async updateItems(type : 'list' | 'recipe', docId : string, userId : string, updates : PartialItem[]) : Promise<boolean> {
		const docRef = doc(this.db, type + 's', docId);

		try {
			await runTransaction(this.db, async (transaction) => {
				const docData = await this.getTransactionDocData(transaction, docRef, type);

				const { itemMap } = docData;

				if (!itemMap) {
					throw 'item map can not be empty!';
				}

				const timestamp = new Date().toISOString();

				const updatePayload : any = {
					updatedAt : timestamp,
					updatedBy : userId,
				};

				for (const update of updates) {
					if (!update.id) {
						console.error('item id is required to update item:', update);

						continue;
					}

					const existingItem : Item = itemMap[ update.id ];

					if (existingItem === undefined) {
						console.error('item does not exist in item map:', update);

						continue;
					}

					const item : Item = {
						...existingItem,
						...update,
						updatedAt : timestamp,
						updatedBy : userId,
					};

					updatePayload[ 'itemMap.' + item.id ] = item;

					itemMap[ item.id ] = item;
				}

				updatePayload[ 'order.alphabetical' ] = this.parseOrderAlphabetical(objectValues(itemMap));

				transaction.update(docRef, updatePayload);
			});
		} catch (error) {
			console.error(`Something went wrong when attempting to update ${ type } items:`, error);

			return false;
		}

		return true;
	}

	async updateItem(type : 'list' | 'recipe', docId : string, itemId : string, userId : string, updates : PartialItem) : Promise<boolean> {
		const docRef = doc(this.db, type + 's', docId);

		let updatePayload : AnyMap = {};

		let shouldAiParse = false;

		try {
			await runTransaction(this.db, async (transaction) => {
				const docData = await this.getTransactionDocData(transaction, docRef, type);

				const { itemMap } = docData;

				const existingItem : Item = itemMap?.[ itemId ];

				if (existingItem === undefined) {
					throw 'item does not exist!';
				}

				const timestamp = new Date().toISOString();

				const item : Item = {
					...existingItem,
					...updates,
					updatedAt : timestamp,
					updatedBy : userId,
				};

				updatePayload = {
					updatedAt               : timestamp,
					updatedBy               : userId,
					[ 'itemMap.' + itemId ] : item,
				};

				itemMap[ itemId ] = item;

				if ('description' in updates) {
					updatePayload[ 'order.alphabetical' ] = this.parseOrderAlphabetical(objectValues(itemMap));
				}

				if (!existingItem.aiParsed) {
					shouldAiParse = true;
				}

				transaction.update(docRef, updatePayload);
			});
		} catch (error) {
			console.error(`Something went wrong when attempting to update ${ type } item:`, error);

			return false;
		}

		if (shouldAiParse) {
			this.aiParseItems(type, docId, userId, updatePayload, false);
		}

		return true;
	}

	private async getTransactionDocData(transaction : Transaction, docRef : DocumentReference, type : 'list' | 'recipe' | 'user') : Promise<DocumentData> {
		const doc = await transaction.get(docRef);

		if (!doc.exists()) {
			throw `${ type } does not exist!`;
		}

		return doc.data();
	}

	async addItems(type : 'list' | 'recipe', docId : string, userId : string, partialItems : PartialItem[]) : Promise<boolean> {
		const docRef = doc(this.db, type + 's', docId);

		let updatePayload : AnyMap = {};

		try {
			await runTransaction(this.db, async (transaction) => {
				const docData = await this.getTransactionDocData(transaction, docRef, type);

				const timestamp = new Date().toISOString();

				updatePayload = {
					updatedAt : timestamp,
					updatedBy : userId,
					...this.parseItems(partialItems, userId, timestamp, 'update', docData),
				};

				transaction.update(docRef, updatePayload);
			});
		} catch (error) {
			console.error(`Something went wrong when attempting to add item${ partialItems.length === 1 ? '' : 's' } to ${ type }:`, error);

			return false;
		}

		this.aiParseItems(type, docId, userId, updatePayload);

		return true;
	}

	private parseItems(
		partialItems : PartialItem[] | Item[],
		userId : string,
		timestamp : string,
		documentOperation : 'create' | 'update',
		docData? : DocumentData,
		recipeId? : string,
	) : AnyMap {
		const itemMap : ItemMap | ListItemMap = {};

		const items : Item[] | ListItem[] = partialItems.map((partialItem : PartialItem) => {
			const id = recipeId
				? partialItem.id
				: createId('lowercase', 8);

			const item = recipeId
				? <ListItem>{
					...partialItem,
					recipe : recipeId,
					checked : false,
				}
				: <Item>{
					...partialItem,
					id,
					createdAt : timestamp,
					createdBy : userId,
				};

			item.updatedAt = timestamp;
			item.updatedBy = userId;

			itemMap[ `${ documentOperation === 'update' ? 'itemMap.' : '' }${ id }` ] = item;

			return item;
		});

		const orderAdded = this.parseOrderAdded(
			docData?.order?.added ?? [],
			this.getItemIds(items),
		);

		const orderAlphabetical = this.parseOrderAlphabetical(
			Object.values(docData?.itemMap ?? {}),
			items,
		);

		return documentOperation === 'update'
			? {
				...itemMap,
				'order.added'        : orderAdded,
				'order.alphabetical' : orderAlphabetical,
			}
			: {
				itemMap,
				order : {
					added        : orderAdded,
					alphabetical : orderAlphabetical,
				},
			};
	}

	private parseOrderAdded(originalOrder : string[], newItems : string[]) : string[] {
		return originalOrder.concat(newItems);
	}

	private parseOrderAlphabetical(items : Item[], newItems : Item[] = []) : string[] {
		return this.getItemIds(smartSort(items.concat(newItems), { nestedValuePath : 'description' }));
	}

	private getItemIds(items : Item[]) : string[] {
		return items.map((item : Item) => item.id);
	}

	private async aiParseItems(
		type                 : 'list' | 'recipe',
		docId                : string,
		userId               : string,
		updatePayload        : AnyMap,
		omitPreviouslyParsed = true,
	) : Promise<void> {
		// only parse items if the AI parser is enabled via env var
		if ((PUBLIC_USE_AI_PARSER ?? '').trim().toLowerCase() !== 'true') {
			return;
		}

		let itemsToAiParse : Item[] = Object.keys(updatePayload ?? {})
			.filter((key : string) => key.startsWith('itemMap.'))
			.map((key : string) : Item => updatePayload[ key ]);

		if (omitPreviouslyParsed) {
			itemsToAiParse = itemsToAiParse
				.filter((item : Item) => !item.aiParsed);
		}

		if (itemsToAiParse.length === 0) {
			return;
		}

		let parsedItems : PartialItem[] = [];

		try {
			parsedItems = await parseItemsWithAi(itemsToAiParse);
		} catch (error) {
			console.error(`Something went wrong when attempting to parse ${ type } items using AI:`, error);

			return;
		}

		if (parsedItems.length === 0) {
			return;
		} else if (parsedItems.length !== itemsToAiParse.length) {
			console.info(`Number of items returned does not match number of items sent. This is unexpected.`);
		}

		// mark items as AI parsed
		parsedItems.forEach((item : PartialItem) => item.aiParsed = true);

		// update items with AI parsed info
		try {
			await this.updateItems(type, docId, userId, parsedItems);
		} catch (error) {
			console.error(`Something went wrong when attempting to update ${ type } items with AI parsed data:`, error);

			return;
		}
	}

	async deleteItem(type : 'list' | 'recipe', docId : string, itemId : string, userId : string) : Promise<boolean> {
		const docRef = doc(this.db, type + 's', docId);

		try {
			await runTransaction(this.db, async (transaction) => {
				const docData = await this.getTransactionDocData(transaction, docRef, type);

				const { itemMap } = docData;

				if (!(itemId in itemMap)) {
					throw 'item does not exist!';
				}

				delete itemMap[ itemId ];

				const timestamp = new Date().toISOString();

				const updatePayload = {
					itemMap,
					updatedAt            : timestamp,
					updatedBy            : userId,
					'order.added'        : this.removeIdFromOrder(docData.order.added, itemId),
					'order.alphabetical' : this.removeIdFromOrder(docData.order.alphabetical, itemId),
				};

				transaction.update(docRef, updatePayload);
			});
		} catch (error) {
			console.error(`Something went wrong when attempting to delete ${ type } item:`, error);

			return false;
		}

		return true;
	}

	private removeIdFromOrder(order : string[], id : string) : string[] {
		return order.filter((itemId) => itemId !== id);
	}

	public async addRecipeToList(recipeId : string, listId : string, userId : string) : Promise<boolean> {
		const docRef = doc(this.db, 'lists', listId);

		let success : boolean = false;

		try {
			await runTransaction(this.db, async (transaction) => {
				const docData = await this.getTransactionDocData(transaction, docRef, 'list');

				if (!docData) {
					throw 'could not retrieve list data';
				}

				if (docData.recipeMap?.[ recipeId ]) {
					console.error(`Recipe ${ recipeId } already exists in list ${ listId }:`);

					return;
				}

				let recipe : Recipe;

				try {
					const response = await this.getListOrRecipe<Recipe>(userId, 'recipe', recipeId);

					if (response === null) {
						return;
					}

					recipe = response;
				} catch (error) {
					console.error(`Something went wrong when attempting to retrieve recipe with id ${ recipeId }:`, error);

					return;
				}

				const timestamp = new Date().toISOString();

				const updatePayload : AnyMap = {
					updatedAt : timestamp,
					updatedBy : userId,
					...this.parseListRecipe(recipe, userId, timestamp, docData),
					...this.parseItems(objectValues(recipe.itemMap ?? {}), userId, timestamp, 'update', docData, recipe.id),
				};

				transaction.update(docRef, updatePayload);

				success = true;
			});
		} catch (error) {
			console.error(`Something went wrong when attempting to add recipe ${ recipeId } to list ${ listId }:`, error);
		}

		return success;
	}

	private parseListRecipe(
		recipe    : Recipe,
		userId    : string,
		timestamp : string,
		docData   : DocumentData,
	) : AnyMap {
		const id = recipe.id;

		const listRecipe : ListRecipe = {
			id,
			createdAt : recipe.createdAt,
			createdBy : recipe.createdBy,
			title     : recipe.title,
			updatedAt : timestamp,
			updatedBy : userId,
		};

		if (recipe.scale) {
			listRecipe.scale = recipe.scale;
		}

		if (recipe.servings) {
			listRecipe.servings = recipe.servings;
		}

		if (recipe.link) {
			listRecipe.link = recipe.link;
		}

		return docData.recipeMap
			? {
				[`recipeMap.${ id }`] : listRecipe,
			}
			: {
				recipeMap : {
					[id] : listRecipe,
				},
			};
	}

	public async sendMail(userId : string, to : string, message : Message) : Promise<boolean> {
		const id = createId('lowercase', 8);

		const docRef = doc(this.db, 'mail', id);

		const timestamp = new Date().toISOString();

		let document : Mail = {
			id,
			createdAt : timestamp,
			createdBy : userId,
			updatedAt : timestamp,
			updatedBy : userId,
			type			: 'share',
			to,
			message,
		};

		try {
			await setDoc(docRef, document);

			return true;
		} catch (error) {
			console.error(`Something went wrong when attempting to send mail: `, error);
		}

		return false;
	}

	public async getCollaboratorsByIds(collabIds : string[]) : Promise<Collaborator[]> {
		if (collabIds.length === 0) {
			return [];
		}

		const colRef = collection(this.db, 'users');

		const q = query(colRef, where('id', 'in', collabIds));

		try {
			const querySnapshot = await getDocs(q);

			return querySnapshot.docs
				.map((doc) => {
					const user = doc.data() as User

					return {
						id          : user.id,
						email       : user.email,
						displayName : user.displayName ?? user.displayNameExternal,
						imageUrl    : user.imageUrl,
						updatedAt   : '',
					};
				});
		} catch (error) {
			console.error(`Something went wrong when attempting to retrieve collaborators by ids:`, error);

			return [];
		}
	}

	async createShare(
		type : 'list' | 'recipe',
		documentId : string,
		documentTitle : string,
		hashedCode : string,
		userId : string,
		inviterEmail : string,
		inviteeEmail : string,
		inviterDisplayName? : string,
		inviteeId? : string,
		inviteeDisplayName? : string,
		invitersInviteeDisplayName? : string,
	) : Promise<boolean> {
		const id = createId('lowercase', 8);

		const timestamp = new Date().toISOString();

		const share : Share = {
			id,
			createdAt : timestamp,
			createdBy : userId,
			updatedAt : timestamp,
			updatedBy : userId,
			documentType : type,
			documentId,
			documentTitle,
			hashedCode,
			inviterEmail,
			inviteeEmail,
			inviterDisplayName : inviterDisplayName ?? null,
			inviteeId : inviteeId ?? null,
			inviteeDisplayName : inviteeDisplayName ?? null,
			invitersInviteeDisplayName : invitersInviteeDisplayName ?? null,
		};

		const docRef = doc(this.db, 'shares', id);

		try {
			await setDoc(docRef, share);

			return true;
		} catch (error) {
			console.error(`Something went wrong when attempting to create share:`, error);

			return false;
		}
	}

	getSharesByDocumentReactive(userId : string, documentId : string, callback : (documents : Share[]) => void) : Unsubscribe {
		if (!userId) {
			console.error('userId is required to get Shares by document');

			return () => {};
		}

		const q = this.getSharesQuery({ createdBy : userId, documentId });

		return onSnapshot(q, (querySnapshot : QuerySnapshot<DocumentData, DocumentData>) => {
			const items : Share[] = this.getSharesFromSnapshot(querySnapshot);

			callback(items);
		});
	}

	private getSharesQuery(opts : { createdBy? : string, documentId? : string, hashedCode? : string, inviteeId? : string }) : QueryOrCollectionRef {
		let queryRef : QueryOrCollectionRef = collection(this.db, 'shares');

		const queryParameters : any[] = [];

		for (const [ key, value ] of objectEntries(opts)) {
			if (value) {
				queryParameters.push(where(key, '==', value));
			}
		}

		queryRef = query(queryRef, ...queryParameters);

		return queryRef;
	}

	private getSharesFromSnapshot(querySnapshot : QuerySnapshot<DocumentData, DocumentData>) : Share[] {
		const docs : QueryDocumentSnapshot<DocumentData, DocumentData>[] = querySnapshot.docs;

		const items : Share[] = (docs ?? [])
			.map((doc) => doc.data() as Share);

		return items;
	}

	async removeShare(id : string) : Promise<boolean> {
		const docRef = doc(this.db, 'shares', id);

		try {
			await deleteDoc(docRef);
		} catch (error) {
			console.error(`Something went wrong when attempting to delete share with id ${ id }:`, error);

			return false;
		}

		return true;
	}

	getShareByHashedCodeReactive(hashedCode : string, callback : (share : null | Share) => void) : Unsubscribe {
		const q = this.getSharesQuery({ hashedCode });

		return onSnapshot(q, (querySnapshot : QuerySnapshot<DocumentData, DocumentData>) => {
			const item : Share = this.getSharesFromSnapshot(querySnapshot)[0] ?? null;

			callback(item);
		});
	}

	getSharesReactive(userId : string, callback : (shares : Share[]) => void) : Unsubscribe {
		const q = this.getSharesQuery({ inviteeId : userId });

		return onSnapshot(q, (querySnapshot : QuerySnapshot<DocumentData, DocumentData>) => {
			const items : Share[] = this.getSharesFromSnapshot(querySnapshot);

			callback(items);
		});
	}

	async deleteShare(id : string) : Promise<boolean> {
		const docRef = doc(this.db, 'shares', id);

		try {
			await deleteDoc(docRef);
		} catch (error) {
			console.error(`Something went wrong when attempting to delete share with id ${ id }:`, error);

			return false;
		}

		return true;
	}
}

export const firestore = new Firestore();
