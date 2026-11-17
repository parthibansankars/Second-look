/** Scam tactics that the on-device model (S1) or the manual path (S1-M) can report. */
export const TACTICS = [
  'urgency',
  'threat',
  'prize',
  'gift_card_payment',
  'crypto_payment',
  'credential_request',
  'remote_access_request',
  'family_new_number',
  'payment_request',
  'link_click_request',
] as const;
export type Tactic = (typeof TACTICS)[number];

export const REQUESTED_ACTIONS = [
  'click_link',
  'call_number',
  'reply_with_details',
  'pay_money',
  'install_app',
  'none',
] as const;
export type RequestedAction = (typeof REQUESTED_ACTIONS)[number];

/** Output of S1 (on-device) and S1-M (manual). Same shape for both paths. */
export interface TacticAnalysis {
  claimedOrganisation: string;
  tactics: Tactic[];
  requestedAction: RequestedAction;
}

/** Output of G1: indicators extracted by deterministic code. */
export interface Indicators {
  /** Registrable domains only (for example "royalmail.com"), never full URLs. */
  domains: string[];
  /** Full links, kept on the device for display only. */
  links: string[];
  phoneNumbers: string[];
  emails: string[];
  amounts: string[];
  mentionsGiftCard: boolean;
  mentionsCrypto: boolean;
  mentionsCodeOrPassword: boolean;
  mentionsRemoteAccess: boolean;
  mentionsNewNumber: boolean;
}

export interface Organisation {
  id: string;
  name: string;
  country: 'US' | 'UK';
  aliases: string[];
  /** Official registrable domains. */
  domains: string[];
}

/** What the cloud is allowed to receive. Built by G2; shown byte for byte in the Boundary inspector. */
export interface BoundaryPayload {
  claimedOrganisation: string;
  domains: string[];
  phoneNumbers: string[];
  tactics: Tactic[];
}

export type VerdictLevel = 'likely_scam' | 'suspicious' | 'no_warning_signs';

export interface VerdictReason {
  rule: string;
  detail: string;
}

export interface Verdict {
  level: VerdictLevel;
  reasons: VerdictReason[];
  matchedOrganisation: Organisation | null;
  officialDomains: string[];
}

export type Tier = 'device' | 'cloud' | 'code' | 'user';

export interface TimelineEntry {
  step: string;
  tier: Tier;
  ms: number;
  note?: string;
}
