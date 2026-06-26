// iron-session config — encrypted cookie session that works on Vercel's
// serverless runtime (no server-side session store needed).
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export const sessionOptions = {
  password: process.env.SESSION_PASSWORD,
  cookieName: "clever_sample_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

// session shape: { oauthState?: string, user?: { id, district, name, email, ... } }
export async function getSession() {
  return getIronSession(await cookies(), sessionOptions);
}
