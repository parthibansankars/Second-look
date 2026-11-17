import { useEffect, useRef } from 'react';
import type { OnlineAnswer } from '../ai/steps';

/**
 * Shows the cloud answer exactly as returned. It is never used to decide the verdict.
 * When Google Search grounding is on, Google's search suggestions are rendered in a
 * shadow root, as the Firebase documentation recommends.
 */
export function OnlinePanel({ answer }: { answer: OnlineAnswer }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !answer.renderedContent) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    root.innerHTML = answer.renderedContent;
  }, [answer.renderedContent]);

  return (
    <section className="card grounded">
      <h2>{answer.grounded ? 'What Google Search found' : 'Second opinion from Google’s Gemini AI'}</h2>
      <p className="hint">
        {answer.grounded
          ? 'This is shown exactly as Google returned it.'
          : 'This is not a live web search, and Gemini can be wrong. The result above comes from SecondLook’s own checks.'}
      </p>
      <div className="grounded-text">{answer.text}</div>
      {answer.sources.length > 0 && (
        <>
          <h3>Sources</h3>
          <ol className="sources">
            {answer.sources.map((s) => (
              <li key={s.uri}>
                <a href={s.uri} target="_blank" rel="noopener noreferrer">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </>
      )}
      {answer.renderedContent && <div ref={hostRef} className="search-entry" />}
    </section>
  );
}
