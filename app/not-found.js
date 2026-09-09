import { Mark } from "./components";

export default function NotFound() {
  return (
    <div className="wz-shell" style={{ alignItems: "center", justifyContent: "center", display: "flex" }}>
      <main style={{ textAlign: "center", padding: "48px 24px", maxWidth: 560 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <Mark />
        </div>
        <p style={{
          fontFamily: "var(--mono, ui-monospace, monospace)", fontSize: "0.78rem",
          letterSpacing: "0.14em", color: "var(--muted)", marginBottom: 10,
        }}>
          404
        </p>
        <h1 style={{
          fontFamily: "var(--serif)", fontWeight: 400, lineHeight: 1.08,
          fontSize: "clamp(2.2rem, 6vw, 3.2rem)", marginBottom: 14,
        }}>
          This side of the tape is blank.
        </h1>
        <p style={{ color: "var(--muted)", marginBottom: 30 }}>
          The page you&apos;re looking for isn&apos;t on this reel, it may
          have moved, or never existed. Your records are unaffected.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a className="ld-pill ghost" href="/">Back to the site</a>
          <a className="ld-pill" href="/">Open the app →</a>
        </div>
      </main>
    </div>
  );
}
