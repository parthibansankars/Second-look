import type { GroundingChunk } from 'firebase/ai';
import { REQUESTED_ACTIONS, TACTICS, type BoundaryPayload, type RequestedAction, type Tactic, type TacticAnalysis, type Tier, type Verdict } from '../core/types';
import type { SupportedLanguage } from '../core/language';
import { VERDICT_LABEL } from '../core/verdict';
import { ENABLE_GROUNDING } from '../config';
import { explainModel, onlineCheckModel, tacticModel } from './models';

export interface StepResult<T> {
  value: T;
  tier: Tier;
  ms: number;
}

function tierOf(source: string | undefined): Tier {
  return source === 'on_device' ? 'device' : 'cloud';
}

const LANGUAGE_NAME: Record<SupportedLanguage, string> = { en: 'English', es: 'Spanish', ja: 'Japanese', de: 'German', fr: 'French' };

/** Validates model JSON against the enums. Anything unexpected is dropped, never trusted. */
export function parseTacticJson(text: string): TacticAnalysis {
  const raw = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as Record<string, unknown>;
  const tactics = Array.isArray(raw.tactics) ? raw.tactics.filter((t): t is Tactic => (TACTICS as readonly string[]).includes(String(t))) : [];
  const action = String(raw.requestedAction ?? 'none');
  return {
    claimedOrganisation: typeof raw.claimedOrganisation === 'string' ? raw.claimedOrganisation.slice(0, 80) : '',
    tactics: [...new Set(tactics)],
    requestedAction: (REQUESTED_ACTIONS as readonly string[]).includes(action) ? (action as RequestedAction) : 'none',
  };
}

/** S1: tactic analysis of the private message. */
export async function analyseTactics(message: string, lang: SupportedLanguage, isSample: boolean): Promise<StepResult<TacticAnalysis>> {
  const started = performance.now();
  const prompt = [
    'You check messages for scam tactics. Read the message between the markers and answer only with JSON that matches the schema.',
    'claimedOrganisation: the company, bank, government body or service the message claims to be from, copied exactly as written; empty string if none. Never put a person name there.',
    `tactics: any of ${TACTICS.join(', ')}.`,
    `requestedAction: one of ${REQUESTED_ACTIONS.join(', ')}.`,
    '<<<MESSAGE',
    message,
    'MESSAGE>>>',
  ].join('\n');
  const result = await tacticModel(lang, isSample).generateContent(prompt);
  return {
    value: parseTacticJson(result.response.text()),
    tier: tierOf(result.response.inferenceSource),
    ms: Math.round(performance.now() - started),
  };
}

export interface OnlineAnswer {
  /** True when Google Search grounding was used (Blaze plan only). */
  grounded: boolean;
  text: string;
  renderedContent: string | null;
  sources: { title: string; uri: string }[];
  queries: string[];
}

/**
 * S2: online check of the boundary payload only (never the message).
 * The answer is displayed as returned and is never used to decide the verdict.
 * When grounded, it is also never parsed, rewritten, stored or forwarded (Gemini API grounding terms).
 */
export async function onlineCheck(payload: BoundaryPayload, lang: SupportedLanguage): Promise<StepResult<OnlineAnswer>> {
  const started = performance.now();
  const lines = [
    `Answer in ${LANGUAGE_NAME[lang]}, in at most 5 short plain sentences for an older reader.`,
    ENABLE_GROUNDING
      ? 'Use Google Search.'
      : 'You cannot browse the web. Use only what you reliably know, and say clearly when you are not sure. Never invent websites or phone numbers.',
    payload.claimedOrganisation
      ? `1. What are the official website domains of "${payload.claimedOrganisation}"?`
      : '1. No organisation was named.',
    payload.domains.length
      ? `2. Do these website names belong to that organisation, or do they look like imitations: ${payload.domains.join(', ')}?`
      : '2. No links were included.',
    payload.phoneNumbers.length ? `3. Are these phone numbers known to belong to that organisation: ${payload.phoneNumbers.join(', ')}?` : '',
    payload.tactics.length ? `4. Do scams that impersonate this organisation commonly use: ${payload.tactics.join(', ')}?` : '',
  ].filter(Boolean);
  const result = await onlineCheckModel().generateContent(lines.join('\n'));
  const response = result.response;
  const meta = response.candidates?.[0]?.groundingMetadata;
  const chunks: GroundingChunk[] = meta?.groundingChunks ?? [];
  return {
    value: {
      grounded: ENABLE_GROUNDING,
      text: response.text(),
      renderedContent: meta?.searchEntryPoint?.renderedContent ?? null,
      sources: chunks.filter((c) => c.web?.uri).map((c) => ({ title: c.web?.title ?? c.web?.uri ?? '', uri: c.web?.uri ?? '' })),
      queries: meta?.webSearchQueries ?? [],
    },
    tier: 'cloud',
    ms: Math.round(performance.now() - started),
  };
}

/** S3: plain-language explanation built from the verdict card only (no message text). */
export async function explainVerdict(v: Verdict, lang: SupportedLanguage): Promise<StepResult<string>> {
  const started = performance.now();
  const facts = {
    verdict: VERDICT_LABEL[v.level],
    organisation: v.matchedOrganisation?.name ?? null,
    officialWebsite: v.officialDomains[0] ?? null,
    reasons: v.reasons.map((r) => `${r.rule}: ${r.detail}`),
  };
  const prompt = [
    `Write 3 short sentences in ${LANGUAGE_NAME[lang]} for an older person, at a simple reading level.`,
    'Explain the verdict below and say what to do now. Use only these facts. Do not invent phone numbers or websites. Never say the message is safe.',
    JSON.stringify(facts),
  ].join('\n');
  const result = await explainModel(lang).generateContent(prompt);
  return { value: result.response.text().trim(), tier: tierOf(result.response.inferenceSource), ms: Math.round(performance.now() - started) };
}
