"use client";

import { useEffect, useState } from "react";
import { AuthButton } from "./components";

const API = "/backend";

function Mark() {
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

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatusChip({ status }) {
  const cls = status === "SEALED" ? "ok"
    : status === "FAILED" ? "bad" : "busy";
  const label = status === "SEALED" ? "Sealed"
    : status === "FAILED" ? "Failed"
    : status === "DRAFT" ? "Draft" : "Sealing…";
  return <span className={`db-chip ${cls}`}>{label}</span>;
}

export default function Dashboard() {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/records`)
      .then((r) => {
        if (!r.ok) throw new Error(`couldn't load your records (${r.status})`);
        return r.json();
      })
      .then((d) => { if (!cancelled) setRecords(d.records || []); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  // Show sealed records and any that are actively sealing/failed; hide
  // abandoned DRAFTs (uploads that never finished — noise, not catalog).
  const visible = (records || []).filter((r) => r.status !== "DRAFT");
  const sealed = visible.filter((r) => r.status === "SEALED");
  const firstSeal = sealed.length
    ? sealed[sealed.length - 1].sealed_at || sealed[sealed.length - 1].created_at
    : null;
  const timesVerified = (records || [])
    .reduce((n, r) => n + (r.times_verified || 0), 0);

  return (
    <div className="wz-shell">
      <div className="wz-top">
        <a className="ld-mark" href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: "var(--text)", fontWeight: 700, fontSize: "0.9rem" }}>
          <Mark />
          <span>Session<b style={{ fontWeight: 800 }}>Seal</b></span>
        </a>
        <div className="links">
          <a className="db-newpill" href="/seal">Seal a new track →</a>
          <AuthButton />
        </div>
      </div>

      <main className="db-main">
        {error && <div className="db-error">{error}</div>}

        {records === null && !error && (
          <div className="db-loading">Loading your records…</div>
        )}

        {records !== null && visible.length === 0 && (
          <div className="db-empty">
            <h1>Nothing sealed yet.</h1>
            <p>
              Upload your master, stems, and session once. Your track gets a
              sealed, timestamped record — proof that exists before anyone
              questions you.
            </p>
            <a className="db-newpill big" href="/seal">Seal your first track →</a>
          </div>
        )}

        {records !== null && visible.length > 0 && (
          <>
            <div className="db-stats">
              <div className="db-stat">
                <div className="n">{sealed.length}</div>
                <div className="l">record{sealed.length === 1 ? "" : "s"} sealed</div>
              </div>
              <div className="db-stat">
                <div className="n">{fmtDate(firstSeal)}</div>
                <div className="l">protected since</div>
              </div>
              <div className="db-stat">
                <div className="n">{timesVerified}</div>
                <div className="l">times your work was verified</div>
              </div>
            </div>

            <div className="db-list">
              {visible.map((r) => (
                <a className="db-card" key={r.id} href={`/records/${r.id}`}>
                  <div className="db-card-head">
                    <div className="db-card-title">
                      <b>{r.title || "Untitled"}</b>
                      <span className="artist">{r.artist_name}</span>
                    </div>
                    <StatusChip status={r.status} />
                  </div>
                  <div className="db-card-when">
                    Sealed {fmtDateTime(r.sealed_at || r.created_at)}
                  </div>
                  <div className="db-card-badges">
                    {r.coherence_verified && (
                      <span className="mini ok">
                        ✓ stems rebuild {r.coherence_confidence
                          ? `${(r.coherence_confidence * 100).toFixed(1)}%` : ""}
                      </span>
                    )}
                    {r.sameorigin_band && (
                      <span className={`mini ${r.sameorigin_band === "STRONG" ? "ok" : ""}`}>
                        session: {String(r.sameorigin_band).toLowerCase()}
                      </span>
                    )}
                    {r.watermark_selfcheck != null && <span className="mini ok">✓ watermarked</span>}
                    {r.manifest_public_url && <span className="mini ok">✓ signed</span>}
                    {r.times_verified > 0 && (
                      <span className="mini hot">
                        verified {r.times_verified}×
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>

            <div className="db-verify-cta">
              Found a suspicious copy of your work?{" "}
              <a href="/verify">Verify it →</a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
