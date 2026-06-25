# Example Clever App

A minimal Node/Express web app that signs users in with **Clever SSO** using the
OAuth 2.0 authorization-code flow.

## Flow

1. User clicks **Log in with Clever** → app redirects to `https://clever.com/oauth/authorize`
   with a random `state` (CSRF protection).
2. Clever redirects back to `/oauth/callback?code=...&state=...`.
3. App verifies `state`, then exchanges the `code` at `https://clever.com/oauth/tokens`
   using HTTP Basic auth (`base64(client_id:client_secret)`).
4. App calls `https://api.clever.com/v3.0/me` for the user's Clever id, then
   `/v3.0/users/{id}` for the full profile, and stores it in the session.

## Setup

1. Register an app at <https://apps.clever.com> and note your **Client ID** and **Client Secret**.
2. Add `http://localhost:3000/oauth/callback` as a redirect URI on the Clever app.
3. Configure and run:

   ```bash
   cp .env.example .env      # then fill in CLEVER_CLIENT_ID / SECRET / SESSION_SECRET
   npm install
   npm run dev
   ```

4. Open <http://localhost:3000>.

## Notes

- Redirect URI must match **exactly** between the authorize request, the token
  exchange, and the value registered on your Clever app.
- Authorization codes are valid for ~1 minute and single-use; tokens last 24h and
  are not refreshable (re-run the login flow).
- For production, terminate TLS and set the session cookie `secure: true` in `server.js`.

## Onboarding others

To take a teammate from zero to a deployed Clever SSO app (MCP server → GitHub →
Vercel → secrets), see [PROMPT.md](PROMPT.md) — a copy-paste prompt for a fresh
Claude Code session.

Reference: <https://dev.clever.com/docs/oauth-implementation>
