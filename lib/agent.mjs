import OpenAI from 'openai';
import { runHarborAgentGemini } from './agent-gemini.mjs';
import { runHarborAgentGeminiFast } from './agent-gemini-fast.mjs';
import { HARBOR_AGENT_SYSTEM } from './agent-system.mjs';
import { runTool, toolDefinitions } from './tools.mjs';

const MAX_TURNS = process.env.VERCEL ? 8 : 10;

export async function runHarborAgent({ rawText, apiKey, baseURL, model, provider }) {
  if (provider === 'gemini') {
    if (process.env.VERCEL) {
      return runHarborAgentGeminiFast({ rawText, apiKey, model });
    }
    return runHarborAgentGemini({ rawText, apiKey, model });
  }

  const client = new OpenAI({ apiKey, baseURL });
  const messages = [
    { role: 'system', content: HARBOR_AGENT_SYSTEM },
    { role: 'user', content: `Raw ops text:\n\n${rawText}` },
  ];
  const trace = [];
  let lastIntake = null;
  let classification = null;
  let splits = null;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 1024,
      messages,
      tools: toolDefinitions,
      tool_choice: 'auto',
    });

    const choice = response.choices[0];
    const msg = choice.message;
    trace.push({ kind: 'turn', turn, finish_reason: choice.finish_reason });

    messages.push(msg);

    const toolCalls = msg.tool_calls || [];
    if (toolCalls.length === 0) {
      const text = msg.content || '';
      return { text, trace, intake: lastIntake, classification, splits };
    }

    for (const call of toolCalls) {
      const name = call.function.name;
      let input = {};
      try {
        input = JSON.parse(call.function.arguments || '{}');
      } catch {
        input = {};
      }
      const result = runTool(name, input);
      if (name === 'extract_intake' && result.intake) lastIntake = result.intake;
      if (name === 'validate_intake' && result.intake) lastIntake = result.intake;
      if (name === 'classify_intake' && result.ok) {
        classification = { category: result.category, queue: result.queue };
      }
      if (name === 'split_intakes' && result.intakes?.length) {
        splits = result.intakes;
        if (!lastIntake) lastIntake = result.intakes[0];
      }
      trace.push({ kind: 'tool', tool: name, input, result });
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    text: 'Agent stopped after max turns. Review fields below.',
    trace,
    intake: lastIntake,
    classification,
    splits,
  };
}
