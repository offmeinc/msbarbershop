import { PushNotifications } from '@capacitor/push-notifications';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Capacitor } from '@capacitor/core';

export const setupNativePush = async (userId: string, userRole: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Native Push] Not a native platform, skipping.');
    return;
  }

  try {
    // 1. Request Permission
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Native Push] Permission denied.');
      return;
    }

    // 2. Register
    await PushNotifications.register();

    // 3. Listen for token
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Native Push] Registered with token:', token.value);
      try {
        await setDoc(doc(db, "native_push_tokens", userId), {
          token: token.value,
          userRole,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('[Native Push] Token saved to Firestore.');
      } catch (e) {
        console.error('[Native Push] Failed to save token:', e);
      }
    });

    // 4. Listen for errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Native Push] Registration error:', error);
    });

  } catch (e) {
    console.error('[Native Push] Error setting up:', e);
  }
};
