"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

export function fmtBytes(n) {
  if (n == null) return "—";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function Mark() {
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#12151b" />
      <path d="M32 31 Q32 20 41 20 Q50 20 50 31 L50 46" fill="none" stroke="#4d7eff" strokeWidth="7" strokeLinecap="round" />
      <path d="M14 46 L14 31 Q14 20 23 20 Q32 20 32 31 L32 46" fill="none" stroke="#f2f3f5" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export function PageTop({ links }) {
  return (
    <div className="wz-top">
      <a
        className="ld-mark"
        href="/"
        style={{
          display: "flex", alignItems: "center", gap: 9,
          textDecoration: "none", color: "var(--text)",
          fontWeight: 700, fontSize: "0.9rem",
        }}
      >
        <Mark />
        MotherTape
      </a>
      <div className="links">
        {links.map(([label, href]) => (
          <a key={href} href={href}>{label}</a>
        ))}
      </div>
    </div>
  );
}

export function Drop({ filled, big, small, onClick, onFiles }) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`wz-drop ${over ? "active" : ""} ${filled ? "filled" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length) onFiles(files);
      }}
    >
      <div className="big">{big}</div>
      <div className="small">{small}</div>
    </div>
  );
}


export function AuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === "loading") return null;
  if (!session?.user) {
    return (
      <button className="ld-pill ghost"
        style={{ cursor: "pointer", font: "inherit", fontWeight: 700,
                 border: "1px solid var(--border-strong)" }}
        onClick={() => signIn("google")}>
        Sign in
      </button>
    );
  }
  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}>
      <button onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={open}
        style={{ display: "inline-flex", alignItems: "center", gap: 9,
                 background: "none", border: "none", cursor: "pointer",
                 font: "inherit", color: "var(--text)", padding: 0 }}>
        {session.user.image ? (
          <img src={session.user.image} alt="" width={28} height={28}
            style={{ borderRadius: "50%" }} referrerPolicy="no-referrer" />
        ) : (
          <span style={{ width: 28, height: 28, borderRadius: "50%",
                         background: "var(--accent)", color: "#fff",
                         display: "inline-flex", alignItems: "center",
                         justifyContent: "center", fontSize: "0.8rem",
                         fontWeight: 700 }}>
            {(session.user.name || session.user.email || "?")[0].toUpperCase()}
          </span>
        )}
        <span style={{ fontSize: "0.84rem", fontWeight: 600 }}>
          {session.user.name || session.user.email}
        </span>
        <span aria-hidden="true" style={{ color: "var(--muted)", fontSize: "0.6rem" }}>▾</span>
      </button>
      {open && (
        <div role="menu" style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          minWidth: 210, background: "var(--panel)",
          border: "1px solid var(--border-strong)", borderRadius: 12,
          padding: 6, zIndex: 80,
          boxShadow: "0 16px 40px rgba(0,0,0,0.5)" }}>
          {session.user.email && (
            <div style={{ padding: "8px 12px", fontSize: "0.78rem",
                          color: "var(--muted)",
                          borderBottom: "1px solid var(--border)",
                          marginBottom: 4, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session.user.email}
            </div>
          )}
          <button role="menuitem" onClick={() => signOut({ callbackUrl: "/" })}
            style={{ display: "block", width: "100%", textAlign: "left",
                     background: "none", border: "none", cursor: "pointer",
                     font: "inherit", fontSize: "0.86rem",
                     color: "var(--text)", padding: "9px 12px",
                     borderRadius: 8 }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--panel-2)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "none"}>
            Sign out
          </button>
        </div>
      )}
    </span>
  );
}
