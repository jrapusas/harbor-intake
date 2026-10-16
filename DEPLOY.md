# Deploy Harbor Intake on Vercel (free tier)

## Cheff / interview URL (no pause)

For a link you send before a call:

1. Deploy on **Vercel Hobby** only.
2. **Do not** set `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` on that project. Save/list uses **localStorage** (instant, no Supabase pause).
3. Confirm the app pill says **Local save**.

Full policy: `jobsearch/jon/applications/cheff/demo-hosting-free-tier.md`

---

## 1. Supabase (optional — local dev or paid/active project only)

Skip this section for the Cheff public deploy.

1. Create a free project.
2. Run `supabase/schema.sql` in the SQL Editor.
3. Copy **Project URL** and **anon public** key.

Wake the project before a demo if you rely on Supabase. Free tier **pauses** when idle.

---

## 2. Vercel project

1. [vercel.com/new](https://vercel.com/new) → import repo.
2. **Root Directory:** `.` (repo root)
3. Framework: **Vite** (from `vercel.json`).

### Environment variables

| Name | Where | Notes |
|------|--------|--------|
| `GEMINI_API_KEY` | Server | **$0 live agent** ([AI Studio](https://aistudio.google.com/apikey)); checked first |
| `DEEPSEEK_API_KEY` | Server | Alt live agent (low cost) |
| `HARBOR_MODEL` | Server | Optional; default `gemini-3.8-flash` or `deepseek-chat` per key |
| `DEMO_TOKEN` | Server | Optional; require header on `/api/run` |
| `VITE_DEMO_TOKEN` | Build | Same as `DEMO_TOKEN` if you lock the API |
| `VITE_SUPABASE_URL` | Build | **Cheff URL: omit** |
| `VITE_SUPABASE_ANON_KEY` | Build | **Cheff URL: omit** |

Redeploy after changing `VITE_*` vars.

---

## 3. Hobby limits

- `maxDuration: 10` on `/api/run` — keep agent to a few tool rounds (already capped in code).
- If DeepSeek is slow, demo **Load sample run** on the call and run live agent locally.

---

## 4. Message to Cheff

```text
Harbor Intake — browser SaaS demo (React + agent tools on Vercel):
https://YOUR-PROJECT.vercel.app

“Load sample run” works without API. Save/list works in the browser on this link.
“Run agent” is the live tool loop (DeepSeek on the server).
```
