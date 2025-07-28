import type { FirebaseApp } from 'firebase/app';

import { initializeApp } from 'firebase/app';

import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_FIREBASE_STORAGE_BUCKET,
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	PUBLIC_FIREBASE_APP_ID,
	PUBLIC_FIREBASE_MEASUREMENT_ID,
} from '$env/static/public';


class Firebase {
	private readonly firebaseConfig = {
		apiKey            : PUBLIC_FIREBASE_API_KEY,
		authDomain        : PUBLIC_FIREBASE_AUTH_DOMAIN,
		projectId         : PUBLIC_FIREBASE_PROJECT_ID,
		storageBucket     : PUBLIC_FIREBASE_STORAGE_BUCKET,
		messagingSenderId : PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
		appId             : PUBLIC_FIREBASE_APP_ID,
		measurementId     : PUBLIC_FIREBASE_MEASUREMENT_ID,
	};

	public app : FirebaseApp;


	constructor() {
		this.app = this.init() as FirebaseApp;
	}


	private init() : FirebaseApp | void {
		let app;

		try {
			app = initializeApp(this.firebaseConfig, 'firebase');
		} catch (e) {
			console.error(e);

			return;
		}

		return app;
	}
}

export const firebase = new Firebase();
