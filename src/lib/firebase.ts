import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

// Initialize Firestore
// Use the specific database ID if provided in the config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

export const auth = getAuth(app);
export const storage = getStorage(app);

// Set persistence to Local so users stay logged in across sessions
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Auth persistence error:", error);
  });

  // Enable offline persistence for Firestore
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.warn("Firestore multi-tab persistence failed-precondition, falling back to single-tab");
      enableIndexedDbPersistence(db).catch((err2) => {
        console.error("Firestore single-tab persistence error:", err2);
      });
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn("Firestore persistence unimplemented in this browser");
    } else {
      console.error("Firestore persistence error:", err);
    }
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function safeStringify(obj: any): string {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    // Basic types that are safe
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    
    // Check if we already visited this object
    if (cache.has(value)) {
      return undefined; // Drop circular references
    }
    
    // Check for some common non-serializable objects in Firebase (like Functions, or complex class instances)
    // If it has a custom constructor that's not a plain object, let's just return a generic name or undefined
    if (value.constructor && value.constructor.name !== 'Object' && value.constructor.name !== 'Array' && value.constructor.name !== 'Timestamp') {
        return `[${value.constructor.name}]`;
    }
    
    cache.add(value);
    return value;
  }, 2);
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  let errorJson = "";
  try {
    errorJson = safeStringify(errInfo);
  } catch (e) {
    console.warn("safeStringify failed, falling back to basic info", e);
    errorJson = JSON.stringify({
      error: errInfo.error,
      operationType: errInfo.operationType,
      path: errInfo.path,
      message: "Could not stringify full error info even with safeStringify"
    });
  }
  console.error('Firestore Error: ', errorJson);
  throw new Error(errorJson);
}
