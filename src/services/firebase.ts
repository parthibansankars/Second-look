import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider, type AppCheck } from 'firebase/app-check';
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getRemoteConfig, type RemoteConfig } from 'firebase/remote-config';
import { getAI, GoogleAIBackend, type AI } from 'firebase/ai';
import { APPCHECK_DEBUG_TOKEN, firebaseConfig, isFirebaseConfigured, RECAPTCHA_SITE_KEY } from '../config';

export interface FirebaseServices {
  app: FirebaseApp;
  appCheck: AppCheck | null;
  auth: Auth;
  db: Firestore;
  remoteConfig: RemoteConfig;
  ai: AI;
}

let services: FirebaseServices | null = null;

declare global {
  // Read by the App Check SDK before initialisation.
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}

/** Initialises Firebase once. Returns null when .env.local has not been filled in yet. */
export function getFirebase(): FirebaseServices | null {
  if (services) return services;
  if (!isFirebaseConfigured) return null;

  const app = initializeApp(firebaseConfig);

  if (import.meta.env.DEV && APPCHECK_DEBUG_TOKEN) {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = APPCHECK_DEBUG_TOKEN === 'true' ? true : APPCHECK_DEBUG_TOKEN;
  }

  let appCheck: AppCheck | null = null;
  if (RECAPTCHA_SITE_KEY) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }

  services = {
    app,
    appCheck,
    auth: getAuth(app),
    db: getFirestore(app),
    remoteConfig: getRemoteConfig(app),
    ai: getAI(app, { backend: new GoogleAIBackend() }),
  };
  return services;
}

/** Anonymous sign-in, used only so Firestore rules can scope counters to a user. */
export async function ensureSignedIn(): Promise<string | null> {
  const fb = getFirebase();
  if (!fb) return null;
  if (fb.auth.currentUser) return fb.auth.currentUser.uid;
  const cred = await signInAnonymously(fb.auth);
  return cred.user.uid;
}
