/** Top 7 agentic patterns — labels for demo checklist and timeline. */

export const AGENT_FEATURES = [
  { id: 1, key: 'toolLoop', label: 'Tool loop (visible steps)' },
  { id: 2, key: 'structured', label: 'Structured output in the product' },
  { id: 3, key: 'retry', label: 'Validate → fix → validate' },
  { id: 4, key: 'lookup', label: 'Grounding (roster lookup)' },
  { id: 5, key: 'split', label: 'Split paste → multiple tasks' },
  { id: 6, key: 'classify', label: 'Classify + route' },
  { id: 7, key: 'humanRecheck', label: 'Human edit → agent re-check' },
];

export function detectFeatures({ trace = [], hasForm, classification, splits, humanRecheckDone }) {
  const tools = trace.filter((t) => t.tool || (t.kind === 'tool' && t.tool));
  const toolNames = tools.map((t) => t.tool);

  const hasValidateFail = tools.some(
    (t) => t.tool === 'validate_intake' && t.result?.valid === false,
  );
  const hasValidateOk = tools.some(
    (t) => t.tool === 'validate_intake' && t.result?.valid === true,
  );

  return {
    1: tools.length >= 2,
    2: Boolean(hasForm),
    3: hasValidateFail && hasValidateOk,
    4: toolNames.includes('lookup_contact'),
    5: toolNames.includes('split_intakes') || (splits && splits.length > 1),
    6: toolNames.includes('classify_intake') || Boolean(classification?.category),
    7: Boolean(humanRecheckDone),
  };
}

export function toolLabel(tool, result) {
  if (tool === 'split_intakes') return `Split into ${result?.count ?? '?'} tasks`;
  if (tool === 'lookup_contact') {
    if (result?.found && result.contact) return `Lookup: ${result.contact.name} → ${result.contact.role}`;
    return `Lookup: ${result?.found ? 'ambiguous matches' : 'no match'}`;
  }
  if (tool === 'classify_intake') return `Route: ${result?.category} → ${result?.queue}`;
  if (tool === 'extract_intake') return 'Extract fields into form';
  if (tool === 'validate_intake') {
    if (result?.valid === false) return `Validate failed (${(result.errors || []).join(', ')})`;
    return 'Validate passed';
  }
  return tool;
}
