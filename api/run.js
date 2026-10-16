import { handleRunRequest } from '../lib/run-handler.mjs';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Demo-Token, Authorization');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { status, body } = await handleRunRequest(req);
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(status).json(body);
}
