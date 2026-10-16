/** Same rules as lib/tools.mjs validate_intake — for local UI when API is down. */

export function validateIntakeLocal(intake) {
  const title = String(intake?.title || '').trim();
  const owner = String(intake?.owner || '').trim();
  const priority = String(intake?.priority || '').trim();
  const errors = [];
  if (!title) errors.push('title required');
  if (!owner) errors.push('owner required');
  if (!priority) errors.push('priority required');
  const valid = errors.length === 0;
  const result = {
    valid,
    errors,
    intake: {
      title,
      owner,
      priority,
      due_date: String(intake?.due_date || '').trim(),
      notes: String(intake?.notes || '').trim(),
    },
  };
  const trace = [
    {
      kind: 'tool',
      tool: 'validate_intake',
      feature: 7,
      humanRecheck: true,
      input: intake,
      result,
    },
  ];
  return { valid, errors, trace };
}
