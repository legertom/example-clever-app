import { NextResponse } from "next/server";
import { runSync } from "@/lib/store";

// Scheduled sync, invoked by Vercel Cron (see vercel.json).
// Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set,
// which keeps this endpoint from being triggered by the public.
export async function GET(request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const store = await runSync();
    return NextResponse.json({ ok: true, counts: store.counts, lastSyncedAt: store.lastSyncedAt });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
