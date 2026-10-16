import { lookupContact } from './roster.mjs';

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'split_intakes',
      description: 'When paste has multiple distinct action items, return one object per task (max 5).',
      parameters: {
        type: 'object',
        properties: {
          intakes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                owner: { type: 'string' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                due_date: { type: 'string' },
                notes: { type: 'string' },
              },
              required: ['title'],
            },
          },
        },
        required: ['intakes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_contact',
      description: 'Resolve a person name to official role and queue from the portco roster.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Full or partial name' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'classify_intake',
      description: 'Assign ops category and routing queue for triage.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['warehouse', 'customs', 'carrier', 'general'],
          },
          queue: { type: 'string', description: 'Team queue label' },
        },
        required: ['category', 'queue'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_intake',
      description: 'Parse messy ops text into structured intake fields for the primary task.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short task title' },
          owner: { type: 'string', description: 'Who should act' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          due_date: { type: 'string', description: 'ISO date or human phrase' },
          notes: { type: 'string', description: 'Extra context' },
        },
        required: ['title', 'owner', 'priority', 'due_date', 'notes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_intake',
      description: 'Check required intake fields before save.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          owner: { type: 'string' },
          priority: { type: 'string' },
          due_date: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['title', 'owner', 'priority'],
      },
    },
  },
];

function normalizeIntake(input) {
  return {
    title: String(input.title || '').trim(),
    owner: String(input.owner || '').trim(),
    priority: String(input.priority || 'medium').trim(),
    due_date: String(input.due_date || '').trim(),
    notes: String(input.notes || '').trim(),
  };
}

export function runTool(name, input) {
  if (name === 'split_intakes') {
    const list = Array.isArray(input.intakes) ? input.intakes.slice(0, 5) : [];
    const intakes = list.map((row) => normalizeIntake(row));
    return { ok: true, count: intakes.length, intakes };
  }
  if (name === 'lookup_contact') {
    return lookupContact(input.query);
  }
  if (name === 'classify_intake') {
    return {
      ok: true,
      category: String(input.category || 'general').trim(),
      queue: String(input.queue || 'General ops').trim(),
    };
  }
  if (name === 'extract_intake') {
    const intake = normalizeIntake(input);
    return { ok: true, intake };
  }
  if (name === 'validate_intake') {
    const intake = normalizeIntake(input);
    const errors = [];
    if (!intake.title) errors.push('title required');
    if (!intake.owner) errors.push('owner required');
    if (!intake.priority) errors.push('priority required');
    return { valid: errors.length === 0, errors, intake };
  }
  return { error: `unknown tool: ${name}` };
}
