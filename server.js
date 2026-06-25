import crypto from "node:crypto";
import express from "express";
import session from "express-session";
import "dotenv/config";

const {
  CLEVER_CLIENT_ID,
  CLEVER_CLIENT_SECRET,
  CLEVER_REDIRECT_URI,
  SESSION_SECRET,
  PORT = 3000,
} = process.env;

// Fail fast if the app isn't configured — easier than debugging a vague OAuth error.
for (const [key, val] of Object.entries({
  CLEVER_CLIENT_ID,
  CLEVER_CLIENT_SECRET,
  CLEVER_REDIRECT_URI,
  SESSION_SECRET,
})) {
  if (!val) {
    console.error(`Missing required env var: ${key}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

// Clever's OAuth 2.0 endpoints (https://dev.clever.com/docs/oauth-implementation)
const AUTHORIZE_URL = "https://clever.com/oauth/authorize";
const TOKEN_URL = "https://clever.com/oauth/tokens";
const API_BASE = "https://api.clever.com/v3.0";

const app = express();

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: false }, // set secure:true behind HTTPS
  })
);

// --- Routes ----------------------------------------------------------------

// Home: show login button, or the logged-in user's profile.
app.get("/", (req, res) => {
  const user = req.session.user;
  if (!user) {
    return res.send(page(`
      <h1>Example Clever App</h1>
      <p>Sign in with your Clever account to continue.</p>
      <a class="btn" href="/login">Log in with Clever</a>
    `));
  }
  return res.send(page(`
    <h1>Welcome${user.name ? `, ${escapeHtml(user.name.first)}` : ""}!</h1>
    <p>You are signed in via Clever SSO.</p>
    <pre>${escapeHtml(JSON.stringify(user, null, 2))}</pre>
    <a class="btn" href="/logout">Log out</a>
  `));
});

// Step 1: kick off the OAuth flow.
// Generate a random `state`, stash it in the session, and redirect to Clever.
app.get("/login", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLEVER_CLIENT_ID,
    redirect_uri: CLEVER_REDIRECT_URI,
    state,
  });
  res.redirect(`${AUTHORIZE_URL}?${params.toString()}`);
});

// Step 2: Clever redirects back here with ?code=...&state=...
app.get("/oauth/callback", async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) return res.status(400).send(page(`<h1>Login failed</h1><p>${escapeHtml(String(error))}</p>`));
    if (!code) return res.status(400).send(page(`<h1>Login failed</h1><p>Missing authorization code.</p>`));

    // CSRF protection: the returned state must match what we issued.
    if (!state || state !== req.session.oauthState) {
      return res.status(400).send(page(`<h1>Login failed</h1><p>Invalid state parameter.</p>`));
    }
    delete req.session.oauthState;

    // Step 3: exchange the code for an access token.
    // Auth is HTTP Basic with base64(client_id:client_secret).
    const basic = Buffer.from(`${CLEVER_CLIENT_ID}:${CLEVER_CLIENT_SECRET}`).toString("base64");
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: String(code),
        grant_type: "authorization_code",
        redirect_uri: CLEVER_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      throw new Error(`Token exchange failed (${tokenRes.status}): ${detail}`);
    }
    const { access_token } = await tokenRes.json();

    // Step 4a: /me returns the logged-in user's Clever id, type, and district.
    const me = await cleverGet(`${API_BASE}/me`, access_token);

    // Step 4b: fetch the full user record for name/email/role.
    const profile = await cleverGet(`${API_BASE}/users/${me.data.id}`, access_token);

    req.session.user = {
      id: me.data.id,
      district: me.data.district,
      ...profile.data, // name, email, roles, etc.
    };
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// --- Helpers ---------------------------------------------------------------

async function cleverGet(url, accessToken) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Clever API GET ${url} failed (${r.status}): ${detail}`);
  }
  return r.json();
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function page(body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Example Clever App</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 4rem auto; padding: 0 1rem; }
    .btn { display: inline-block; background: #4274f6; color: #fff; padding: .6rem 1.1rem;
           border-radius: 6px; text-decoration: none; }
    pre { background: #f4f5f7; padding: 1rem; border-radius: 6px; overflow: auto; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send(page(`<h1>Something went wrong</h1><pre>${escapeHtml(err.message)}</pre>`));
});

app.listen(PORT, () => {
  console.log(`Example Clever App running at http://localhost:${PORT}`);
});
