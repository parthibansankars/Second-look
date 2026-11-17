import type { Tier, TimelineEntry } from '../core/types';

const TIER_LABEL: Record<Tier, string> = {
  device: 'Device (Gemini Nano)',
  cloud: 'Cloud (Gemini)',
  code: 'Device (rules)',
  user: 'Person',
};

export function RoutingTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) return null;
  return (
    <>
      <h3>Where each step ran</h3>
      <table className="timeline">
        <thead>
          <tr>
            <th>Step</th>
            <th>Ran on</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i}>
              <td>
                {e.step}
                {e.note && <div className="hint">{e.note}</div>}
              </td>
              <td>
                <span className={`tier tier-${e.tier}`}>{TIER_LABEL[e.tier]}</span>
              </td>
              <td>{e.ms} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
