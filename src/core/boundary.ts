import { extractIndicators } from './indicators';
import { matchOrganisation } from './organisations';
import type { BoundaryPayload, Indicators, Organisation, TacticAnalysis } from './types';

export type OrganisationStatus =
  | 'curated' // on the curated list: safe to send
  | 'verbatim' // appears word for word in the message, short and clean: safe to send
  | 'needs_confirmation' // free text from the model that failed the checks: user must confirm or edit
  | 'empty';

export interface OrganisationCheck {
  status: OrganisationStatus;
  value: string;
  curated: Organisation | null;
  reason: string;
}

const MAX_ORG_TOKENS = 5;

/**
 * G2 part 1: validates the organisation name before it may leave the device.
 * The model writes this field, so it could copy private text (a person's name) into it.
 */
export function checkOrganisation(name: string, message: string, list: Organisation[]): OrganisationCheck {
  const value = name.trim();
  if (!value) return { status: 'empty', value, curated: null, reason: 'No organisation was named.' };

  const curated = matchOrganisation(value, list);
  if (curated) return { status: 'curated', value: curated.name, curated, reason: 'On the curated list of organisations.' };

  const tokens = value.split(/\s+/);
  const ind: Indicators = extractIndicators(value);
  const clean =
    tokens.length <= MAX_ORG_TOKENS &&
    !/\d/.test(value) &&
    ind.emails.length === 0 &&
    ind.links.length === 0 &&
    ind.phoneNumbers.length === 0;
  const verbatim = message.toLowerCase().includes(value.toLowerCase());

  if (clean && verbatim) {
    return { status: 'verbatim', value, curated: null, reason: 'Appears word for word in the message and contains no numbers or contact details.' };
  }
  return {
    status: 'needs_confirmation',
    value,
    curated: null,
    reason: clean ? 'Not found word for word in the message.' : 'Too long, or contains numbers or contact details.',
  };
}

/**
 * G2 part 2: builds the exact payload the cloud may receive.
 * - Only registrable domains (never paths or query strings, which can identify the victim).
 * - Phone numbers only when the user explicitly ticked them.
 * - The organisation only when it passed checkOrganisation or the user confirmed it.
 */
export function buildPayload(
  analysis: TacticAnalysis,
  indicators: Indicators,
  orgCheck: OrganisationCheck,
  userConfirmedOrganisation: boolean,
  selectedPhoneNumbers: string[],
): BoundaryPayload {
  const orgAllowed = orgCheck.status === 'curated' || orgCheck.status === 'verbatim' || (orgCheck.status === 'needs_confirmation' && userConfirmedOrganisation);
  return {
    claimedOrganisation: orgAllowed ? orgCheck.value : '',
    domains: [...indicators.domains],
    phoneNumbers: selectedPhoneNumbers.filter((p) => indicators.phoneNumbers.includes(p)),
    tactics: [...analysis.tactics],
  };
}

/** The exact bytes shown in the Boundary inspector and sent to the cloud. */
export function serialisePayload(p: BoundaryPayload): string {
  return JSON.stringify(p, null, 2);
}
