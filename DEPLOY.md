# Deploy Harbor Intake on Vercel (free tier)

## Cheff / interview URL (no pause)

For a link you send before a call:

1. Deploy on **Vercel Hobby** only.
2. Import GitHub repo **`jrapusas/harbor-intake`** (not the portfolio monorepo path).
3. **Root Directory:** `.` (repo root). Framework: **Vite** (`vercel.json`).
4. **Do not** set `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`. Save/list uses **localStorage** (pill: **Local save**).
5. Share the **Production** domain for this project (e.g. `harbor-intake-xxxx.vercel.app` from the Vercel project dashboard).  
   - A deployment URL like `harbor-intake-<hash>-<team>.vercel.app` is a **Preview** deploy — enable Preview env vars too (below).  
   - If **Deployment Protection** is on, guests see a Vercel login page — turn off for Production or use “Share” with protection disabled for interview links.
6. Sanity check you deployed **this** app: page title **Harbor Intake — portco ops** (React/Vite). Another project may own `harbor-intake.vercel.app` with a different stack.

---

## 1. Supabase (optional — local dev only)

Skip for the Cheff public deploy.

1. Create a free project.
2. Run `supabase/schema.sql` in the SQL Editor.
3. Local `.env` only: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

Supabase free tier **pauses** when idle — do not rely on it for a shared interview URL.

---

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

Server routes read `process.env` in `api/*.js` (`lib/config.mjs`). **`.env` is not uploaded to GitHub or Vercel.**

| Name | Environments | Notes |
|------|----------------|--------|
| `GEMINI_API_KEY` | **Production** + **Preview** | **Required for Run live agent** if using Gemini ([AI Studio](https://aistudio.google.com/apikey)). Checked **before** DeepSeek. Not `VITE_*`. |
| `DEEPSEEK_API_KEY` | Production + Preview | Optional alt; used only if `GEMINI_API_KEY` is unset/empty. |
| `HARBOR_MODEL` | Production + Preview | Optional. Default `gemini-3.8-flash` (Gemini) or `deepseek-chat` (DeepSeek). Example: `gemini-3.1-flash-lite-preview`. |
| `DEMO_TOKEN` | Production + Preview | Optional. Locks `POST /api/run` and `/api/validate` without header. |
| `VITE_DEMO_TOKEN` | Production + Preview | **Required if `DEMO_TOKEN` is set** — same value; baked into the client at **build** time. |
| `VITE_SUPABASE_URL` | — | **Cheff URL: omit** |
| `VITE_SUPABASE_ANON_KEY` | — | **Cheff URL: omit** |

After adding or changing any variable: **Deployments → … → Redeploy** (existing deployments do not pick up new secrets).

`VITE_*` changes need a **new build** (redeploy). Server-only vars (`GEMINI_API_KEY`, etc.) also require redeploy to affect running serverless functions.

---

## 3. Verify live agent

1. Open `https://<your-production-domain>/api/health` (same origin as the app; no `VITE_` prefix).
2. Expect JSON like: `"has_llm_key": true`, `"provider": "gemini"`, `"model": "…"`.
3. If `"has_llm_key": false`: key missing, empty, or only set for the wrong environment (Preview vs Production). Fix env → redeploy.

UI **Load sample run** does not need keys. **Run live agent** calls `POST /api/run` and needs a server key.

---

## 4. Hobby limits

- `maxDuration: 10` on `/api/run` and `/api/validate` (`vercel.json`).
- **Production** uses a **single Gemini call** (`lib/agent-gemini-fast.mjs`) so **Run live agent** can finish under 10s. Local dev uses the full multi-turn tool loop.
- `/api/health` shows `"agent_mode": "single_call"` on Vercel.
- If live agent still fails, demo **Load sample run** on the call.

---

## 5. Message to Cheff

```text
Harbor Intake — browser SaaS demo (React + agent tools on Vercel):
https://YOUR-PRODUCTION-DOMAIN.vercel.app

“Load sample run” works without API spend. Save/list works in the browser on this link.
“Run live agent” uses Gemini (or DeepSeek) on the server — set GEMINI_API_KEY on Vercel.
```
