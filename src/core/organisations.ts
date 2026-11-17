import type { Organisation } from './types';

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Finds a curated organisation by name or alias. */
export function matchOrganisation(name: string, list: Organisation[]): Organisation | null {
  const n = normalise(name);
  if (!n) return null;
  for (const org of list) {
    if (normalise(org.name) === n || org.aliases.some((a) => normalise(a) === n)) return org;
  }
  return null;
}

/** Finds a curated organisation mentioned anywhere in the message (whole-word alias match). */
export function findOrganisationInText(text: string, list: Organisation[]): Organisation | null {
  const n = ` ${normalise(text)} `;
  let best: { org: Organisation; len: number } | null = null;
  for (const org of list) {
    for (const alias of [org.name, ...org.aliases]) {
      const a = normalise(alias);
      if (a.length >= 2 && n.includes(` ${a} `) && (!best || a.length > best.len)) {
        best = { org, len: a.length };
      }
    }
  }
  return best?.org ?? null;
}

/** True when the domain or any of its parents is in the list. */
export function isOfficialDomain(domain: string, official: string[]): boolean {
  const d = domain.toLowerCase();
  return official.some((o) => d === o || d.endsWith(`.${o}`));
}

/**
 * A lookalike domain contains the organisation's name or brand but is not official,
 * for example "royalmail-redelivery.com" or "usps-track.info".
 */
export function isLookalike(domain: string, org: Organisation): boolean {
  if (isOfficialDomain(domain, org.domains)) return false;
  const flat = domain.toLowerCase().replace(/[^a-z0-9]/g, '');
  const keys = [org.name, ...org.aliases, ...org.domains.map((d) => d.split('.')[0])]
    .map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((k) => k.length >= 3 && k !== 'gov');
  return keys.some((k) => flat.includes(k));
}
