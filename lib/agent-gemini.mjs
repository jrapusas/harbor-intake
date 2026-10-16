import { GoogleGenAI } from '@google/genai';
import { HARBOR_AGENT_SYSTEM } from './agent-system.mjs';
import { isRetryableGeminiError, sleep } from './llm-errors.mjs';
import { runTool, toolDefinitions } from './tools.mjs';

const MAX_TURNS = process.env.VERCEL ? 8 : 10;
const RETRY_DELAYS_MS = [2000, 4000, 8000];

async function generateWithRetry(ai, params) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      lastErr = err;
      if (!isRetryableGeminiError(err) || attempt >= RETRY_DELAYS_MS.length) throw err;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastErr;
}

function geminiDeclarations() {
  return toolDefinitions.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    parametersJsonSchema: t.function.parameters,
  }));
}

function applyToolResult(name, result, state) {
  if (name === 'extract_intake' && result.intake) state.lastIntake = result.intake;
  if (name === 'validate_intake' && result.intake) state.lastIntake = result.intake;
  if (name === 'classify_intake' && result.ok) {
    state.classification = { category: result.category, queue: result.queue };
  }
  if (name === 'split_intakes' && result.intakes?.length) {
    state.splits = result.intakes;
    if (!state.lastIntake) state.lastIntake = result.intakes[0];
  }
}

export async function runHarborAgentGemini({ rawText, apiKey, model }) {
  const ai = new GoogleGenAI({ apiKey });
  const declarations = geminiDeclarations();
  const contents = [
    { role: 'user', parts: [{ text: `Raw ops text:\n\n${rawText}` }] },
  ];
  const trace = [];
  const state = {
    lastIntake: null,
    classification: null,
    splits: null,
  };

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await generateWithRetry(ai, {
      model,
      contents,
      config: {
        systemInstruction: HARBOR_AGENT_SYSTEM,
        tools: [{ functionDeclarations: declarations }],
      },
    });

    trace.push({ kind: 'turn', turn, finish_reason: response.functionCalls?.length ? 'tool_calls' : 'stop' });

    const calls = response.functionCalls;
    if (!calls?.length) {
      return {
        text: response.text || '',
        trace,
        intake: state.lastIntake,
        classification: state.classification,
        splits: state.splits,
      };
    }

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);

    for (const call of calls) {
      const name = call.name;
      const input = call.args && typeof call.args === 'object' ? call.args : {};
      const result = runTool(name, input);
      applyToolResult(name, result, state);
      trace.push({ kind: 'tool', tool: name, input, result });
      contents.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name,
              response: result,
            },
          },
        ],
      });
    }
  }

  return {
    text: 'Agent stopped after max turns. Review fields below.',
    trace,
    intake: state.lastIntake,
    classification: state.classification,
    splits: state.splits,
  };
}
