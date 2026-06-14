# LockdIN

A friends accountability / focus-session tracker. Start a focus timer, write what you
did, an AI scores the session 0–100, your streak grows, your virtual **buddy's** mood
rises or falls with your consistency, and your friends get notified — so you actually
show up.

> Rebuilt 2026-06: premium React PWA + FastAPI + Supabase, hosted free. See `DEPLOY.md`
> to ship it, and `database/` for the schema.

---

## The loop
`start timer → finish + work-log → AI score (0–100 + summary) → updates streak + buddy mood (1–10) → friends notified`

Plus: friends leaderboard (daily / weekly / all-time), a GitHub-style history heatmap,
friend connections by invite code or email, and a buddy you pick + name during onboarding.

## Architecture
```
Browser ─> Vercel (static React PWA, web/) ─/api proxy─> Render (FastAPI, backend/) ─> Supabase (Postgres + Google OAuth)
                                                                 └─> OpenRouter (free LLMs, AI scoring)
External cron ─> /api/cron/all (inactivity / mood / streak jobs)         OneSignal (web push)
```

## Repo layout
| Path | What |
|---|---|
| `web/` | **The app** — React + Vite + TypeScript + Tailwind, shipped as an installable PWA. |
| `web/src/components/ui/` | Shared design-system primitives (Button, Card double-bezel, etc.). |
| `web/src/lib/` | `api.ts` (typed fetch + 401 refresh), `queries.ts` (TanStack Query hooks), `supabase.ts`, `auth.tsx`, `buddy.ts`, `types.ts` (the frozen API contract). |
| `web/src/pages/` | One folder/file per screen (Landing, Login, Onboarding, Dashboard, Profile, History, Leaderboard, Settings). |
| `backend/` | FastAPI. `routers/` (endpoints), `services/` (ai_scorer→OpenRouter, cache, streak_calculator, scheduler, email), `middleware/auth.py` (Supabase JWT). |
| `database/` | `schema.sql` (source of truth) + `migration_005_core_loop.sql` (apply before deploy). |
| `frontend/` | **Old** vanilla HTML/CSS/JS app — superseded by `web/`, kept for reference. |
| `Avatars/` | 150 buddy art frames (15 buddies × 10 moods); copied into `web/public/avatars/`. |
| `.github/workflows/` | `keep-warm.yml` + `scheduled-jobs.yml` (external cron for free tier). |

## Run it locally
**Backend** (Python 3.11+, from repo root — needs `.env`):
```bash
pip install -r backend/requirements.txt
python -m uvicorn main:app --app-dir backend --port 8000   # http://localhost:8000/health
```
**Frontend** (Node 18+):
```bash
cd web && npm install && npm run dev                        # Vite dev server; proxies /api → :8000
```
> Heads-up: port **5173** is used by another local app of yours ("Terra91"), so Vite will use
> the next free port (5174). For Google login to work locally, add that exact origin
> (e.g. `http://localhost:5174/**`) to Supabase → Auth → Redirect URLs.

## Stack & key decisions
- **Frontend:** React + Vite + TS + Tailwind v3, framer-motion, TanStack Query, Phosphor icons, sonner, vite-plugin-pwa. Dark + teal design system (Clash Display / Geist), routes code-split.
- **Backend:** FastAPI. AI scoring via **OpenRouter free models** (3-model fallback chain → deterministic algorithm; session-finish scoring is async/non-blocking). In-process TTL cache (no Redis).
- **Data/auth:** Supabase (Postgres + Google OAuth). JWT verified server-side.
- **Notifications:** OneSignal (web push — frontend wiring is the remaining Phase-4 task).
- **Free hosting:** Vercel (frontend) + Render (backend, sleeps when idle → external cron + keep-warm).

See `DEPLOY.md` for the full hosting walkthrough.
