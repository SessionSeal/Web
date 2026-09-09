"use client";

import { Mark } from "./components";

export default function Error({ error, reset }) {
  return (
    <div className="wz-shell" style={{ alignItems: "center", justifyContent: "center", display: "flex" }}>
      <main style={{ textAlign: "center", padding: "48px 24px", maxWidth: 560 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <Mark />
        </div>
        <p style={{
          fontFamily: "var(--mono, ui-monospace, monospace)", fontSize: "0.78rem",
          letterSpacing: "0.14em", color: "var(--warn)", marginBottom: 10,
        }}>
          SOMETHING WENT WRONG
        </p>
        <h1 style={{
          fontFamily: "var(--serif)", fontWeight: 400, lineHeight: 1.08,
          fontSize: "clamp(2.2rem, 6vw, 3.2rem)", marginBottom: 14,
        }}>
          The tape snapped.
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: 30 }}>
          An unexpected error interrupted playback. Your sealed records are
          safe, nothing on the server is affected. Try again, or head back
          to the start.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="ld-pill ghost" style={{ border: "1px solid var(--border-strong)", cursor: "pointer", font: "inherit", fontWeight: 700 }}
            onClick={() => reset()}>
            Try again
          </button>
          <a className="ld-pill" href="/">Back to the site</a>
        </div>
        {error?.digest && (
          <p style={{
            marginTop: 26, fontFamily: "ui-monospace, monospace",
            fontSize: "0.72rem", color: "var(--muted)",
          }}>
            error ref: {error.digest}
          </p>
        )}
      </main>
    </div>
  );
}
