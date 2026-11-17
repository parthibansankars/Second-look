import { describe, expect, it } from 'vitest';
import { DEFAULT_ORGANISATIONS } from '../data/organisations';
import { SAMPLES } from '../data/samples';
import { parseTacticJson } from '../ai/steps';
import { buildPayload, checkOrganisation } from './boundary';
import { extractIndicators } from './indicators';
import { detectLanguage } from './language';
import { manualAnalysis } from './manual';
import { findOrganisationInText, isLookalike, isOfficialDomain, matchOrganisation } from './organisations';
import type { TacticAnalysis } from './types';
import { decideVerdict } from './verdict';

const orgs = DEFAULT_ORGANISATIONS;
const sample = (id: string) => SAMPLES.find((s) => s.id === id)!.text;
const royalMail = matchOrganisation('Royal Mail', orgs)!;

describe('G0 language gate', () => {
  it('detects English and Spanish', () => {
    expect(detectLanguage(sample('parcel-uk')).language).toBe('en');
    expect(detectLanguage(sample('spanish')).language).toBe('es');
  });
  it('rejects unsupported scripts', () => {
    expect(detectLanguage('आपका पार्सल रोका गया है, कृपया शुल्क का भुगतान करें').language).toBeNull();
  });
});

describe('G1 indicators', () => {
  it('reduces links to registrable domains', () => {
    const ind = extractIndicators(sample('parcel-uk'));
    expect(ind.domains).toEqual(['royalmail-redelivery-fee.com']);
    expect(ind.links[0]).toContain('/track?id=');
    expect(ind.amounts).toContain('£1.99');
  });
  it('finds phone numbers and remote-access words', () => {
    const ind = extractIndicators(sample('tech-support'));
    expect(ind.phoneNumbers).toContain('+12025550147');
    expect(ind.mentionsRemoteAccess).toBe(true);
  });
  it('finds code requests and new-number wording', () => {
    expect(extractIndicators(sample('bank-us')).mentionsCodeOrPassword).toBe(true);
    expect(extractIndicators(sample('family')).mentionsNewNumber).toBe(true);
  });
});

describe('organisations', () => {
  it('matches aliases and text mentions', () => {
    expect(matchOrganisation('royal mail', orgs)?.id).toBe('royalmail');
    expect(findOrganisationInText('Chase Alert: unusual sign-in', orgs)?.id).toBe('chase');
  });
  it('accepts official subdomains and flags lookalikes', () => {
    expect(isOfficialDomain('tools.usps.com', ['usps.com'])).toBe(true);
    expect(isLookalike('royalmail-redelivery-fee.com', royalMail)).toBe(true);
    expect(isLookalike('royalmail.com', royalMail)).toBe(false);
  });
});

describe('G2 boundary', () => {
  const analysis: TacticAnalysis = { claimedOrganisation: 'Royal Mail', tactics: ['urgency', 'payment_request'], requestedAction: 'pay_money' };

  it('never sends the message, names, full links or unticked phone numbers', () => {
    const text = sample('parcel-uk');
    const ind = extractIndicators(text);
    const payload = buildPayload(analysis, ind, checkOrganisation('Royal Mail', text, orgs), false, []);
    const json = JSON.stringify(payload);
    expect(json).not.toContain('Margaret');
    expect(json).not.toContain('track?id');
    expect(json).not.toContain('MW3381');
    expect(payload).toEqual({ claimedOrganisation: 'Royal Mail', domains: ['royalmail-redelivery-fee.com'], phoneNumbers: [], tactics: ['urgency', 'payment_request'] });
  });

  it('holds back a model-written organisation that is not in the message until the user confirms', () => {
    const text = 'Hi Margaret Wilson, pay now';
    const check = checkOrganisation('Margaret Wilson Bank Services Limited Online', text, orgs);
    expect(check.status).toBe('needs_confirmation');
    const ind = extractIndicators(text);
    expect(buildPayload(analysis, ind, check, false, []).claimedOrganisation).toBe('');
    expect(buildPayload(analysis, ind, check, true, []).claimedOrganisation).toBe('Margaret Wilson Bank Services Limited Online');
  });

  it('only sends phone numbers that were ticked and found in the message', () => {
    const text = sample('tech-support');
    const ind = extractIndicators(text);
    const p = buildPayload(analysis, ind, checkOrganisation('Microsoft Support', text, orgs), false, ['+12025550147', '+15550000000']);
    expect(p.phoneNumbers).toEqual(['+12025550147']);
  });
});

describe('G3 verdict', () => {
  it('flags a lookalike domain as likely scam', () => {
    const text = sample('parcel-uk');
    const v = decideVerdict({ claimedOrganisation: 'Royal Mail', tactics: ['urgency'], requestedAction: 'pay_money' }, extractIndicators(text), royalMail);
    expect(v.level).toBe('likely_scam');
    expect(v.reasons.map((r) => r.rule)).toContain('Lookalike website');
  });

  it('applies hard rules even without a model', () => {
    const text = sample('family');
    const ind = extractIndicators(text);
    const a = manualAnalysis({ organisation: '', rushesOrThreatens: false, asksForMoney: true, asksForCodeOrLogin: false, claimsToBeFamily: true }, ind);
    expect(decideVerdict(a, ind, null).level).toBe('likely_scam');
  });

  it('never says safe for an ordinary message', () => {
    const text = sample('genuine');
    const usps = matchOrganisation('USPS', orgs);
    const v = decideVerdict({ claimedOrganisation: 'USPS', tactics: [], requestedAction: 'click_link' }, extractIndicators(text), usps);
    expect(v.level).toBe('no_warning_signs');
    expect(v.reasons[0].detail).toContain('does not mean the message is safe');
  });

  it('treats an unknown sender with a link and urgency as suspicious', () => {
    const text = sample('spanish');
    const v = decideVerdict({ claimedOrganisation: 'Correos', tactics: ['urgency', 'link_click_request'], requestedAction: 'pay_money' }, extractIndicators(text), null);
    expect(v.level).toBe('suspicious');
  });
});

describe('S1 output validation', () => {
  it('drops unknown tactics and actions', () => {
    const a = parseTacticJson('{"claimedOrganisation":"Chase","tactics":["urgency","hack_the_planet"],"requestedAction":"dance"}');
    expect(a).toEqual({ claimedOrganisation: 'Chase', tactics: ['urgency'], requestedAction: 'none' });
  });
  it('accepts fenced JSON', () => {
    expect(parseTacticJson('```json\n{"claimedOrganisation":"","tactics":[],"requestedAction":"none"}\n```').requestedAction).toBe('none');
  });
});
