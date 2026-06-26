import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { authorizeUrl } from "@/lib/clever";

// Step 1: stash a random `state` (CSRF) and redirect to Clever's authorize page.
export async function GET() {
  const session = await getSession();
  const state = crypto.randomBytes(16).toString("hex");
  session.oauthState = state;
  await session.save();
  return NextResponse.redirect(authorizeUrl(state));
}
