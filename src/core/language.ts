import { franc } from 'franc-min';

/** Languages that Gemini Nano supports for input and output (ISO 639-1). */
export const SUPPORTED_LANGUAGES = ['en', 'es', 'ja', 'de', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const ISO3_TO_1: Record<string, SupportedLanguage> = {
  eng: 'en',
  spa: 'es',
  jpn: 'ja',
  deu: 'de',
  fra: 'fr',
};

export interface LanguageResult {
  /** ISO 639-1 code when supported, otherwise null. */
  language: SupportedLanguage | null;
  /** Raw franc result (ISO 639-3), "und" when undetermined. */
  detected: string;
}

/**
 * G0 Language gate. Short scam texts are often too short for reliable detection,
 * so undetermined text of mostly Latin script is treated as English.
 */
export function detectLanguage(text: string): LanguageResult {
  const detected = franc(text, { minLength: 10, only: Object.keys(ISO3_TO_1) });
  if (detected in ISO3_TO_1) {
    return { language: ISO3_TO_1[detected], detected };
  }
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (letters > 0 && latin / letters > 0.9) {
    return { language: 'en', detected };
  }
  return { language: null, detected };
}
