# Deploying LockdIN (free tier)

Architecture: **Vercel** serves the static React PWA (`web/`) and proxies `/api/*` to a
**Render** FastAPI service (`backend/`). **Supabase** is the database + Google OAuth.
**OpenRouter** (free models) does AI scoring. **OneSignal** does web push.

```
Browser ──> Vercel (static PWA + /api rewrite) ──> Render (FastAPI) ──> Supabase
                                                          └─> OpenRouter (AI)
External cron (GitHub Actions / cron-job.org) ──> Render /api/cron/all
```

---

## 0. Database migration (do this first)

In the **Supabase SQL Editor**, run **`database/migration_005_core_loop.sql`**.
It adds `ai_scores.breakdown` and `notification_preferences.unsubscribe_token`.
**Without it, finishing a session and the unsubscribe link will 500.** (Fresh DB?
run `database/schema.sql` instead — it already includes these.)

---

## 1. Backend → Render (free)

1. Render Dashboard → **New → Blueprint** → connect this repo. It reads `render.yaml`
   (root dir `backend`, `pip install -r requirements.txt`, `uvicorn main:app`, health `/health`).
2. Set these **environment variables** (Dashboard → the service → Environment). Values are in
   your local `.env`:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `ONESIGNAL_APP_ID`, `ONESIGNAL_API_KEY`
   - `OPENROUTER_API_KEY` (model vars default fine)
   - `JWT_SECRET`
   - `CRON_SECRET` (any long random string — also used by the cron workflow)
   - `SCHEDULER_ENABLED=false` (use external cron instead — already in `render.yaml`)
   - `FRONTEND_ORIGIN=https://<your-app>.vercel.app` (after step 2)
3. Deploy. Note the URL, e.g. `https://lockdin-api.onrender.com`. Check `…/health` returns `ok`.

> Free tier sleeps after ~15 min idle → first request ~50 s cold start. Mitigate with keep-warm (step 4).

## 2. Frontend → Vercel (free)

1. Vercel → **New Project** → import this repo.
2. **Root Directory = `web`**. Framework preset: **Vite** (build `npm run build`, output `dist`).
3. **Environment variables** (build-time, so redeploy after changing):
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `VITE_API_BASE` = `/api` (default — leave unset is fine)
4. Edit **`web/vercel.json`** → replace `https://lockdin-api.onrender.com` with your real Render URL.
5. Deploy. Note the URL, e.g. `https://lockdin.vercel.app`. Go back and set `FRONTEND_ORIGIN` on Render to it.

## 3. Auth config (login will NOT work until this is done)

- **Supabase** → Authentication → URL Configuration:
  - **Site URL** = `https://<your-app>.vercel.app`
  - **Redirect URLs** → add `https://<your-app>.vercel.app/**` (and `http://localhost:5173/**` for local dev)
- **Google Cloud Console** → your OAuth client → Authorized redirect URIs → ensure
  `https://<project-ref>.supabase.co/auth/v1/callback` is present (Supabase handles the Google handshake).

## 4. Scheduled jobs + keep-warm

In the GitHub repo → **Settings → Secrets and variables → Actions**, add:
- `BACKEND_URL` = `https://lockdin-api.onrender.com`
- `CRON_SECRET` = the same value you set on Render

This enables:
- **`.github/workflows/scheduled-jobs.yml`** — POSTs `/api/cron/all` at 08:00 & 18:00 UTC
  (inactivity reminders, buddy-mood alerts, streak warnings).
- **`.github/workflows/keep-warm.yml`** — pings `/health` every ~12 min.

> GitHub scheduled runs are best-effort (often delayed) and pause after 60 days of repo
> inactivity. For reliable timing, use a free **cron-job.org** monitor instead, hitting
> the same URLs. You can also trigger either workflow manually (Actions → Run workflow).

## 5. Web push (OneSignal) — Phase 4, not yet wired

The backend already sends via OneSignal; the **frontend** registration + service-worker
coexistence is the remaining piece (see `web/src/lib/onesignal.ts` and the note in
`web/vite.config.ts`). When ready: configure a **Web Push** platform in the OneSignal
dashboard pointing at the Vercel URL, host `OneSignalSDKWorker.js`, switch the PWA plugin to
`injectManifest`, and call the registration on login. iOS only delivers web push after the
user installs the PWA to their home screen.

---

## Gotchas
- **OpenRouter free models rotate** — slugs get retired/rate-limited. The scorer has a 3-model
  fallback chain → algorithm, so it degrades gracefully. Re-check `GET https://openrouter.ai/api/v1/models` if scores stop improving.
- **Render cold start** affects the first request after idle, not the in-browser timer (which runs client-side).
- **Never commit `.env`** — it holds live secrets. It's gitignored; set values in Render/Vercel dashboards.
