import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface AppLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  timestamp: any;
}

export async function logToFirestore(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, any>) {
  try {
    await addDoc(collection(db, 'app_logs'), {
      level,
      message,
      context,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log to Firestore:', error);
  }
}
