// In-memory roster store + full-pull sync against Clever Secure Sync.
//
// NOTE: this lives in process memory. In local dev (single process) it's shared
// across requests. On Vercel each serverless invocation has its OWN memory, so
// the cron sync and your page requests will NOT share state in production.
// To make sync durable, replace this module's read/write with a real store
// (Vercel Postgres / KV) — the rest of the app calls getStore()/runSync() only.
import { fetchAll } from "@/lib/clever";

// Survive Next.js dev hot-reloads by hanging the singleton off globalThis.
const store = (globalThis.__cleverStore ??= {
  lastSyncedAt: null,
  syncing: false,
  error: null,
  counts: {},
  data: { schools: [], sections: [], courses: [], students: [], teachers: [] },
});

export function getStore() {
  return store;
}

// Initial/full sync: re-pull every resource from the Data API.
export async function runSync() {
  if (!process.env.CLEVER_DISTRICT_TOKEN) {
    throw new Error("CLEVER_DISTRICT_TOKEN is not set — add your sandbox district token.");
  }
  if (store.syncing) return store; // avoid overlapping runs

  store.syncing = true;
  store.error = null;
  const token = process.env.CLEVER_DISTRICT_TOKEN;
  try {
    const [schools, sections, courses, students, teachers] = await Promise.all([
      fetchAll("/schools", token),
      fetchAll("/sections", token),
      fetchAll("/courses", token),
      fetchAll("/users?role=student", token),
      fetchAll("/users?role=teacher", token),
    ]);
    store.data = { schools, sections, courses, students, teachers };
    store.counts = Object.fromEntries(
      Object.entries(store.data).map(([k, v]) => [k, v.length])
    );
    store.lastSyncedAt = new Date().toISOString();
    return store;
  } catch (err) {
    store.error = err.message;
    throw err;
  } finally {
    store.syncing = false;
  }
}
