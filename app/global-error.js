"use client";

// Replaces the root layout when it crashes, globals.css is NOT loaded
// here, so everything is inlined and self-contained.
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0, background: "#08090c", color: "#f2f3f5", minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
        textAlign: "center",
      }}>
        <main style={{ padding: "48px 24px", maxWidth: 560 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: "2.6rem", margin: "0 0 14px" }}>
            The tape snapped.
          </h1>
          <p style={{ color: "#8a919e", margin: "0 0 30px" }}>
            Something broke badly enough to take the page down. Your sealed
            records are safe. Reload to try again.
          </p>
          <button onClick={() => reset()} style={{
            background: "#fff", color: "#0b0d11", fontWeight: 700,
            border: "none", borderRadius: 999, padding: "12px 26px",
            fontSize: "0.9rem", cursor: "pointer",
          }}>
            Reload
          </button>
          {error?.digest && (
            <p style={{ marginTop: 26, fontFamily: "monospace", fontSize: "0.72rem", color: "#8a919e" }}>
              error ref: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
