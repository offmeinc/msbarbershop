import { getAuth, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { app } from './firebase'; // Assuming there is already an initialized firebase app

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initGoogleCalendarAuth = (
    onAuthSuccess?: (user: User, token: string) => void,
    onAuthFailure?: () => void
) => {
    return auth.onAuthStateChanged(async (user: User | null) => {
        if (user) {
            if (cachedAccessToken) {
                if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
            } else if (!isSigningIn) {
                 // Try to get token silently if possible, but firebase doesn't expose refresh easily for Google Provider so we rely on re-auth if needed
                cachedAccessToken = null;
                if (onAuthFailure) onAuthFailure();
            }
        } else {
            cachedAccessToken = null;
            if (onAuthFailure) onAuthFailure();
        }
    });
};

export const signInWithGoogleCalendar = async (): Promise<{ user: User; accessToken: string } | null> => {
    try {
        isSigningIn = true;
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (!credential?.accessToken) {
            throw new Error('Failed to get access token from Firebase Auth');
        }
        cachedAccessToken = credential.accessToken;
        return { user: result.user, accessToken: cachedAccessToken };
    } catch (error: any) {
        console.error('Sign in error:', error?.message || error);
        throw error;
    } finally {
        isSigningIn = false;
    }
};

export const getCalendarAccessToken = async (): Promise<string | null> => {
    return cachedAccessToken;
};

// Functions to interact with the Calendar API
export const addEventToCalendar = async (
    title: string,
    description: string,
    startTime: Date,
    endTime: Date
) => {
    if (!cachedAccessToken) {
        throw new Error('User must be authenticated with Google to add to calendar.');
    }

    const event = {
        summary: title,
        description: description,
        start: {
            dateTime: startTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
            dateTime: endTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${cachedAccessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
    });

    if (!response.ok) {
        throw new Error('Failed to create calendar event.');
    }

    return await response.json();
};
