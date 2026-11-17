import { fetchAndActivate, getValue } from 'firebase/remote-config';
import { DEFAULT_ORGANISATIONS, DEFAULT_REPORTING } from '../data/organisations';
import type { Organisation } from '../core/types';
import { DEFAULT_DAILY_GROUNDED_CAP } from '../config';
import { getFirebase } from './firebase';

export interface AppSettings {
  organisations: Organisation[];
  reporting: Record<string, string[]>;
  dailyGroundedCap: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  organisations: DEFAULT_ORGANISATIONS,
  reporting: DEFAULT_REPORTING,
  dailyGroundedCap: DEFAULT_DAILY_GROUNDED_CAP,
};

function parseJson<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Loads the curated list, reporting steps and cap from Remote Config, falling back to bundled defaults. */
export async function loadSettings(): Promise<AppSettings> {
  const fb = getFirebase();
  if (!fb) return DEFAULT_SETTINGS;
  const rc = fb.remoteConfig;
  rc.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 60_000 : 3_600_000;
  rc.defaultConfig = {
    organisations_json: JSON.stringify(DEFAULT_ORGANISATIONS),
    reporting_json: JSON.stringify(DEFAULT_REPORTING),
    daily_grounded_cap: DEFAULT_DAILY_GROUNDED_CAP,
  };
  try {
    await fetchAndActivate(rc);
  } catch {
    // Offline or not yet configured: defaults apply.
  }
  const organisations = parseJson<Organisation[]>(getValue(rc, 'organisations_json').asString(), DEFAULT_ORGANISATIONS);
  return {
    organisations: Array.isArray(organisations) && organisations.length ? organisations : DEFAULT_ORGANISATIONS,
    reporting: parseJson(getValue(rc, 'reporting_json').asString(), DEFAULT_REPORTING),
    dailyGroundedCap: getValue(rc, 'daily_grounded_cap').asNumber() || DEFAULT_DAILY_GROUNDED_CAP,
  };
}
