import { GoogleGenAI } from '@google/genai';
import { runTool } from './tools.mjs';

const VERCEL_SYSTEM = `You are Harbor Intake for a logistics portco. Parse the user's ops paste into structured intake.

Reply with ONLY valid JSON (no markdown), shape:
{
  "summary": "one short sentence for human review",
  "intake": { "title", "owner", "priority", "due_date", "notes" },
  "classification": { "category": "warehouse|customs|carrier|general", "queue": "team queue label" },
  "splits": [ optional array of intake objects if multiple distinct tasks, max 5 ]
}

Rules: use roster names only when clearly in the text; priority one of low|medium|high|urgent; do not invent SKUs.`;

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Model did not return JSON intake.');
  return JSON.parse(candidate.slice(start, end + 1));
}

/** One Gemini round-trip for Vercel Hobby (10s function cap). */
export async function runHarborAgentGeminiFast({ rawText, apiKey, model }) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: `Raw ops text:\n\n${rawText}` }] }],
    config: { systemInstruction: VERCEL_SYSTEM },
  });

  const parsed = extractJsonObject(response.text);
  const trace = [];

  let splits = null;
  if (Array.isArray(parsed.splits) && parsed.splits.length > 1) {
    const splitResult = runTool('split_intakes', { intakes: parsed.splits });
    splits = splitResult.intakes;
    trace.push({ kind: 'tool', tool: 'split_intakes', input: { intakes: parsed.splits }, result: splitResult });
  }

  const extractInput = parsed.intake || {};
  const extractResult = runTool('extract_intake', extractInput);
  trace.push({ kind: 'tool', tool: 'extract_intake', input: extractInput, result: extractResult });

  const classInput = parsed.classification || {};
  const classResult = runTool('classify_intake', classInput);
  trace.push({ kind: 'tool', tool: 'classify_intake', input: classInput, result: classResult });

  const validateResult = runTool('validate_intake', extractResult.intake || extractInput);
  trace.push({ kind: 'tool', tool: 'validate_intake', result: validateResult });

  const intake = validateResult.intake || extractResult.intake;
  const classification =
    classResult.ok ? { category: classResult.category, queue: classResult.queue } : null;

  let summary = String(parsed.summary || '').trim();
  if (!summary) {
    summary = validateResult.valid
      ? 'Intake parsed and validated — ready for human review.'
      : `Validation issues: ${(validateResult.errors || []).join(', ')}`;
  }

  return {
    text: summary,
    trace,
    intake,
    classification,
    splits,
  };
}
