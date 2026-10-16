export const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

const GEMINI_OPENAI_BASE =
  process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/';

/** Prefer Gemini on Cheff URL ($0 quota); DeepSeek matches portco story. */
export function getLlmConfig() {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    return {
      provider: 'gemini',
      apiKey: geminiKey,
      baseURL: GEMINI_OPENAI_BASE,
      model: process.env.HARBOR_MODEL || 'gemini-3.8-flash',
    };
  }
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey) {
    return {
      provider: 'deepseek',
      apiKey: deepseekKey,
      baseURL: DEEPSEEK_BASE_URL,
      model: process.env.HARBOR_MODEL || 'deepseek-chat',
    };
  }
  return null;
}

export const HARBOR_MODEL = process.env.HARBOR_MODEL || 'deepseek-chat';

export function assertDemoAccess(req) {
  const token = process.env.DEMO_TOKEN;
  if (!token) return null;
  const header =
    req.headers['x-demo-token'] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (header !== token) {
    return 'This demo is private. Ask Jonathan for access.';
  }
  return null;
}
