/**
 * Runtime configuration. Values come from .env.local (see .env.example).
 * The Firebase web config is a public identifier, not a secret; App Check protects the project.
 */
const env = import.meta.env;

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};

/** reCAPTCHA v3 site key for App Check (free; no billing account needed). */
export const RECAPTCHA_SITE_KEY: string = env.VITE_RECAPTCHA_SITE_KEY ?? '';

/**
 * App Check debug token for local development only. Never commit it.
 * Set to "true" to make the SDK print a new debug token in the browser console.
 */
export const APPCHECK_DEBUG_TOKEN: string = env.VITE_APPCHECK_DEBUG_TOKEN ?? '';

/** Cloud model used when the on-device model is unavailable (S1 samples, S3). */
export const CLOUD_MODEL: string = env.VITE_CLOUD_MODEL || 'gemini-3.5-flash-lite';

/** Cloud model for the grounded check (S2). Must support Google Search grounding. */
export const GROUNDED_MODEL: string = env.VITE_GROUNDED_MODEL || 'gemini-3.5-flash-lite';

/**
 * Google Search grounding needs the paid Blaze plan, so it is OFF by default.
 * Off: the online check asks cloud Gemini without live search (free Spark plan).
 * On: set VITE_ENABLE_GROUNDING=true after upgrading to Blaze.
 */
export const ENABLE_GROUNDING: boolean = env.VITE_ENABLE_GROUNDING === 'true';

export const DEFAULT_DAILY_GROUNDED_CAP = 20;

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
