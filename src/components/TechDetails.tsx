import type { Capability } from '../ai/capability';
import type { TimelineEntry } from '../core/types';
import { RoutingTimeline } from './RoutingTimeline';

interface Props {
  capability: Capability | null;
  firebaseReady: boolean;
  progress: number | null;
  payloadText: string;
  timeline: TimelineEntry[];
  onPrepare: () => void;
}

/** Everything technical lives here, closed by default, so the main screens stay simple. */
export function TechDetails({ capability, firebaseReady, progress, payloadText, timeline, onPrepare }: Props) {
  const canPrepare = firebaseReady && (capability?.state === 'downloadable' || capability?.state === 'downloading');
  return (
    <details className="tech">
      <summary>Technical details</summary>
      <div className="tech-body">
        <h3>On-device AI (Gemini Nano)</h3>
        <p>
          Status: <strong>{capability?.state ?? 'checking'}</strong>
          {capability?.chromeVersion ? `, Chrome ${capability.chromeVersion}` : ''}
        </p>
        {capability?.explanation && <p>{capability.explanation}</p>}
        {canPrepare && (
          <button type="button" className="small" onClick={onPrepare} disabled={progress !== null && progress < 1}>
            {progress === null ? 'Prepare on-device model' : progress < 1 ? `Downloading ${Math.round(progress * 100)}%` : 'Ready'}
          </button>
        )}
        {!firebaseReady && <p>Firebase is not configured, so online checks and AI calls are off. See .env.example.</p>}

        {payloadText && (
          <>
            <h3>Exact data sent for the online check</h3>
            <pre className="payload">{payloadText}</pre>
          </>
        )}
        <RoutingTimeline entries={timeline} />
      </div>
    </details>
  );
}
