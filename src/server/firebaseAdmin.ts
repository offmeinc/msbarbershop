import { initializeApp as initializeAdminApp, getApps as getAdminApps, getApp as getAdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getMessaging as getAdminMessaging } from "firebase-admin/messaging";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getFirestore as getClientFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase Admin
const adminApp = !getAdminApps().length
  ? initializeAdminApp({
      projectId: firebaseConfig.projectId
    })
  : getAdminApp();

const dbId = firebaseConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseConfig.firestoreDatabaseId;

export const adminDb = dbId ? getAdminFirestore(adminApp, dbId) : getAdminFirestore(adminApp);
export const adminMessaging = getAdminMessaging(adminApp);

// Initialize Firebase Client SDK on the server
// This helps bypass some IAM restrictions if the Firestore rules are permissive
export const clientApp = initializeClientApp(firebaseConfig);
export const db = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId || "(default)");
