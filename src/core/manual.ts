import type { Indicators, RequestedAction, Tactic, TacticAnalysis } from './types';

/** S1-M: the four yes/no questions used when Gemini Nano is not available. */
export interface ManualAnswers {
  organisation: string;
  rushesOrThreatens: boolean;
  asksForMoney: boolean;
  asksForCodeOrLogin: boolean;
  claimsToBeFamily: boolean;
}

export const MANUAL_QUESTIONS: { key: keyof Omit<ManualAnswers, 'organisation'>; text: string }[] = [
  { key: 'rushesOrThreatens', text: 'Does it rush you, or threaten a fine, arrest or account closure?' },
  { key: 'asksForMoney', text: 'Does it ask you to pay money, a fee or a gift card?' },
  { key: 'asksForCodeOrLogin', text: 'Does it ask for a code, password or your login details?' },
  { key: 'claimsToBeFamily', text: 'Does it claim to be a family member or friend on a new number?' },
];

/** Converts manual answers plus deterministic indicators into the same shape S1 produces. */
export function manualAnalysis(a: ManualAnswers, ind: Indicators): TacticAnalysis {
  const tactics = new Set<Tactic>();
  if (a.rushesOrThreatens) {
    tactics.add('urgency');
    tactics.add('threat');
  }
  if (a.asksForMoney) tactics.add('payment_request');
  if (a.asksForCodeOrLogin) tactics.add('credential_request');
  if (a.claimsToBeFamily) tactics.add('family_new_number');
  if (ind.mentionsGiftCard) tactics.add('gift_card_payment');
  if (ind.mentionsCrypto) tactics.add('crypto_payment');
  if (ind.mentionsRemoteAccess) tactics.add('remote_access_request');
  if (ind.links.length) tactics.add('link_click_request');

  let requestedAction: RequestedAction = 'none';
  if (a.asksForMoney) requestedAction = 'pay_money';
  else if (ind.links.length) requestedAction = 'click_link';
  else if (a.asksForCodeOrLogin) requestedAction = 'reply_with_details';
  else if (ind.phoneNumbers.length) requestedAction = 'call_number';

  return { claimedOrganisation: a.organisation.trim(), tactics: [...tactics], requestedAction };
}
