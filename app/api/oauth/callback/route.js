import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { exchangeCodeForToken, getMe, getUser } from "@/lib/clever";

// Step 2: Clever redirects back with ?code & ?state. Verify, exchange, fetch user.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const home = new URL("/", request.url);
  const session = await getSession();

  if (error) return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, request.url));
  if (!code) return NextResponse.redirect(new URL("/?error=missing_code", request.url));

  // CSRF: returned state must match what we issued.
  if (!state || state !== session.oauthState) {
    return NextResponse.redirect(new URL("/?error=invalid_state", request.url));
  }
  delete session.oauthState;

  try {
    const ssoToken = await exchangeCodeForToken(code);
    const me = await getMe(ssoToken); // -> data.id, data.district
    const profile = await getUser(ssoToken, me.data.id); // -> name, email, roles, ...
    session.user = { id: me.data.id, district: me.data.district, ...profile.data };
    await session.save();
    return NextResponse.redirect(home);
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL("/?error=login_failed", request.url));
  }
}
