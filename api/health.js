import { handleHealthRequest } from '../lib/run-handler.mjs';

export default function handler(_req, res) {
  const { status, body } = handleHealthRequest();
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(status).json(body);
}
