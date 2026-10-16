/** @returns {{ code?: number; status?: string; message?: string } | null} */
export function parseGoogleApiError(err) {
  if (err?.error && typeof err.error === 'object') return err.error;
  const msg = String(err?.message ?? '');
  const jsonStart = msg.indexOf('{"error"');
  if (jsonStart === -1) return null;
  try {
    const parsed = JSON.parse(msg.slice(jsonStart));
    return parsed?.error ?? null;
  } catch {
    return null;
  }
}

export function isRetryableGeminiError(err) {
  const nested = parseGoogleApiError(err);
  const code = nested?.code ?? err?.status;
  const status = nested?.status;
  if (code === 503 || code === 429 || status === 'UNAVAILABLE' || status === 'RESOURCE_EXHAUSTED') {
    return true;
  }
  const msg = String(nested?.message ?? err?.message ?? '');
  return /high demand|try again later|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(msg);
}

export function formatLlmError(err, { model, provider } = {}) {
  const nested = parseGoogleApiError(err);
  const message = nested?.message || err?.message || String(err);
  const code = nested?.code ?? err?.status;

  if (code === 503 || nested?.status === 'UNAVAILABLE') {
    return (
      `Gemini is busy (${model || 'model'}). Wait a minute and retry, use Load sample run for the demo, ` +
      `or set HARBOR_MODEL to another Gemini model in env. DeepSeek works if you unset GEMINI_API_KEY.`
    );
  }

  if (code === 404 || nested?.status === 'NOT_FOUND') {
    return `${message} (model: ${model}). Set HARBOR_MODEL=gemini-3.1-flash-lite-preview (or another valid model) and redeploy.`;
  }

  return provider ? `${message} (${provider}, ${model})` : message;
}

export function httpStatusForLlmError(err) {
  const nested = parseGoogleApiError(err);
  const code = nested?.code ?? err?.status;
  if (code === 503 || nested?.status === 'UNAVAILABLE') return 503;
  if (code === 404 || nested?.status === 'NOT_FOUND') return 502;
  if (code === 429 || nested?.status === 'RESOURCE_EXHAUSTED') return 503;
  return 500;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
