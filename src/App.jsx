import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AgentTimeline from './components/AgentTimeline.jsx';
import FeatureChecklist from './components/FeatureChecklist.jsx';
import { detectFeatures } from './lib/agentFeatures.js';
import { checkApiHealth, exportCsv, loadSampleRun, runAgent, validateIntake } from './lib/api.js';
import { DEFAULT_SAMPLE_ID, SAMPLES, getSample } from './lib/samples.js';
import { listIntakes, saveIntake, storageMode } from './lib/storage.js';
import { validateIntakeLocal } from './lib/validateLocal.js';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const emptyIntake = () => ({
  title: '',
  owner: '',
  priority: 'medium',
  due_date: '',
  notes: '',
});

const toTask = (row) => ({ ...emptyIntake(), ...row, saved: false, check: null });

const missingFields = (errors = []) => errors.map((e) => e.replace(/ required$/, '')).join(', ');

const formatWhen = (iso) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function App() {
  const [screen, setScreen] = useState('intake');
  const [sampleId, setSampleId] = useState(DEFAULT_SAMPLE_ID);
  const [rawText, setRawText] = useState(getSample(DEFAULT_SAMPLE_ID).paste);
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const [classification, setClassification] = useState(null);
  const [summary, setSummary] = useState('');
  const [trace, setTrace] = useState([]);
  const [showRawTrace, setShowRawTrace] = useState(false);
  const [humanRecheckDone, setHumanRecheckDone] = useState(false);
  const [busy, setBusy] = useState('');
  const [runError, setRunError] = useState('');
  const [taskError, setTaskError] = useState('');
  const [rows, setRows] = useState([]);
  const [listError, setListError] = useState('');
  const workPaneRef = useRef(null);

  const task = tasks[selected];
  const savedCount = tasks.filter((t) => t.saved).length;
  const allSaved = tasks.length > 0 && savedCount === tasks.length;

  const refreshList = useCallback(async () => {
    try {
      setListError('');
      setRows(await listIntakes());
    } catch (e) {
      setListError(e.message);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  function resetRun() {
    setTasks([]);
    setSelected(0);
    setHasRun(false);
    setClassification(null);
    setSummary('');
    setTrace([]);
    setShowRawTrace(false);
    setHumanRecheckDone(false);
    setRunError('');
    setTaskError('');
  }

  function pickSample(id) {
    setSampleId(id);
    setRawText(getSample(id).paste);
    resetRun();
  }

  function applyRunData(data) {
    const splits = data.splits?.length > 1 ? data.splits : null;
    const rowsFromRun = splits || (data.intake?.title ? [data.intake] : []);
    setTasks(rowsFromRun.map(toTask));
    setSelected(0);
    setHasRun(true);
    setClassification(data.classification || null);
    setSummary(data.summary || '');
    setTrace(data.trace || []);
    setHumanRecheckDone(false);
    if (window.matchMedia('(max-width: 860px)').matches) {
      requestAnimationFrame(() => workPaneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  async function handleRun(live) {
    if (busy) return;
    if (live && !rawText.trim()) return;
    resetRun();
    setBusy(live ? 'run' : 'demo');
    try {
      let data;
      if (live) {
        await checkApiHealth();
        data = await runAgent(rawText);
      } else {
        setRawText(getSample(sampleId).paste);
        data = await loadSampleRun(sampleId);
      }
      applyRunData(data);
    } catch (e) {
      setRunError(e.message);
    } finally {
      setBusy('');
    }
  }

  function updateTask(patch) {
    setTaskError('');
    setTasks((prev) => prev.map((t, i) => (i === selected ? { ...t, ...patch, check: null } : t)));
  }

  function setCheck(index, check) {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, check } : t)));
  }

  async function handleRecheck() {
    if (!task || busy) return;
    const index = selected;
    setTaskError('');
    setBusy('check');
    try {
      const data = await validateIntake(task);
      setTrace((prev) => [...prev, ...(data.trace || [])]);
      setHumanRecheckDone(true);
      setCheck(index, { valid: data.valid, errors: data.errors || [] });
    } catch (e) {
      setTaskError(e.message);
    } finally {
      setBusy('');
    }
  }

  async function handleSave() {
    if (!task || busy) return;
    const index = selected;
    const check = validateIntakeLocal(task);
    if (!check.valid) {
      setCheck(index, { valid: false, errors: check.errors });
      return;
    }
    setTaskError('');
    setBusy('save');
    try {
      await saveIntake({ ...task, raw_text: rawText });
      const next = tasks.map((t, i) => (i === index ? { ...t, saved: true } : t));
      setTasks(next);
      const nextOpen = next.findIndex((t, i) => !t.saved && i > index);
      const anyOpen = nextOpen === -1 ? next.findIndex((t) => !t.saved) : nextOpen;
      if (anyOpen !== -1) setSelected(anyOpen);
      refreshList();
    } catch (e) {
      setTaskError(e.message);
    } finally {
      setBusy('');
    }
  }

  function openList() {
    setScreen('list');
    refreshList();
  }

  const demonstrated = useMemo(
    () =>
      detectFeatures({
        trace,
        hasForm: tasks.length > 0,
        classification,
        splits: tasks,
        humanRecheckDone,
      }),
    [trace, tasks, classification, humanRecheckDone],
  );

  const showcaseActive = sampleId === 'agentic-showcase';

  return (
    <div className="app">
      <header className="top">
        <button type="button" className="brand" onClick={() => setScreen('intake')}>
          Harbor Intake
        </button>
        <nav aria-label="Main">
          <button
            type="button"
            className={screen === 'intake' ? 'active' : ''}
            aria-current={screen === 'intake' ? 'page' : undefined}
            onClick={() => setScreen('intake')}
          >
            Triage
          </button>
          <button
            type="button"
            className={screen === 'list' ? 'active' : ''}
            aria-current={screen === 'list' ? 'page' : undefined}
            onClick={openList}
          >
            Saved{rows.length > 0 && <span className="count">{rows.length}</span>}
          </button>
        </nav>
        <span className="pill">{storageMode() === 'supabase' ? 'Synced' : 'Saved on this device'}</span>
      </header>

      <main>
        {screen === 'intake' && (
          <section className="intake-layout">
            <div className="source-pane">
              <div className="pane-head">
                <h1>Triage a note</h1>
                <label className="inline-select">
                  <span>Example</span>
                  <select value={sampleId} onChange={(e) => pickSample(e.target.value)}>
                    {SAMPLES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span>Email, Slack, or floor note</span>
                <textarea
                  rows={14}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleRun(true);
                  }}
                  placeholder="Paste the message here. Harbor pulls out each task, owner, and due date."
                />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="primary"
                  disabled={Boolean(busy) || !rawText.trim()}
                  onClick={() => handleRun(true)}
                >
                  {busy === 'run' ? 'Reading note…' : 'Process note'}
                </button>
                <button type="button" className="ghost" disabled={Boolean(busy)} onClick={() => handleRun(false)}>
                  {busy === 'demo' ? 'Loading…' : 'Use demo data'}
                </button>
                <span className="hint keys"><kbd>⌘</kbd><kbd>Enter</kbd> to process</span>
              </div>
              {runError && (
                <p className="alert error" role="alert">
                  {runError}
                </p>
              )}
            </div>

            <div ref={workPaneRef} className="work-pane" aria-live="polite" aria-busy={busy === 'run' || busy === 'demo'}>
              {(busy === 'run' || busy === 'demo') && (
                <div className="skeleton" aria-label="Reading note">
                  <span />
                  <span />
                  <span />
                </div>
              )}

              {!busy && !hasRun && (
                <div className="empty">
                  <h2>Tasks show up here</h2>
                  <p>
                    Process the note and Harbor splits it into tasks, matches owners from the roster, and suggests a
                    queue. You review each one before it is saved.
                  </p>
                </div>
              )}

              {!busy && hasRun && tasks.length === 0 && (
                <div className="empty">
                  <h2>No task found</h2>
                  <p>Add who should act and by when, then process the note again.</p>
                </div>
              )}

              {tasks.length > 0 && (
                <>
                  <div className="work-head">
                    <h2>
                      {tasks.length === 1 ? '1 task' : `${tasks.length} tasks`}
                      {savedCount > 0 && <span className="muted"> · {savedCount} saved</span>}
                    </h2>
                    {classification?.queue && (
                      <span className="queue">
                        <span className="tag">{classification.category}</span>
                        {classification.queue}
                      </span>
                    )}
                  </div>

                  {tasks.length > 1 && (
                    <ul className="task-list">
                      {tasks.map((t, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            className={`task-card${i === selected ? ' selected' : ''}${t.saved ? ' saved' : ''}`}
                            aria-current={i === selected ? 'true' : undefined}
                            onClick={() => {
                              setTaskError('');
                              setSelected(i);
                            }}
                          >
                            <span className="task-card-top">
                              <strong>{t.title || 'Untitled task'}</strong>
                              {t.saved ? (
                                <span className="tag ok">Saved</span>
                              ) : (
                                <span className={`tag ${t.priority}`}>{t.priority}</span>
                              )}
                            </span>
                            <span className="muted">
                              {t.owner || 'No owner'}
                              {t.due_date && ` · due ${t.due_date}`}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {allSaved ? (
                    <div className="all-saved">
                      <h3>All tasks saved</h3>
                      <p className="muted">Paste the next note, or review what you saved.</p>
                      <div className="row">
                        <button type="button" className="primary" onClick={openList}>
                          View saved
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => {
                            setRawText('');
                            resetRun();
                          }}
                        >
                          New note
                        </button>
                      </div>
                    </div>
                  ) : (
                    task && (
                      <form
                        className="editor"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSave();
                        }}
                      >
                        <p className="hint">
                          {task.saved ? 'Saved. Edits here will not change the saved copy.' : 'Filled from the note. Check it before saving.'}
                        </p>
                        <label className="field">
                          <span>Title</span>
                          <input value={task.title} onChange={(e) => updateTask({ title: e.target.value })} />
                        </label>
                        <div className="field-row">
                          <label className="field">
                            <span>Owner</span>
                            <input
                              value={task.owner}
                              onChange={(e) => updateTask({ owner: e.target.value })}
                              aria-invalid={task.check?.errors?.includes('owner required') || undefined}
                            />
                          </label>
                          <label className="field">
                            <span>Priority</span>
                            <select value={task.priority} onChange={(e) => updateTask({ priority: e.target.value })}>
                              {PRIORITIES.map((p) => (
                                <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span>Due</span>
                            <input
                              value={task.due_date}
                              placeholder="e.g. Friday"
                              onChange={(e) => updateTask({ due_date: e.target.value })}
                            />
                          </label>
                        </div>
                        <label className="field">
                          <span>Notes</span>
                          <textarea rows={3} value={task.notes} onChange={(e) => updateTask({ notes: e.target.value })} />
                        </label>

                        {task.check && (
                          <p className={`alert ${task.check.valid ? 'success' : 'error'}`} role="status">
                            {task.check.valid
                              ? 'Looks complete. Ready to save.'
                              : `Missing ${missingFields(task.check.errors)}. Fill it in, then save.`}
                          </p>
                        )}
                        {taskError && (
                          <p className="alert error" role="alert">
                            {taskError}
                          </p>
                        )}

                        <div className="row">
                          <button type="submit" className="primary" disabled={Boolean(busy) || task.saved}>
                            {busy === 'save' ? 'Saving…' : task.saved ? 'Saved' : 'Save task'}
                          </button>
                          <button type="button" className="ghost" disabled={Boolean(busy)} onClick={handleRecheck}>
                            {busy === 'check' ? 'Checking…' : 'Re-check task'}
                          </button>
                        </div>
                      </form>
                    )
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {screen === 'list' && (
          <section>
            <div className="row spread list-head">
              <h1>Saved tasks</h1>
              <button type="button" className="ghost" disabled={!rows.length} onClick={() => exportCsv(rows)}>
                Export CSV
              </button>
            </div>
            {listError && (
              <p className="alert error" role="alert">
                {listError}
              </p>
            )}
            {!rows.length && !listError && (
              <div className="empty">
                <h2>Nothing saved yet</h2>
                <p>Saved tasks land here with owner, priority, and due date, ready to export.</p>
                <button type="button" className="primary" onClick={() => setScreen('intake')}>
                  Triage a note
                </button>
              </div>
            )}
            {rows.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Task</th>
                      <th scope="col">Owner</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Due</th>
                      <th scope="col">Saved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.title}</strong>
                          {r.notes && <span className="cell-note">{r.notes}</span>}
                        </td>
                        <td>{r.owner}</td>
                        <td><span className={`tag ${r.priority}`}>{r.priority}</span></td>
                        <td>{r.due_date || '—'}</td>
                        <td className="nowrap muted">{formatWhen(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="foot">
        <p>
          The agent splits the note, looks up owners, routes a queue, validates, then waits for a human check before
          save. Use demo data is free. Process note calls the model.
        </p>
        <p>
          React app, save in this browser on the shared link, agent tools on the server. A portco build can use the
          same shape on Vue or React with Supabase.
        </p>
        {summary && <p className="summary">{summary}</p>}
        {showcaseActive && trace.length > 0 && <FeatureChecklist demonstrated={demonstrated} />}
        {trace.length > 0 && (
          <AgentTimeline
            trace={trace}
            showRaw={showRawTrace}
            onToggleRaw={() => setShowRawTrace((v) => !v)}
          />
        )}
      </footer>
    </div>
  );
}
