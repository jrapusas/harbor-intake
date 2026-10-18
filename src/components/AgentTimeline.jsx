import { toolLabel } from '../lib/agentFeatures.js';

function stepStatus(entry) {
  if (entry.tool === 'validate_intake') {
    if (entry.result?.valid === false) return 'fail';
    if (entry.result?.valid === true) return 'ok';
  }
  if (entry.result?.error) return 'fail';
  if (entry.tool === 'lookup_contact' && !entry.result?.found) return 'warn';
  return 'ok';
}

export default function AgentTimeline({ trace, showRaw, onToggleRaw }) {
  const steps = trace.filter((t) => t.tool && t.kind !== 'turn');
  if (!steps.length) return null;

  return (
    <div className="agent-timeline">
      <div className="timeline-head">
        <h3>What the agent did</h3>
        <button type="button" className="link" onClick={onToggleRaw}>
          {showRaw ? 'Hide JSON' : 'Raw JSON'}
        </button>
      </div>
      <ol className="timeline-list">
        {steps.map((entry, i) => {
          const status = stepStatus(entry);
          const retry = entry.retry || (entry.tool === 'extract_intake' && i > 0 && steps[i - 1]?.tool === 'validate_intake');
          return (
            <li key={i} className={`timeline-step ${status}`}>
              <span className="step-num">{i + 1}</span>
              <div className="step-body">
                <strong>{entry.tool}</strong>
                <span>{toolLabel(entry.tool, entry.result)}</span>
                {entry.humanRecheck && <span className="step-tag">After your edit</span>}
                {retry && <span className="step-tag">Retry</span>}
              </div>
            </li>
          );
        })}
      </ol>
      {showRaw && <pre className="trace-raw">{JSON.stringify(trace, null, 2)}</pre>}
    </div>
  );
}
