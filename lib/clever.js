// Clever API helpers — OAuth 2.0 (SSO) + Data API (Secure Sync).
// Endpoints verified against https://dev.clever.com/docs/oauth-implementation
// and https://dev.clever.com/docs/secure-sync-rostering

const AUTHORIZE_URL = "https://clever.com/oauth/authorize";
const TOKEN_URL = "https://clever.com/oauth/tokens";
const API_HOST = "https://api.clever.com";
const API_BASE = `${API_HOST}/v3.0`;

// --- SSO (per-user OAuth) --------------------------------------------------

export function authorizeUrl(state) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CLEVER_CLIENT_ID,
    redirect_uri: process.env.CLEVER_REDIRECT_URI,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(code) {
  const basic = Buffer.from(
    `${process.env.CLEVER_CLIENT_ID}:${process.env.CLEVER_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.CLEVER_REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  const { access_token } = await res.json();
  return access_token;
}

// Both SSO and Secure Sync use Bearer tokens; the difference is which token.
async function bearerGet(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Clever GET ${url} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

// SSO token -> the logged-in user's Clever id + district.
export const getMe = (ssoToken) => bearerGet(`${API_BASE}/me`, ssoToken);
// SSO token -> full profile for a user id.
export const getUser = (ssoToken, id) => bearerGet(`${API_BASE}/users/${id}`, ssoToken);

// --- Secure Sync (district-app token, Data API) ----------------------------

// Fetch every page of a list resource, following the `links` rel="next" cursor
// exactly as Clever returns it (100 records/page). Returns flat resource array.
export async function fetchAll(path, districtToken) {
  let url = `${API_BASE}${path}`;
  const records = [];
  while (url) {
    const json = await bearerGet(url, districtToken);
    for (const item of json.data ?? []) records.push(item.data ?? item);
    const next = (json.links ?? []).find((l) => l.rel === "next");
    url = next ? `${API_HOST}${next.uri}` : null;
  }
  return records;
}
