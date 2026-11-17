import { useEffect, useMemo, useState } from 'react';
import { detectCapability, type Capability } from './ai/capability';
import { prepareOnDeviceModel } from './ai/models';
import { analyseTactics, explainVerdict, onlineCheck, type OnlineAnswer } from './ai/steps';
import { buildPayload, checkOrganisation, serialisePayload } from './core/boundary';
import { extractIndicators } from './core/indicators';
import { detectLanguage, type SupportedLanguage } from './core/language';
import { MANUAL_QUESTIONS, manualAnalysis, type ManualAnswers } from './core/manual';
import { findOrganisationInText } from './core/organisations';
import { decideVerdict } from './core/verdict';
import type { BoundaryPayload, Indicators, TacticAnalysis, TimelineEntry, Verdict } from './core/types';
import { SAMPLES } from './data/samples';
import { ENABLE_GROUNDING, isFirebaseConfigured } from './config';
import { DEFAULT_SETTINGS, loadSettings, type AppSettings } from './services/remoteConfig';
import { recordRouting, takeGroundedQuota } from './services/telemetry';
import { OnlinePanel } from './components/OnlinePanel';
import { LockIcon, ShieldIcon } from './components/Icons';
import { TechDetails } from './components/TechDetails';
import { VerdictCard } from './components/VerdictCard';

type Stage = 'paste' | 'busy' | 'who' | 'question' | 'confirm' | 'result';

const EMPTY_MANUAL: ManualAnswers = { organisation: '', rushesOrThreatens: false, asksForMoney: false, asksForCodeOrLogin: false, claimsToBeFamily: false };

function readTextSize(): boolean {
  try {
    return localStorage.getItem('secondlook-large-text') === '1';
  } catch {
    return false;
  }
}

function saveTextSize(large: boolean) {
  try {
    localStorage.setItem('secondlook-large-text', large ? '1' : '0');
  } catch {
    // Storage blocked: the setting simply is not remembered.
  }
}

