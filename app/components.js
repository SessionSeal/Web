"use client";

import { useState } from "react";

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
