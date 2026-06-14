import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence, runTransaction, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

// Initialize Firestore
// Use the specific database ID if provided in the config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Messaging conditionally (only in browser)
export const messaging = async () => {
  if (typeof window !== "undefined") {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  }
  return null;
};

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
    
    // If it's a Timestamp, keep it under standard format
    if (value.constructor && value.constructor.name === 'Timestamp') {
      return { seconds: value.seconds, nanoseconds: value.nanoseconds };
    }
    
    // Prevent traversing complex class instances
    let isPlain = false;
    const isArray = Array.isArray(value);
    try {
      const proto = Object.getPrototypeOf(value);
      isPlain = proto === Object.prototype || proto === null || isArray;
    } catch (e) {
      // Ignored
    }
    
    if (!isPlain) {
      const constName = value.constructor && value.constructor.name ? value.constructor.name : 'UnknownClass';
      return `[${constName}]`;
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

// Perform appointment cancellation and wallet refund atomically on the client
export async function cancelAppointmentAtomically(appointmentId: string, userId: string, reason: string = ""): Promise<{ success: boolean, refundedAmount: number, cancelledBy: string }> {
  let refundedAmount = 0;
  let cancelledBy = "client";

  await runTransaction(db, async (t) => {
    const appointmentRef = doc(db, "appointments", appointmentId);
    const appSnap = await t.get(appointmentRef);
    
    if (!appSnap.exists()) {
       throw new Error("Agendamento não encontrado");
    }
    const appData = appSnap.data() || {};
    if (appData.status === "cancelled") {
       throw new Error("Agendamento já está cancelado");
    }

    // Determine who is cancelling
    if (appData.clientId !== userId) {
      cancelledBy = "professional";
    } else {
      cancelledBy = "client";
    }

    const updates: any = { 
      status: "cancelled", 
      cancelledBy, 
      updatedAt: serverTimestamp(),
      cancellationReason: reason
    };

    if (appData.paymentStatus === "paid" && appData.totalPrice > 0 && appData.clientId && appData.clientId !== "guest") {
      const priceToRefund = Number(appData.totalPrice) || 0;
      const userRef = doc(db, "users", appData.clientId);
      const userSnap = await t.get(userRef);
      
      if (userSnap.exists()) {
        const currentBalance = Number(userSnap.data()?.walletBalance) || 0;
        t.update(userRef, { 
          walletBalance: currentBalance + priceToRefund, 
          updatedAt: serverTimestamp() 
        });
        updates.refundedToWallet = true;
        refundedAmount = priceToRefund;
      }
    }

    t.update(appointmentRef, updates);
  });

  return { success: true, refundedAmount, cancelledBy };
}
