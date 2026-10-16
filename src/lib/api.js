const demoToken = import.meta.env.VITE_DEMO_TOKEN;

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (demoToken) h['X-Demo-Token'] = demoToken;
  return h;
}

export async function checkApiHealth() {
  let res;
  try {
    res = await fetch('/api/health');
  } catch {
    throw new Error('Cannot reach API. Run npm run dev:local (UI :5173 + API :3848).');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'API health check failed');
  if (!data.has_llm_key) {
    throw new Error('No LLM key on server. Set GEMINI_API_KEY (free tier) or DEEPSEEK_API_KEY.');
  }
  return data;
}

export async function runAgent(rawText) {
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ rawText }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Agent request failed');
  return data;
}

export async function validateIntake(intake) {
  try {
    const res = await fetch('/api/validate', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ intake }),
    });
    const data = await res.json();
    if (res.ok) return data;
  } catch {
    /* API not running — fall back for local Vite-only dev */
  }
  const { validateIntakeLocal } = await import('./validateLocal.js');
  return validateIntakeLocal(intake);
}

export { loadSampleRun } from './samples.js';

export function exportCsv(rows) {
  const cols = ['created_at', 'title', 'owner', 'priority', 'due_date', 'notes'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.join(',')];
  for (const r of rows) {
    lines.push(cols.map((c) => escape(r[c])).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'harbor-intakes.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
