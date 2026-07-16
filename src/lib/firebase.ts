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
  try {
    const visited = new WeakSet<any>();
    
    function sanitize(val: any): any {
      if (val === null || typeof val !== 'object') {
        return val;
      }
      
      if (visited.has(val)) {
        return '[Circular]';
      }
      
      // Handle Dates
      if (val instanceof Date) {
        return val.toISOString();
      }
      
      // Handle Firestore Timestamps
      if (val.constructor && (val.constructor.name === 'Timestamp' || (val.seconds !== undefined && val.nanoseconds !== undefined))) {
        return { seconds: val.seconds, nanoseconds: val.nanoseconds };
      }
      
      // Check if it's a plain object or array
      let isPlain = false;
      const isArray = Array.isArray(val);
      try {
        const proto = Object.getPrototypeOf(val);
        isPlain = proto === Object.prototype || proto === null || isArray;
      } catch (e) {
        // Safe fallback
      }
      
      if (!isPlain) {
        // For non-plain objects, represent them as their class name or string representation
        const name = (val.constructor && val.constructor.name) || 'Object';
        return `[Class: ${name}]`;
      }
      
      visited.add(val);
      
      if (isArray) {
        return val.map((item: any) => sanitize(item));
      }
      
      const sanitizedObj: any = {};
      for (const key of Object.keys(val)) {
        try {
          sanitizedObj[key] = sanitize(val[key]);
        } catch (e) {
          // Ignore non-accessible properties
        }
      }
      return sanitizedObj;
    }
    
    const sanitized = sanitize(obj);
    return JSON.stringify(sanitized, null, 2);
  } catch (e) {
    return String(obj);
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
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
    // Ultimate fallback if even safeStringify fails
    errorJson = JSON.stringify({
      error: String(errInfo.error),
      operationType: String(errInfo.operationType),
      path: String(errInfo.path),
      message: "Safety stringify failed"
    });
  }
  console.error('[Firestore Error Details]', errorJson);
  // Re-throw the full JSON string so the system can diagnose permission issues
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
