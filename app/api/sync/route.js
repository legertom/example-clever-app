import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { runSync } from "@/lib/store";

// Manual sync trigger (the "Sync now" button). Requires a logged-in user.
export async function POST() {
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const store = await runSync();
    return NextResponse.json({ ok: true, counts: store.counts, lastSyncedAt: store.lastSyncedAt });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
