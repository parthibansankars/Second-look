import { getGenerativeModel, InferenceMode, type GenerativeModel } from 'firebase/ai';
import { CLOUD_MODEL, ENABLE_GROUNDING, GROUNDED_MODEL } from '../config';
import { REQUESTED_ACTIONS, TACTICS } from '../core/types';
import type { SupportedLanguage } from '../core/language';
import { getFirebase } from '../services/firebase';

/** JSON Schema shared by the on-device constraint and the cloud fallback. */
export const TACTIC_SCHEMA = {
  type: 'object',
  properties: {
    claimedOrganisation: {
      type: 'string',
      description: 'The company, bank, government body or service the message claims to come from, copied exactly as written. Empty string if none. Never a person name.',
    },
    tactics: { type: 'array', items: { type: 'string', enum: [...TACTICS] } },
    requestedAction: { type: 'string', enum: [...REQUESTED_ACTIONS] },
  },
  required: ['claimedOrganisation', 'tactics', 'requestedAction'],
  additionalProperties: false,
} as const;

function languageOptions(lang: SupportedLanguage) {
  return {
    expectedInputs: [{ type: 'text' as const, languages: [lang] }],
    expectedOutputs: [{ type: 'text' as const, languages: [lang] }],
  };
}

const cache = new Map<string, GenerativeModel>();

function cached(key: string, create: () => GenerativeModel): GenerativeModel {
  let m = cache.get(key);
  if (!m) {
    m = create();
    cache.set(key, m);
  }
  return m;
}

function requireAi() {
  const fb = getFirebase();
  if (!fb) throw new Error('Firebase is not configured. Fill in .env.local first.');
  return fb.ai;
}

/**
 * S1 Tactic analysis.
 * Real messages: ONLY_ON_DEVICE, so the message can never reach the cloud.
 * Bundled fictional samples: PREFER_ON_DEVICE, so judges without Gemini Nano still see the flow.
 */
export function tacticModel(lang: SupportedLanguage, isSample: boolean): GenerativeModel {
  const mode = isSample ? InferenceMode.PREFER_ON_DEVICE : InferenceMode.ONLY_ON_DEVICE;
  return cached(`s1:${lang}:${mode}`, () =>
    getGenerativeModel(requireAi(), {
      mode,
      onDeviceParams: {
        createOptions: languageOptions(lang),
        promptOptions: { responseConstraint: TACTIC_SCHEMA },
      },
      inCloudParams: {
        model: CLOUD_MODEL,
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: TACTIC_SCHEMA, temperature: 0 },
      },
    }),
  );
}

/**
 * S3 Plain-language explanation. Input is the verdict card only (no message text),
 * so falling back to the cloud is safe: PREFER_ON_DEVICE.
 */
export function explainModel(lang: SupportedLanguage): GenerativeModel {
  return cached(`s3:${lang}`, () =>
    getGenerativeModel(requireAi(), {
      mode: InferenceMode.PREFER_ON_DEVICE,
      onDeviceParams: { createOptions: languageOptions(lang) },
      inCloudParams: { model: CLOUD_MODEL, generationConfig: { temperature: 0.2, maxOutputTokens: 300 } },
    }),
  );
}

/**
 * S2 Online check, cloud only (a plain, non-hybrid model instance).
 * Default (free Spark plan): the larger cloud Gemini model, no tools.
 * With ENABLE_GROUNDING (Blaze plan): adds Google Search grounding. Tools do not run
 * on-device and do not fall back, which is another reason this instance is cloud only.
 */
export function onlineCheckModel(): GenerativeModel {
  return cached(ENABLE_GROUNDING ? 's2-grounded' : 's2-cloud', () =>
    ENABLE_GROUNDING
      ? getGenerativeModel(requireAi(), { model: GROUNDED_MODEL, tools: [{ googleSearch: {} }], generationConfig: { temperature: 0 } })
      : getGenerativeModel(requireAi(), { model: CLOUD_MODEL, generationConfig: { temperature: 0, maxOutputTokens: 400 } }),
  );
}

/** Must be called from a click handler: Chrome only allows the model download after a user gesture. */
export async function prepareOnDeviceModel(lang: SupportedLanguage, onProgress: (p: number) => void): Promise<void> {
  await tacticModel(lang, false).initializeDeviceModel(onProgress);
}
