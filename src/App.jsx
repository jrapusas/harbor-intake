import { useCallback, useMemo, useState } from 'react';
import AgentTimeline from './components/AgentTimeline.jsx';
import FeatureChecklist from './components/FeatureChecklist.jsx';
import { detectFeatures } from './lib/agentFeatures.js';
import { checkApiHealth, exportCsv, loadSampleRun, runAgent, validateIntake } from './lib/api.js';
import { DEFAULT_SAMPLE_ID, SAMPLES, getSample } from './lib/samples.js';
import { listIntakes, saveIntake, storageMode } from './lib/storage.js';

const defaultSample = getSample(DEFAULT_SAMPLE_ID);

const FIELD_LABELS = {
  title: 'Title',
  owner: 'Owner',
  priority: 'Priority',
  due_date: 'Due',
  notes: 'Notes',
};

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
  const [selectedSplit, setSelectedSplit] = useState(0);

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
    setSelectedSplit(0);
    setIntake(emptyIntake());
    setShowRawTrace(false);
  }

  function applyRunData(data) {
    setIntake({ ...emptyIntake(), ...data.intake });
    setSummary(data.summary || '');
    setTrace(data.trace || []);
    setClassification(data.classification || null);
    const nextSplits = data.splits || [];
    setSplits(nextSplits);
    setSelectedSplit(0);
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
        setRunStatus(`Processing note (${modelLabel})…`);
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

  function selectSplit(row, index) {
    setSelectedSplit(index);
    setIntake({ ...emptyIntake(), ...row });
    setHumanRecheckDone(false);
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
              Paste a warehouse email. Harbor turns it into tasks with owners, due dates, and a queue. You edit, then save.
            </p>
            <p className="lede">
              Agent runs the tools in the product: split, roster lookup, route, validate, then a human check before save.
            </p>
            <ul className="bullets">
              <li><strong>Use demo data</strong> walks a Monday triage with no API cost.</li>
              <li>Pick a task, change a field, then <strong>Re-check after my edits</strong>.</li>
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
              Start an intake
            </button>
          </section>
        )}

        {screen === 'intake' && (
          <section className="panel intake-layout">
            <div className="source-pane">
              <h2>Triage a note</h2>
              <p className="hint">Paste stays here. Tasks land on the right.</p>
              <label className="field">
                <span>Example note</span>
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
                <span>Email or warehouse note</span>
                <textarea
                  rows={12}
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
                Fill from example
              </button>
              <div className="row">
                <button type="button" className="primary" disabled={busy} onClick={() => handleRun(true)}>
                  Process note
                </button>
                <button type="button" className="ghost" disabled={busy} onClick={() => handleRun(false)}>
                  Use demo data
                </button>
              </div>
              <p className="hint">Demo data is free. Process note calls the model.</p>
              {runStatus && (
                <p className="run-status" role="status" aria-live="polite">
                  {runStatus}
                </p>
              )}
              {error && <p className="error">{error}</p>}
            </div>

            <div className="work-pane">
              {!intake.title && !summary && (
                <p className="muted empty-work">Tasks show up here after you process the note.</p>
              )}
              {summary && <p className="summary">{summary}</p>}

              {classification?.category && (
                <div className="route-banner">
                  <span className="tag">{classification.category}</span>
                  <span>Queue: {classification.queue}</span>
                </div>
              )}

              {splits.length > 1 && (
                <div className="split-panel">
                  <h3>Tasks ({splits.length})</h3>
                  <p className="muted">Pick one to edit and save.</p>
                  <ul className="split-list">
                    {splits.map((row, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          className={`ghost split-card${i === selectedSplit ? ' selected' : ''}`}
                          aria-pressed={i === selectedSplit}
                          onClick={() => selectSplit(row, i)}
                        >
                          <span className="split-card-top">
                            <strong>{row.title}</strong>
                            <span className={`tag ${row.priority}`}>{row.priority}</span>
                          </span>
                          <span>{row.owner} · due {row.due_date}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(intake.title || intake.owner) && (
                <>
                  <h3 className="editing-title">Editing: {intake.title || 'Untitled task'}</h3>
                  <div className={`grid ${agentFilled ? 'agent-filled' : ''}`}>
                    {Object.keys(FIELD_LABELS).map((key) => (
                      <label key={key} className="field">
                        <span>{FIELD_LABELS[key]}</span>
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
                    Save task
                  </button>
                  <button type="button" className="ghost" disabled={busy} onClick={handleRevalidate}>
                    Re-check after my edits
                  </button>
                </div>
              )}

              {showcaseActive && trace.length > 0 && (
                <details className="demo-patterns">
                  <summary>Demo: 7 patterns</summary>
                  <FeatureChecklist demonstrated={demonstrated} />
                </details>
              )}

              {trace.length > 0 && (
                <AgentTimeline
                  trace={trace}
                  showRaw={showRawTrace}
                  onToggleRaw={() => setShowRawTrace((v) => !v)}
                />
              )}
            </div>
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
