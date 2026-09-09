"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

export function fmtBytes(n) {
  if (n == null) return "-";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

// A subtle (i) that reveals a plain-language explanation on hover/tap, with a
// gentle fade+lift. Used everywhere so we never assume the reader knows a term.
export function Info({ text, align = "center" }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="ss-info" onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}>
      <button type="button" className="ss-info-dot" aria-label="More info"
        onClick={() => setOpen((o) => !o)}>i</button>
      <span role="tooltip" className={`ss-info-tip ${align} ${open ? "in" : ""}`}>
        {text}
      </span>
    </span>
  );
}

// Small hover-labelled icon button for title bars.
export function IconButton({ label, onClick, href, download, children }) {
  const [hover, setHover] = useState(false);
  const common = {
    className: "ss-iconbtn",
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    "aria-label": label,
  };
  const inner = (
    <>
      {children}
      <span className={`ss-iconbtn-tip ${hover ? "in" : ""}`}>{label}</span>
    </>
  );
  return href
    ? <a href={href} {...(download ? {} : { target: "_blank", rel: "noopener noreferrer" })} {...common}>{inner}</a>
    : <button type="button" onClick={onClick} {...common}>{inner}</button>;
}

// A pill toggle (switch), replaces checkboxes.
export function Switch({ checked, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked}
      disabled={disabled}
      className={`ss-switch ${checked ? "on" : ""} ${disabled ? "locked" : ""}`}
      onClick={() => !disabled && onChange(!checked)}>
      <span className="knob" />
    </button>
  );
}

// A centered modal with backdrop, escape-to-close, subtle entrance.
export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="ss-modal-backdrop" onClick={onClose}>
      <div className="ss-modal" onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true">
        <div className="ss-modal-head">
          <h3>{title}</h3>
          <button className="ss-modal-x" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="ss-modal-body">{children}</div>
        {footer && <div className="ss-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// Icon set (inline SVG, currentColor, 18px default).
export const Icons = {
  download: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>),
  manifest: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>),
  share: (p) => (<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>),
  link: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg>),
  copy: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>),
  trash: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>),
  eye: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>),
  wave: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12v0M8 8v8M12 5v14M16 9v6M20 12v0"/></svg>),
  folder: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>),
  doc: (p) => (<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/></svg>),
};

export function Mark() {
  // The sealed record: solid disc, knocked-out core, groove opening from
  // it (see sessionseal-brand/BRAND.md). Knockouts let the ground show
  // through, so one path works on any background.
  return (
    <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">
      <path
        fill="#4d7eff"
        fillRule="evenodd"
        d="M32 3.00A29.00 29.00 0 1 1 31.99 3.00ZM32 20.00A12.00 12.00 0 1 1 31.99 20.00ZM54.12 35.50A22.40 22.40 0 0 1 32.39 54.40L32.29 48.40A16.40 16.40 0 0 0 48.20 34.57Z"
      />
    </svg>
  );
}

export function Wordmark() {
  // Brand lockup text: "Session" regular, "Seal" bold.
  return (
    <span>Session<b style={{ fontWeight: 800 }}>Seal</b></span>
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
          fontWeight: 500, fontSize: "0.9rem",
        }}
      >
        <Mark />
        <Wordmark />
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
