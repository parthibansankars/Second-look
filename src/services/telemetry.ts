import { doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import type { Tier } from '../core/types';
import { ensureSignedIn, getFirebase } from './firebase';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Counts only. Message text, payloads and grounded answers are never written.
 * Firebase AI monitoring does not record on-device calls, so routing is counted here.
 */
export async function recordRouting(step: string, tier: Tier): Promise<void> {
  const fb = getFirebase();
  if (!fb) return;
  try {
    const uid = await ensureSignedIn();
    if (!uid) return;
    const key = `${step.replace(/[^a-zA-Z0-9]/g, '_')}_${tier}`;
    await setDoc(doc(fb.db, 'routing', today()), { [key]: increment(1), updatedAt: serverTimestamp() }, { merge: true });
  } catch {
    // Telemetry must never break the check.
  }
}

/** Returns true when the user is still under the daily cap for grounded checks, and counts this one. */
export async function takeGroundedQuota(cap: number): Promise<boolean> {
  const fb = getFirebase();
  if (!fb) return false;
  const uid = await ensureSignedIn();
  if (!uid) return false;
  const ref = doc(fb.db, 'users', uid, 'usage', today());
  const snap = await getDoc(ref);
  const used = (snap.data()?.groundedChecks as number | undefined) ?? 0;
  if (used >= cap) return false;
  await setDoc(ref, { groundedChecks: increment(1), updatedAt: serverTimestamp() }, { merge: true });
  return true;
}
