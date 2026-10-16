import { useCallback, useMemo, useState } from 'react';
import AgentTimeline from './components/AgentTimeline.jsx';
import FeatureChecklist from './components/FeatureChecklist.jsx';
import { detectFeatures } from './lib/agentFeatures.js';
import { checkApiHealth, exportCsv, loadSampleRun, runAgent, validateIntake } from './lib/api.js';
import { DEFAULT_SAMPLE_ID, SAMPLES, getSample } from './lib/samples.js';
import { listIntakes, saveIntake, storageMode } from './lib/storage.js';

const defaultSample = getSample(DEFAULT_SAMPLE_ID);

const emptyIntake = () => ({
  title: '',
  owner: '',
  priority: 'medium',
  due_date: '',
  notes: '',
});

export default function App() {
  const [screen, setScreen] = useState('landing');
  const [rawText, setRawText] = useState(defaultSample.paste);
  const [intake, setIntake] = useState(emptyIntake());
  const [summary, setSummary] = useState('');
  const [trace, setTrace] = useState([]);
  const [showRawTrace, setShowRawTrace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [runStatus, setRunStatus] = useState('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [listError, setListError] = useState('');
  const [sampleId, setSampleId] = useState(DEFAULT_SAMPLE_ID);
  const [classification, setClassification] = useState(null);
  const [splits, setSplits] = useState([]);
  const [humanRecheckDone, setHumanRecheckDone] = useState(false);
  const [agentFilled, setAgentFilled] = useState(false);

  const refreshList = useCallback(async () => {
    try {
      setListError('');
      setRows(await listIntakes());
    } catch (e) {
      setListError(e.message);
    }
  }, []);

  function resetRunState() {
    setSummary('');
    setTrace([]);
    setClassification(null);
    setSplits([]);
    setHumanRecheckDone(false);
    setAgentFilled(false);
    setIntake(emptyIntake());
    setShowRawTrace(false);
  }

  function applyRunData(data) {
    setIntake({ ...emptyIntake(), ...data.intake });
    setSummary(data.summary || '');
    setTrace(data.trace || []);
    setClassification(data.classification || null);
    setSplits(data.splits || []);
    setAgentFilled(Boolean(data.intake?.title));
    setHumanRecheckDone(false);
  }

  function openList() {
    setScreen('list');
    refreshList();
  }

  async function handleRun(live) {
    setError('');
    setRunStatus('');
    setBusy(true);
    try {
      const text = rawText.trim() || getSample(sampleId).paste;
      if (!rawText.trim()) setRawText(text);
      let data;
      if (live) {
        setRunStatus('Connecting to API…');
        const health = await checkApiHealth();
        const modelLabel =
          health.model && health.provider
            ? `${health.provider} · ${health.model}`
            : health.model || health.provider || 'configured model';
        setRunStatus(`Running live agent (${modelLabel})…`);
        data = await runAgent(text);
      } else {
        data = await loadSampleRun(sampleId);
      }
      applyRunData(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setRunStatus('');
    }
  }

  async function handleRevalidate() {
    setError('');
    setBusy(true);
    try {
      const data = await validateIntake(intake);
      setTrace((prev) => [...prev, ...(data.trace || [])]);
      setHumanRecheckDone(true);
      if (!data.valid) {
        setError(`Validation: ${(data.errors || []).join(', ')}`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    setError('');
    setBusy(true);
    try {
      await saveIntake({ ...intake, raw_text: rawText });
      openList();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function selectSplit(row) {
    setIntake({ ...emptyIntake(), ...row });
  }

  const demonstrated = useMemo(
    () =>
      detectFeatures({
        trace,
        hasForm: agentFilled,
        classification,
        splits,
        humanRecheckDone,
      }),
    [trace, agentFilled, classification, splits, humanRecheckDone],
  );

  const showcaseActive = sampleId === 'agentic-showcase';

  return (
    <div className="app">
      <header className="top">
        <button type="button" className="brand" onClick={() => setScreen('landing')}>
          Harbor Intake
        </button>
        <nav>
          <button type="button" className={screen === 'intake' ? 'active' : ''} onClick={() => setScreen('intake')}>
            Intake
          </button>
          <button type="button" className={screen === 'list' ? 'active' : ''} onClick={openList}>
            Saved
          </button>
        </nav>
        <span className="pill">{storageMode() === 'supabase' ? 'Supabase' : 'Local save'}</span>
      </header>

      <main>
        {screen === 'landing' && (
          <section className="hero">
            <p className="eyebrow">Portco ops · logistics / WMS</p>
            <h1>Messy notes in. Structured tasks out.</h1>
            <p className="lede">
              Browser SaaS demo with seven agentic patterns: tool loop, structured fields, validate/retry, roster lookup,
              split tasks, routing, and human re-check — not a chat sidebar.
            </p>
            <ul className="bullets">
              <li>Start with <strong>Agentic showcase</strong> → Load sample run ($0)</li>
              <li>Edit a field → <strong>Agent re-validate</strong> to complete #7</li>
              <li>Interview URL: Vercel + localStorage (no DB pause)</li>
            </ul>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setSampleId('agentic-showcase');
                setRawText(getSample('agentic-showcase').paste);
                resetRunState();
                setScreen('intake');
              }}
            >
              Open agentic demo
            </button>
          </section>
        )}

        {screen === 'intake' && (
          <section className="panel">
            <h2>New intake</h2>
            {showcaseActive && !trace.length && (
              <p className="hint">
                Click <strong>Load sample run</strong> to walk through all seven patterns. Then edit owner and hit{' '}
                <strong>Agent re-validate</strong>.
              </p>
            )}
            <label className="field">
              <span>Example note (fills paste below)</span>
              <select
                value={sampleId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSampleId(id);
                  setRawText(getSample(id).paste);
                  resetRunState();
                }}
              >
                {SAMPLES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Paste email or warehouse note</span>
              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={defaultSample.paste}
              />
            </label>
            <button
              type="button"
              className="ghost sample-fill"
              onClick={() => {
                setRawText(getSample(sampleId).paste);
                resetRunState();
              }}
            >
              Use example text
            </button>
            <div className="row">
              <button type="button" className="primary" disabled={busy} onClick={() => handleRun(true)}>
                Run live agent
              </button>
              <button type="button" className="ghost" disabled={busy} onClick={() => handleRun(false)}>
                Load sample run
              </button>
            </div>
            {runStatus && (
              <p className="run-status" role="status" aria-live="polite">
                {runStatus}
              </p>
            )}
            {error && <p className="error">{error}</p>}
            {summary && <p className="summary">{summary}</p>}

            {trace.length > 0 && (
              <>
                <FeatureChecklist demonstrated={demonstrated} />
                <AgentTimeline
                  trace={trace}
                  showRaw={showRawTrace}
                  onToggleRaw={() => setShowRawTrace((v) => !v)}
                />
              </>
            )}

            {classification?.category && (
              <div className="route-banner">
                <span className="tag">{classification.category}</span>
                <span>Queue: {classification.queue}</span>
              </div>
            )}

            {splits.length > 1 && (
              <div className="split-panel">
                <h3>Split tasks ({splits.length})</h3>
                <p className="muted">Agent found multiple action items — pick one to edit and save.</p>
                <ul className="split-list">
                  {splits.map((row, i) => (
                    <li key={i}>
                      <button type="button" className="ghost split-card" onClick={() => selectSplit(row)}>
                        <strong>{row.title}</strong>
                        <span>{row.owner} · {row.priority}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(intake.title || intake.owner) && (
              <>
                <p className="form-hint">Structured output — fields filled by agent tools. Edit before save.</p>
                <div className={`grid ${agentFilled ? 'agent-filled' : ''}`}>
                  {['title', 'owner', 'priority', 'due_date', 'notes'].map((key) => (
                    <label key={key} className="field">
                      <span>{key.replace('_', ' ')}</span>
                      {key === 'priority' ? (
                        <select
                          value={intake.priority}
                          onChange={(e) => setIntake({ ...intake, priority: e.target.value })}
                        >
                          {['low', 'medium', 'high', 'urgent'].map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      ) : key === 'notes' ? (
                        <textarea
                          rows={3}
                          value={intake[key]}
                          onChange={(e) => setIntake({ ...intake, [key]: e.target.value })}
                        />
                      ) : (
                        <input
                          value={intake[key]}
                          onChange={(e) => setIntake({ ...intake, [key]: e.target.value })}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}

            {intake.title && (
              <div className="row">
                <button type="button" className="primary" disabled={busy} onClick={handleSave}>
                  Save to list
                </button>
                <button type="button" className="ghost" disabled={busy} onClick={handleRevalidate}>
                  Agent re-validate
                </button>
              </div>
            )}
          </section>
        )}

        {screen === 'list' && (
          <section className="panel">
            <div className="row spread">
              <h2>Saved intakes</h2>
              <button type="button" className="ghost" disabled={!rows.length} onClick={() => exportCsv(rows)}>
                Export CSV
              </button>
            </div>
            {listError && <p className="error">{listError}</p>}
            {!rows.length && <p className="muted">No rows yet. Run an intake and save.</p>}
            {rows.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Title</th>
                    <th>Owner</th>
                    <th>Priority</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{new Date(r.created_at).toLocaleString()}</td>
                      <td>{r.title}</td>
                      <td>{r.owner}</td>
                      <td><span className={`tag ${r.priority}`}>{r.priority}</span></td>
                      <td>{r.due_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </main>

      <footer className="foot">
        Demo stack: React (Vite) · localStorage on shared link · agent tools on Vercel serverless. Portco stack may differ.
      </footer>
    </div>
  );
}
