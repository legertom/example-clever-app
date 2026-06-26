"use client";

import { useState } from "react";

export default function SyncButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Sync failed (${res.status})`);
      setMsg("Sync complete.");
      // Reload so the server component re-reads the store and shows new counts.
      window.location.reload();
    } catch (err) {
      setMsg(err.message);
      setBusy(false);
    }
  }

  return (
    <span>
      <button
        onClick={sync}
        disabled={busy}
        style={{
          background: "#4274f6",
          color: "#fff",
          border: 0,
          padding: ".55rem 1rem",
          borderRadius: 6,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "Syncing…" : "Sync now"}
      </button>
      {msg && <span style={{ marginLeft: ".75rem", color: "#555" }}>{msg}</span>}
    </span>
  );
}
