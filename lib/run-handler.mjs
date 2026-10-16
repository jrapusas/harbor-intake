import { runHarborAgent } from './agent.mjs';
import { assertDemoAccess, getLlmConfig, missingLlmKeyMessage } from './config.mjs';
import { formatLlmError, httpStatusForLlmError } from './llm-errors.mjs';
import { runTool } from './tools.mjs';

function parseBody(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      return {};
    }
  }
  return req.body || {};
}

export async function handleRunRequest(req) {
  const denied = assertDemoAccess(req);
  if (denied) {
    return { status: 401, body: { error: denied } };
  }

  const llm = getLlmConfig();
  if (!llm) {
    return {
      status: 503,
      body: {
        error: missingLlmKeyMessage(),
      },
    };
  }

  const body = parseBody(req);
  const rawText = String(body.rawText || body.text || '').trim();
  if (!rawText) {
    return { status: 400, body: { error: 'rawText is required' } };
  }

  try {
    const { text, trace, intake, classification, splits } = await runHarborAgent({
      rawText,
      apiKey: llm.apiKey,
      baseURL: llm.baseURL,
      model: llm.model,
      provider: llm.provider,
    });
    if (!intake) {
      return {
        status: 422,
        body: { error: 'Agent did not produce intake fields.', trace, summary: text },
      };
    }
    return {
      status: 200,
      body: {
        summary: text,
        trace,
        intake,
        classification,
        splits,
        model: llm.model,
        provider: llm.provider,
      },
    };
  } catch (err) {
    return {
      status: httpStatusForLlmError(err),
      body: {
        error: formatLlmError(err, { model: llm.model, provider: llm.provider }),
      },
    };
  }
}

/** Human-in-the-loop: re-run validate_intake on edited fields (#7). */
export async function handleValidateRequest(req) {
  const denied = assertDemoAccess(req);
  if (denied) {
    return { status: 401, body: { error: denied } };
  }

  const body = parseBody(req);
  const intake = body.intake || {};
  const result = runTool('validate_intake', intake);
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
  return {
    status: 200,
    body: { valid: result.valid, errors: result.errors || [], trace },
  };
}

export function handleHealthRequest() {
  const llm = getLlmConfig();
  const onVercel = Boolean(process.env.VERCEL);
  return {
    status: 200,
    body: {
      ok: true,
      model: llm?.model ?? null,
      provider: llm?.provider ?? null,
      has_llm_key: Boolean(llm),
      platform: onVercel ? 'vercel' : 'local',
      agent_mode: onVercel ? 'single_call' : 'tool_loop',
      max_duration_sec: onVercel ? 10 : null,
      hint: !llm && onVercel ? missingLlmKeyMessage() : undefined,
    },
  };
}
