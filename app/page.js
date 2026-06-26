import { getSession } from "@/lib/session";
import { getStore } from "@/lib/store";
import SyncButton from "./sync-button";

// Always render fresh (reads session cookie + live store).
export const dynamic = "force-dynamic";

const btn = {
  display: "inline-block",
  background: "#4274f6",
  color: "#fff",
  padding: ".55rem 1.1rem",
  borderRadius: 6,
  textDecoration: "none",
};

export default async function Home({ searchParams }) {
  const session = await getSession();
  const user = session.user;
  const store = getStore();
  const error = (await searchParams)?.error; // Next 15: searchParams is async

  return (
    <main>
      <h1>Example Clever App</h1>
      <p style={{ color: "#666" }}>Clever SSO + Secure Sync (rostering) demo.</p>

      {error && (
        <p style={{ color: "#b00020" }}>Login error: {String(error)}</p>
      )}

      {/* --- SSO --- */}
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Single Sign-On</h2>
        {!user ? (
          <a className="btn" href="/api/login" style={btn}>
            Log in with Clever
          </a>
        ) : (
          <>
            <p>
              Signed in as <strong>{user.name ? `${user.name.first} ${user.name.last}` : user.id}</strong>
              {user.email ? ` (${user.email})` : ""} — district <code>{user.district}</code>.
            </p>
            <a href="/api/logout" style={{ ...btn, background: "#666" }}>
              Log out
            </a>
          </>
        )}
      </section>

      {/* --- Secure Sync --- */}
      <section style={{ marginTop: "2rem" }}>
        <h2>Secure Sync (district roster)</h2>
        <p>
          {store.lastSyncedAt
            ? `Last synced: ${new Date(store.lastSyncedAt).toLocaleString()}`
            : "Not synced yet."}
          {store.error ? ` — last error: ${store.error}` : ""}
        </p>
        <SyncButton />

        {Object.keys(store.counts).length > 0 && (
          <table style={{ marginTop: "1rem", borderCollapse: "collapse" }}>
            <tbody>
              {Object.entries(store.counts).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: ".25rem 1.5rem .25rem 0", textTransform: "capitalize" }}>{k}</td>
                  <td style={{ padding: ".25rem 0", fontVariantNumeric: "tabular-nums" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {store.data.students.length > 0 && (
          <>
            <h3 style={{ marginTop: "1.5rem" }}>Sample students</h3>
            <ul>
              {store.data.students.slice(0, 5).map((s) => (
                <li key={s.id}>
                  {s.name ? `${s.name.first} ${s.name.last}` : s.id}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
