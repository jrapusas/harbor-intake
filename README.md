# Harbor Intake (Cheff demo)

Small **browser SaaS** for a fictional logistics portco: paste messy ops text, **DeepSeek agent + tools** (`extract_intake`, `validate_intake`), edit, **save** (Supabase or localStorage), **export CSV**.

**Stack alignment with Cheff’s recent ship:** React, Supabase, DeepSeek agentic features. API is Node on Vercel (same role as Python/Spring in a portco).

## Free tier

| Piece | Service |
|-------|---------|
| Host + API | [Vercel Hobby](https://vercel.com) — no sleep pause |
| Persist (Cheff URL) | **localStorage** — omit Supabase env on Vercel (Supabase free **pauses** when idle) |
| Persist (optional) | [Supabase](https://supabase.com) for local dev or non-Cheff deploys only |
| LLM (live) | [Gemini API](https://aistudio.google.com/apikey) free quota, or [DeepSeek](https://platform.deepseek.com) (cheap) |

**Cheff / shared link:** see `jobsearch/jon/applications/cheff/demo-hosting-free-tier.md`.

Public URL: use **Load sample run** (no API spend). Share **Run agent** with Cheff only, or set `DEMO_TOKEN`.

## Quick start (local)

```bash
npm install
cp .env.example .env
```

### Agentic showcase (no API key)

```bash
npm run dev
```

Open http://localhost:5173 → **Start an intake** → **Use demo data** → edit owner → **Re-check after my edits** → **Save task**.

Re-validate works in the browser if the API is not running. **Run live agent** needs the API (below).

### UI + API (live agent)

```bash
npm run dev:local
```

Same as two terminals (`dev:api` on :3848 + `dev` on :5173). Add `GEMINI_API_KEY` or `DEEPSEEK_API_KEY` to `.env` for **Run live agent**. New AI Studio keys (`AQ.…`) use the native Gemini SDK on the server (not the OpenAI shim).

Or manually:

```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev
```

### Production-like (built static + API)

```bash
npm run build && npm start
```

Open http://localhost:3848

## Supabase (local dev only — not the Cheff URL)

Optional if you want to test the Supabase path on your machine. **Do not** wire Supabase into the Vercel project you send before a call (free tier pauses).

1. SQL Editor → `supabase/schema.sql`
2. `.env`: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`

Cheff link checklist: `../../jobsearch/jon/applications/cheff/LIVE-DEMO.md`

## Deploy

See [DEPLOY.md](./DEPLOY.md). Vercel root: **repo root** (`.`).

## 2-minute demo script (top 7 agentic patterns)

1. Landing → **Start an intake**
2. **Use demo data** on **Monday triage** — seven patterns and the tool trace sit at the bottom
3. Point at split tasks, route banner, validate retry in timeline
4. Edit **owner** → **Re-check after my edits** (checks off #7) → **Save task** → **Export CSV**
5. Say: *“Same product shape as your Vue/React + Supabase + DeepSeek builds; I’d match the next portco’s stack.”*

## Cheff folder

Strategy notes: `../../jobsearch/jon/applications/cheff/demo-recommendation-harbor.md`
