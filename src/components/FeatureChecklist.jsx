import { AGENT_FEATURES } from '../lib/agentFeatures.js';

export default function FeatureChecklist({ demonstrated }) {
  return (
    <ul className="feature-checklist">
      {AGENT_FEATURES.map((f) => (
        <li key={f.id} className={demonstrated[f.id] ? 'done' : ''}>
          <span className="check">{demonstrated[f.id] ? '✓' : '○'}</span>
          {f.label}
        </li>
      ))}
    </ul>
  );
}
