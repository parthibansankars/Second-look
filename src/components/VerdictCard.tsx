import { useState } from 'react';
import { VERDICT_LABEL } from '../core/verdict';
import type { Verdict } from '../core/types';
import { InfoIcon, StopIcon, WarningIcon } from './Icons';

interface Props {
  verdict: Verdict;
  explanation: string | null;
  reportingSteps: string[];
}

const HEADLINE: Record<Verdict['level'], string> = {
  likely_scam: 'This message is very likely a scam.',
  suspicious: 'Be careful with this message.',
  no_warning_signs: 'We found no warning signs.',
};

const ADVICE: Record<Verdict['level'], string> = {
  likely_scam: 'Do not click the link, do not reply, and do not pay anything.',
  suspicious: 'Do not click links or pay anything until you have checked it another way.',
  no_warning_signs: 'This does not mean it is safe. If you are unsure, contact the company yourself.',
};

/** Text for a family helper. Built only from the verdict, never from the message or the online check. */
function shareText(v: Verdict): string {
  return [
    `SecondLook says: ${VERDICT_LABEL[v.level]}`,
    ...v.reasons.map((r) => `- ${r.rule}: ${r.detail}`),
    v.officialDomains[0] ? `Official website: ${v.officialDomains[0]}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function VerdictCard({ verdict, explanation, reportingSteps }: Props) {
  const [shared, setShared] = useState<string | null>(null);
  const Icon = verdict.level === 'likely_scam' ? StopIcon : verdict.level === 'suspicious' ? WarningIcon : InfoIcon;

  const share = async () => {
    const text = shareText(verdict);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'SecondLook result', text });
      } else {
        await navigator.clipboard.writeText(text);
        setShared('Copied. You can now paste it into a message to your family member.');
      }
    } catch {
      // The person closed the share window.
    }
  };

  return (
    <section className={`card verdict verdict-${verdict.level}`} aria-live="assertive">
      <div className="verdict-head">
        <span className="verdict-icon">
          <Icon />
        </span>
        <div>
          <p className="verdict-label">{VERDICT_LABEL[verdict.level]}</p>
          <p className="verdict-headline">{HEADLINE[verdict.level]}</p>
        </div>
      </div>

      <p className="advice">{ADVICE[verdict.level]}</p>
      {explanation && <p className="explanation">{explanation}</p>}

      <h3>Why</h3>
      <ul className="reasons">
        {verdict.reasons.map((r, i) => (
          <li key={i}>
            <strong>{r.rule}.</strong> {r.detail}
          </li>
        ))}
      </ul>

      {verdict.officialDomains.length > 0 && (
        <div className="contact-box">
          <h3>How to contact {verdict.matchedOrganisation?.name} safely</h3>
          <p>
            Type <strong className="domain">{verdict.officialDomains[0]}</strong> into your browser yourself, and use the phone number shown on that
            website. Do not use the link or phone number in the message.
          </p>
        </div>
      )}

      {verdict.level !== 'no_warning_signs' && reportingSteps.length > 0 && (
        <>
          <h3>What to do now</h3>
          <ol className="steps">
            {reportingSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </>
      )}

      <button type="button" className="big secondary" onClick={share}>
        Send this result to a family member
      </button>
      {shared && <p className="hint">{shared}</p>}
    </section>
  );
}
