import { LinkifyIt } from 'linkify-it';
import { findPhoneNumbersInText } from 'libphonenumber-js';
import { getDomain } from 'tldts';
import type { Indicators } from './types';

const linkify = new LinkifyIt();

const GIFT_CARD = /\b(gift ?cards?|itunes|google play cards?|steam cards?|amazon cards?|vouchers?|tarjetas? de regalo)\b/i;
const CRYPTO = /\b(bitcoin|btc|crypto(currency)?|usdt|tether|ethereum|eth wallet|wallet address|bitcoin atm|criptomoneda)\b|\b(bc1|[13])[a-km-zA-HJ-NP-Z1-9]{25,39}\b|\b0x[a-fA-F0-9]{40}\b/i;
const CODE_OR_PASSWORD = /\b(one[- ]time (pass)?code|otp|verification code|security code|passcode|password|pin\b|login details|c[oó]digo de verificaci[oó]n|contrase[nñ]a)/i;
const REMOTE_ACCESS = /\b(anydesk|teamviewer|quick ?assist|remote access|screen ?share|ultraviewer|install (this|the) app|acceso remoto)\b/i;
const NEW_NUMBER = /\b(new (phone )?number|lost my phone|broke my phone|phone (is )?broken|this is my new|nuevo n[uú]mero|perd[ií] mi tel[eé]fono)\b/i;
const AMOUNT = /(?:[$£€]\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s?(?:usd|gbp|eur|dollars|pounds|euros))/gi;

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

/** G1 Indicator extraction. Deterministic, runs on the device, works without any model. */
export function extractIndicators(text: string): Indicators {
  const matches = linkify.match(text) ?? [];
  const links: string[] = [];
  const domains: string[] = [];
  const emails: string[] = [];

  for (const m of matches) {
    if (m.schema === 'mailto:') {
      emails.push(m.url.replace(/^mailto:/i, ''));
      const d = getDomain(m.url.split('@')[1] ?? '');
      if (d) domains.push(d.toLowerCase());
      continue;
    }
    links.push(m.url);
    const d = getDomain(m.url);
    if (d) domains.push(d.toLowerCase());
  }

  const phoneNumbers: string[] = [];
  for (const country of ['US', 'GB'] as const) {
    for (const p of findPhoneNumbersInText(text, country)) {
      phoneNumbers.push(p.number.number);
    }
  }

  return {
    domains: unique(domains),
    links: unique(links),
    phoneNumbers: unique(phoneNumbers),
    emails: unique(emails),
    amounts: unique(text.match(AMOUNT) ?? []),
    mentionsGiftCard: GIFT_CARD.test(text),
    mentionsCrypto: CRYPTO.test(text),
    mentionsCodeOrPassword: CODE_OR_PASSWORD.test(text),
    mentionsRemoteAccess: REMOTE_ACCESS.test(text),
    mentionsNewNumber: NEW_NUMBER.test(text),
  };
}
