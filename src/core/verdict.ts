import { isLookalike, isOfficialDomain } from './organisations';
import type { Indicators, Organisation, TacticAnalysis, Verdict, VerdictReason } from './types';

/**
 * G3 Verdict judge. Deterministic. The grounded cloud answer is NEVER an input:
 * it is displayed verbatim beside the verdict, as the grounding terms require.
 *
 * "Likely scam" only from a hard rule or a curated-domain mismatch.
 * The app never says "Safe".
 */
export function decideVerdict(
  analysis: TacticAnalysis,
  indicators: Indicators,
  curated: Organisation | null,
): Verdict {
  const hard: VerdictReason[] = [];
  const soft: VerdictReason[] = [];
  const t = new Set(analysis.tactics);

  // Hard rules.
  if (t.has('gift_card_payment') || indicators.mentionsGiftCard) {
    hard.push({ rule: 'Gift card payment', detail: 'Real organisations never ask to be paid in gift cards.' });
  }
  if (t.has('crypto_payment') || indicators.mentionsCrypto) {
    hard.push({ rule: 'Cryptocurrency payment', detail: 'Banks, governments and delivery firms do not ask for payment in cryptocurrency.' });
  }
  if (t.has('credential_request') || indicators.mentionsCodeOrPassword) {
    hard.push({ rule: 'Asks for a code or password', detail: 'Never share a password, PIN or one-time code. Real organisations do not ask for them by message.' });
  }
  if (t.has('remote_access_request') || indicators.mentionsRemoteAccess) {
    hard.push({ rule: 'Asks for remote access', detail: 'Installing an app so someone can control your device is how many scams take money.' });
  }
  if ((t.has('family_new_number') || indicators.mentionsNewNumber) && (t.has('payment_request') || indicators.amounts.length > 0)) {
    hard.push({ rule: '"New number" money request', detail: 'A relative writing from a new number and asking for money is a common scam. Call them on their old number first.' });
  }

  // Curated-domain comparison.
  if (curated) {
    for (const d of indicators.domains) {
      if (isOfficialDomain(d, curated.domains)) continue;
      if (isLookalike(d, curated)) {
        hard.push({ rule: 'Lookalike website', detail: `The link goes to ${d}, which imitates ${curated.name}. The official website is ${curated.domains[0]}.` });
      } else {
        hard.push({ rule: 'Link does not belong to the sender', detail: `The message claims to be from ${curated.name}, but the link goes to ${d}. The official website is ${curated.domains[0]}.` });
      }
    }
  }

  // Soft signals.
  if (t.has('urgency')) soft.push({ rule: 'Pressure to act fast', detail: 'Scammers rush you so you do not stop to check.' });
  if (t.has('threat')) soft.push({ rule: 'Threat', detail: 'Threats of fines, arrest or account closure are a common pressure tactic.' });
  if (t.has('prize')) soft.push({ rule: 'Unexpected prize', detail: 'You cannot win something you did not enter.' });
  if (t.has('payment_request') && !hard.length) soft.push({ rule: 'Asks for payment', detail: 'Check any payment request by contacting the organisation through its official website.' });
  if (!curated && indicators.domains.length > 0 && (t.has('link_click_request') || t.has('urgency'))) {
    soft.push({ rule: 'Unverified link', detail: 'The sender could not be matched to a known organisation, so the link cannot be checked against an official website.' });
  }

  const officialDomains = curated?.domains ?? [];
  if (hard.length) return { level: 'likely_scam', reasons: [...hard, ...soft], matchedOrganisation: curated, officialDomains };
  if (soft.length) return { level: 'suspicious', reasons: soft, matchedOrganisation: curated, officialDomains };
  return {
    level: 'no_warning_signs',
    reasons: [{ rule: 'No warning signs found', detail: 'This does not mean the message is safe. If in doubt, contact the organisation through its official website.' }],
    matchedOrganisation: curated,
    officialDomains,
  };
}

export const VERDICT_LABEL: Record<Verdict['level'], string> = {
  likely_scam: 'Likely scam',
  suspicious: 'Suspicious',
  no_warning_signs: 'No warning signs found',
};