function hasContent(p: BoundaryPayload | null): boolean {
  return !!p && (p.claimedOrganisation !== '' || p.domains.length > 0 || p.phoneNumbers.length > 0);
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [capability, setCapability] = useState<Capability | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [largeText, setLargeText] = useState(readTextSize);

  const [stage, setStage] = useState<Stage>('paste');
  const [busyText, setBusyText] = useState('');
  const [message, setMessage] = useState('');
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [lang, setLang] = useState<SupportedLanguage>('en');
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [analysis, setAnalysis] = useState<TacticAnalysis | null>(null);
  const [manual, setManual] = useState<ManualAnswers>(EMPTY_MANUAL);
  const [guessedOrg, setGuessedOrg] = useState('');
  const [typingOrg, setTypingOrg] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [orgConfirmed, setOrgConfirmed] = useState(false);
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [grounded, setGrounded] = useState<OnlineAnswer | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);
    void detectCapability().then(setCapability);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.textSize = largeText ? 'large' : 'normal';
    saveTextSize(largeText);
  }, [largeText]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stage, questionIndex]);

  const log = (entry: TimelineEntry) => {
    setTimeline((t) => [...t, entry]);
    void recordRouting(entry.step, entry.tier);
  };

  const orgCheck = useMemo(
    () => (analysis ? checkOrganisation(analysis.claimedOrganisation, message, settings.organisations) : null),
    [analysis, message, settings.organisations],
  );

  const payload = useMemo(
    () => (analysis && indicators && orgCheck ? buildPayload(analysis, indicators, orgCheck, orgConfirmed, selectedPhones) : null),
    [analysis, indicators, orgCheck, orgConfirmed, selectedPhones],
  );

  function startAgain() {
    setStage('paste');
    setMessage('');
    setSampleId(null);
    clearResult();
  }

  function clearResult() {
    setAnalysis(null);
    setIndicators(null);
    setManual(EMPTY_MANUAL);
    setGuessedOrg('');
    setTypingOrg(false);
    setQuestionIndex(0);
    setOrgConfirmed(false);
    setSelectedPhones([]);
    setVerdict(null);
    setExplanation(null);
    setGrounded(null);
    setTimeline([]);
    setNotice(null);
  }

  async function onPasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setMessage(text);
        setSampleId(null);
      }
    } catch {
      setNotice('Your browser did not allow pasting with this button. Click in the box, then press Ctrl and V together.');
    }
  }

  async function onPrepare() {
    setDownloadProgress(0);
    try {
      await prepareOnDeviceModel(lang, setDownloadProgress);
      setDownloadProgress(1);
      setCapability(await detectCapability(lang));
    } catch {
      setDownloadProgress(null);
    }
  }

  /** G0, G1, then S1 on the device, or the simple questions (S1-M). */
  async function onCheck() {
    const text = message.trim();
    if (!text) return;
    clearResult();
    const isSample = SAMPLES.some((s) => s.id === sampleId && s.text === message);

    let t0 = performance.now();
    const language = detectLanguage(text);
    log({ step: 'G0 Language check', tier: 'code', ms: Math.round(performance.now() - t0), note: language.language ?? `unsupported (${language.detected})` });

    t0 = performance.now();
    const ind = extractIndicators(text);
    setIndicators(ind);
    log({ step: 'G1 Links, numbers and payment words', tier: 'code', ms: Math.round(performance.now() - t0) });

    const guess = findOrganisationInText(text, settings.organisations)?.name ?? '';
    if (language.language) setLang(language.language);

    const canUseAi = !!language.language && isFirebaseConfigured && (capability?.state === 'available' || isSample);
    if (!canUseAi) {
      startQuestions(guess);
      return;
    }

    setBusyText('Reading your message on this computer…');
    setStage('busy');
    try {
      const r = await analyseTactics(text, language.language!, isSample);
      log({ step: 'S1 Scam tactics', tier: r.tier, ms: r.ms, note: r.tier === 'cloud' ? 'Cloud stand-in for a fictional example' : undefined });
      afterAnalysis(r.value, ind);
    } catch {
      startQuestions(guess);
    }
  }

  function startQuestions(guess: string) {
    setGuessedOrg(guess);
    setManual({ ...EMPTY_MANUAL, organisation: guess });
    setTypingOrg(!guess);
    setQuestionIndex(0);
    setStage('who');
  }

  function answerWho(organisation: string) {
    setManual((m) => ({ ...m, organisation }));
    setQuestionIndex(0);
    setStage('question');
  }

  function answerQuestion(value: boolean) {
    const q = MANUAL_QUESTIONS[questionIndex];
    const next = { ...manual, [q.key]: value };
    setManual(next);
    if (questionIndex < MANUAL_QUESTIONS.length - 1) {
      setQuestionIndex(questionIndex + 1);
      return;
    }
    if (!indicators) return;
    log({ step: 'S1-M Answers to simple questions', tier: 'user', ms: 0 });
    afterAnalysis(manualAnalysis(next, indicators), indicators);
  }

  function questionBack() {
    if (questionIndex === 0) setStage('who');
    else setQuestionIndex(questionIndex - 1);
  }

  /** Goes to the online-check question when there is something to check, otherwise straight to the result. */
  function afterAnalysis(a: TacticAnalysis, ind: Indicators) {
    setAnalysis(a);
    const check = checkOrganisation(a.claimedOrganisation, message, settings.organisations);
    const p = buildPayload(a, ind, check, check.status === 'needs_confirmation', []);
    if (isFirebaseConfigured && hasContent(p)) {
      setStage('confirm');
    } else {
      void finish(a, ind, null);
    }
  }

  /** G3 verdict and S3 explanation. */
  async function finish(a: TacticAnalysis, ind: Indicators, groundedAnswer: OnlineAnswer | null) {
    const check = checkOrganisation(a.claimedOrganisation, message, settings.organisations);
    // Local only: the match may use the message text, which never leaves the device.
    const curated = check.curated ?? findOrganisationInText(message, settings.organisations);
    const t0 = performance.now();
    const v = decideVerdict(a, ind, curated);
    log({ step: 'G3 Verdict rules', tier: 'code', ms: Math.round(performance.now() - t0) });
    setVerdict(v);
    setGrounded(groundedAnswer);
    setExplanation(null);
    setStage('result');

    if (isFirebaseConfigured) {
      try {
        const r = await explainVerdict(v, detectLanguage(message).language ?? 'en');
        setExplanation(r.value);
        log({ step: 'S3 Plain-language explanation', tier: r.tier, ms: r.ms });
      } catch {
        // The card already lists every reason from the rules.
      }
    }
  }

  async function onCheckOnline() {
    if (!payload || !analysis || !indicators) return;
    setBusyText(ENABLE_GROUNDING ? 'Checking online with Google Search…' : 'Asking Google’s Gemini AI…');
    setStage('busy');
    log({ step: 'Person approved what is sent', tier: 'user', ms: 0 });
    try {
      const allowed = await takeGroundedQuota(settings.dailyGroundedCap);
      if (!allowed) {
        setNotice('Today’s limit for online checks has been reached. This result uses the checks on this computer only.');
        await finish(analysis, indicators, null);
        return;
      }
      const r = await onlineCheck(payload, detectLanguage(message).language ?? 'en');
      log({ step: ENABLE_GROUNDING ? 'S2 Online check (Google Search)' : 'S2 Online check (cloud Gemini, no search)', tier: 'cloud', ms: r.ms, note: ENABLE_GROUNDING ? `${r.value.sources.length} sources` : undefined });
      await finish(analysis, indicators, r.value);
    } catch {
      setNotice('We could not check online just now. This result uses the checks on this computer only.');
      await finish(analysis, indicators, null);
    }
  }

  const country = verdict?.matchedOrganisation?.country ?? (navigator.language === 'en-GB' ? 'UK' : 'US');
  const question = MANUAL_QUESTIONS[questionIndex];

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">
            <ShieldIcon size={34} />
          </span>
          <span className="brand-name">SecondLook</span>
        </div>
        <button type="button" className="text-size" aria-pressed={largeText} onClick={() => setLargeText(!largeText)}>
          {largeText ? 'Normal text' : 'Larger text'}
        </button>
      </header>

      <main className="main">
        <p className="privacy">
          <LockIcon /> Your message stays on this computer.
        </p>

        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}

        {stage === 'paste' && (
          <section className="card">
            <h1>Is this message a scam?</h1>
            <ol className="how">
              <li>Copy the message you received.</li>
              <li>Paste it in the box below.</li>
              <li>Press the blue button.</li>
            </ol>

            <button type="button" className="big secondary" onClick={onPasteFromClipboard}>
              Paste message
            </button>

            <label className="field" htmlFor="message">
              The message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setSampleId(null);
              }}
              rows={6}
              placeholder="Paste the message here"
            />

            <button type="button" className="big primary" onClick={onCheck} disabled={!message.trim()}>
              Check this message
            </button>

            <details className="examples">
              <summary>Try an example message</summary>
              <p className="hint">These are made-up messages for practice.</p>
              <div className="example-list">
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="example"
                    onClick={() => {
                      setMessage(s.text);
                      setSampleId(s.id);
                    }}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </details>
          </section>
        )}

        {stage === 'busy' && (
          <section className="card center" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <p className="busy-text">{busyText}</p>
            <p className="hint">This can take a few seconds.</p>
          </section>
        )}

        {stage === 'who' && (
          <section className="card">
            <p className="step-count">A few simple questions</p>
            {guessedOrg && !typingOrg ? (
              <>
                <h2>
                  The message says it is from <span className="highlight">{guessedOrg}</span>. Is that right?
                </h2>
                <div className="choices">
                  <button type="button" className="big choice" onClick={() => answerWho(guessedOrg)}>
                    Yes
                  </button>
                  <button type="button" className="big choice" onClick={() => setTypingOrg(true)}>
                    No
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Who does the message say it is from?</h2>
                <p className="hint">For example: a bank, a delivery company, the tax office, or a family member.</p>
                <input
                  className="big-input"
                  value={manual.organisation}
                  onChange={(e) => setManual({ ...manual, organisation: e.target.value })}
                  placeholder="Type the name"
                  aria-label="Who the message says it is from"
                />
                <div className="choices">
                  <button type="button" className="big primary" onClick={() => answerWho(manual.organisation)} disabled={!manual.organisation.trim()}>
                    Next
                  </button>
                  <button type="button" className="big secondary" onClick={() => answerWho('')}>
                    It does not say
                  </button>
                </div>
              </>
            )}
            <button type="button" className="link" onClick={() => setStage('paste')}>
              Back
            </button>
          </section>
        )}

        {stage === 'question' && question && (
          <section className="card">
            <p className="step-count">
              Question {questionIndex + 1} of {MANUAL_QUESTIONS.length}
            </p>
            <h2>{question.text}</h2>
            <div className="choices">
              <button type="button" className="big choice" onClick={() => answerQuestion(true)}>
                Yes
              </button>
              <button type="button" className="big choice" onClick={() => answerQuestion(false)}>
                No
              </button>
            </div>
            <button type="button" className="link" onClick={questionBack}>
              Back
            </button>
          </section>
        )}

        {stage === 'confirm' && payload && orgCheck && indicators && (
          <section className="card">
            <h2>{ENABLE_GROUNDING ? 'Check online with Google Search?' : 'Ask Google’s Gemini AI for a second opinion?'}</h2>
            <p>To check this, we will send only:</p>
            <ul className="send-list">
              {orgCheck.status === 'needs_confirmation' ? (
                <li>
                  <label className="tick">
                    <input type="checkbox" checked={orgConfirmed} onChange={(e) => setOrgConfirmed(e.target.checked)} />
                    <span>
                      The name <strong>{orgCheck.value}</strong> (tick to include it)
                    </span>
                  </label>
                </li>
              ) : (
                payload.claimedOrganisation && (
                  <li>
                    The name <strong>{payload.claimedOrganisation}</strong>
                  </li>
                )
              )}
              {payload.domains.map((d) => (
                <li key={d}>
                  The website name <strong className="domain">{d}</strong>
                </li>
              ))}
              {indicators.phoneNumbers.map((n) => (
                <li key={n}>
                  <label className="tick">
                    <input
                      type="checkbox"
                      checked={selectedPhones.includes(n)}
                      onChange={() => setSelectedPhones((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))}
                    />
                    <span>
                      The phone number <strong>{n}</strong> (tick to include it)
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="not-sent">
              <LockIcon /> We will <strong>not</strong> send your message, your name or the full link.
            </p>
            <div className="choices stack">
              <button type="button" className="big primary" onClick={onCheckOnline} disabled={!hasContent(payload)}>
                {ENABLE_GROUNDING ? 'Yes, check online' : 'Yes, ask Gemini'}
              </button>
              <button type="button" className="big secondary" onClick={() => void finish(analysis!, indicators, null)}>
                No, check on this computer only
              </button>
            </div>
          </section>
        )}

        {stage === 'result' && verdict && (
          <>
            <VerdictCard verdict={verdict} explanation={explanation} reportingSteps={settings.reporting[country] ?? []} />
            {grounded && <OnlinePanel answer={grounded} />}
            <button type="button" className="big primary" onClick={startAgain}>
              Check another message
            </button>
          </>
        )}

        <TechDetails
          capability={capability}
          firebaseReady={isFirebaseConfigured}
          progress={downloadProgress}
          payloadText={payload ? serialisePayload(payload) : ''}
          timeline={timeline}
          onPrepare={onPrepare}
        />

        <footer className="footer">
          SecondLook gives a warning, not a guarantee. “No warning signs found” does not mean a message is safe. SecondLook never stores your message.
        </footer>
      </main>
    </div>
  );
}
