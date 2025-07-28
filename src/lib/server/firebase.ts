import type { Auth } from 'firebase-admin/auth';

import type { Firestore } from 'firebase-admin/firestore';

// import type { Storage } from 'firebase-admin/storage';

import { dev } from '$app/environment';


class ServerFirebase {
  public authPromise: Promise<Auth>;
  public firestorePromise!: Promise<Firestore>;

  private externalFirestoreResolve: any;
  private externalAuthResolve: any;

  // let storage: Storage;


  constructor() {
    this.authPromise = new Promise((resolve) => {
      this.externalAuthResolve = resolve;
    });

    this.firestorePromise = new Promise((resolve) => {
      this.externalFirestoreResolve = resolve;
    });

    // Initialize Firebase Admin if we're in a server context
    if (typeof window === 'undefined') {
      this.init();
    }
  }

  // Dynamically import firebase-admin to avoid issues during build
  async init() : Promise<void> {
    if (!dev && typeof process === 'undefined') {
      // Skip initialization in production environment that doesn't support Node.js API
      return;
    }

    try {
      const { initializeApp, cert, getApps } = await import('firebase-admin/app');
      const { getAuth } = await import('firebase-admin/auth');
      const { getFirestore } = await import('firebase-admin/firestore');
      // const { getStorage } = await import('firebase-admin/storage');
      const { FIREBASE_SERVICE_ACCOUNT_JSON } = await import('$env/static/private');

      if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
        console.error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable not set');

        return;
      }

      try {
        // Parse the service account JSON, ensuring private_key has proper newlines
        const parsedServiceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);

        // Check if private_key is a string and contains escaped newline
        // Replace escaped newlines with actual newlines if needed
        if (parsedServiceAccount.private_key && !parsedServiceAccount.private_key.includes('\n')) {
          parsedServiceAccount.private_key = parsedServiceAccount.private_key
            .replace(/\\n/g, '\n');
        }

        // Initialize Firebase Admin SDK on the server
        if (!getApps().length) {
          initializeApp({
            credential: cert(parsedServiceAccount)
          });
        }
      } catch (error) {
        console.error('Error parsing service account:', error);

        return;
      }

      console.info('Firebase Admin initialized successfully');

      const auth = getAuth();
      const firestore = getFirestore();
      // const storage = getStorage();

      // console.debug('Firebase Admin Auth and Firestore initialized', { auth, firestore });

      this.externalAuthResolve(auth);
      this.externalFirestoreResolve(firestore);
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
    }
  }
}

export const serverFirebase = new ServerFirebase();

