import { validateIntakeLocal } from './validateLocal.js';

const demoToken = import.meta.env.VITE_DEMO_TOKEN;

/** @returns {Promise<Record<string, unknown>>} */
async function readJsonResponse(res) {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.replace(/\s+/g, ' ').trim().slice(0, 200);
    if (/^An error occurred/i.test(text)) {
      throw new Error(
        'Production API timed out or crashed (Vercel Hobby: 10s limit on /api/run). ' +
          'Redeploy after pulling latest (single-call agent on Vercel), or click Use demo data on the call.',
      );
    }
    throw new Error(
      res.ok
        ? `API returned non-JSON (${res.status}): ${preview}`
        : `API error (${res.status}): ${preview}`,
    );
  }
}

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
  const data = await readJsonResponse(res);
  if (!res.ok) {
    throw new Error(
      data.error || 'Cannot reach API. Run npm run dev:local (UI :5173 + API :3848).',
    );
  }
  if (!data.has_llm_key) {
    throw new Error(
      data.hint ||
        'No LLM key on server. Set GEMINI_API_KEY (free tier) or DEEPSEEK_API_KEY.',
    );
  }
  return data;
}

export async function runAgent(rawText) {
  const res = await fetch('/api/run', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ rawText }),
  });
  const data = await readJsonResponse(res);
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
    const data = await readJsonResponse(res);
    if (res.ok) return data;
  } catch {
    /* API not running — fall back for local Vite-only dev */
  }
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
