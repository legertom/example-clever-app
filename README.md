# Example Clever App — SSO + Secure Sync

A Next.js (App Router) sample app demonstrating two Clever integrations:

- **SSO** — "Log in with Clever" via OAuth 2.0 (per-user authentication).
- **Secure Sync** — pull a district's roster (schools, sections, courses,
  students, teachers) via the Data API, triggered manually or on a schedule.

Deploys to Vercel with zero config.

## Architecture at a glance

| | SSO | Secure Sync |
|---|---|---|
| Auth | Per-user OAuth token (24h) | District-app Bearer token |
| Endpoints | `/oauth/*`, `/v3.0/me`, `/v3.0/users/{id}` | `/v3.0/schools`, `/users`, `/sections`, `/courses` |
| Code | [app/api/login](app/api/login/route.js), [app/api/oauth/callback](app/api/oauth/callback/route.js) | [app/api/sync](app/api/sync/route.js), [app/api/cron/sync](app/api/cron/sync/route.js) |

Shared helpers live in [lib/clever.js](lib/clever.js) (API calls + pagination),
[lib/session.js](lib/session.js) (iron-session), and [lib/store.js](lib/store.js)
(roster store + sync logic).

## Setup

1. **Clever app** — at <https://apps.clever.com>, copy your **Client ID** /
   **Client Secret**, and register redirect URI
   `http://localhost:3000/api/oauth/callback`.
2. **Sandbox district token** — App Dashboard → Data Sources → Sandbox District →
   API Token. This is your `CLEVER_DISTRICT_TOKEN`.
3. Configure and run:

   ```bash
   cp .env.example .env.local   # fill in all values
   npm install
   npm run dev                  # http://localhost:3000
   ```

## Environment variables

| Var | Used by | Notes |
|---|---|---|
| `CLEVER_CLIENT_ID` / `CLEVER_CLIENT_SECRET` | SSO | From the Clever app dashboard |
| `CLEVER_REDIRECT_URI` | SSO | Must match the registered URI **exactly** |
| `SESSION_PASSWORD` | session | ≥32 random chars (`openssl rand -base64 32`) |
| `CLEVER_DISTRICT_TOKEN` | Secure Sync | Sandbox district Bearer token |
| `CRON_SECRET` | Secure Sync cron | Protects `/api/cron/sync` |

## Sync model

Full pull: each sync re-downloads all records via the Data API (paginating with
the `links` `next` cursor). Triggers:

- **Manual** — the "Sync now" button → `POST /api/sync`.
- **Scheduled** — Vercel Cron hits `GET /api/cron/sync` hourly (see
  [vercel.json](vercel.json)), authenticated with `CRON_SECRET`.

> ⚠️ **In-memory store caveat:** synced data is held in process memory
> ([lib/store.js](lib/store.js)). In local dev that's shared across requests. On
> Vercel, each serverless invocation has its own memory, so the cron sync and the
> UI won't share state in production. To make sync durable, swap `lib/store.js`
> for a real store (Vercel Postgres / KV) — the rest of the app only calls
> `getStore()` / `runSync()`.

## Deploy to Vercel + secrets

See [PROMPT.md](PROMPT.md) for the full zero-to-deployed walkthrough (MCP server →
GitHub → Vercel → environment variables), or in short: import the repo in Vercel,
add the env vars above under Project → Settings → Environment Variables (also add
`https://<your-app>.vercel.app/api/oauth/callback` as a Clever redirect URI), and
redeploy.

References:
[SSO](https://dev.clever.com/docs/oauth-implementation) ·
[Secure Sync](https://dev.clever.com/docs/secure-sync-rostering)
