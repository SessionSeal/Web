"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AuthButton } from "./components";

function firstName(session) {
  const n = session?.user?.name || session?.user?.email || "";
  return n.split(/[\s@]/)[0] || "";
}

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
  const { data: session } = useSession();
  const [records, setRecords] = useState(null);
  const [error, setError] = useState(null);
  const name = firstName(session);

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
    <div className="wz-shell db-shell">
      <div className="wz-top">
        <a className="ld-mark" href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: "var(--text)", fontWeight: 700, fontSize: "0.9rem" }}>
          <Mark />
          <span>Session<b style={{ fontWeight: 800 }}>Seal</b></span>
        </a>
        <div className="links">
          <a className="db-newpill primary" href="/seal">Seal a new track →</a>
          <AuthButton />
        </div>
      </div>

      <main className="db-main">
        {error && <div className="db-error">{error}</div>}

        {records === null && !error && (
          <div className="db-loading">Loading your records…</div>
        )}

        {records !== null && visible.length === 0 && (
          <div className="db-onboard">
            <section className="db-hero">
              {name && <p className="db-greeting">Hi {name} 👋</p>}
              <h1>Your catalog starts here.</h1>
              <p>
                Seal a track once — your master, your stems, your session —
                and you get a timestamped record that proves the work is
                yours. Before anyone questions it.
              </p>
              <a className="db-newpill big" href="/seal">Seal your first track →</a>
            </section>

            <section className="db-how">
              <h2>How a seal works</h2>
              <div className="db-steps">
                <div className="db-step">
                  <span className="num">1</span>
                  <b>Upload</b>
                  <p>Your finished master, your stems, and your session file — dropped in once.</p>
                </div>
                <div className="db-step">
                  <span className="num">2</span>
                  <b>Verify</b>
                  <p>We check the parts belong together — your stems have to rebuild your master.</p>
                </div>
                <div className="db-step">
                  <span className="num">3</span>
                  <b>Seal</b>
                  <p>It's watermarked, fingerprinted, and cryptographically signed with a timestamp.</p>
                </div>
              </div>
            </section>

            <section className="db-ways">
              <h2>Three ways a copy finds its way home</h2>
              <div className="db-waycards">
                <div className="db-way">
                  <div className="glyph">◌</div>
                  <b>An inaudible watermark</b>
                  <p>Hidden in the audio itself, below hearing — it survives compression and follows every copy.</p>
                </div>
                <div className="db-way">
                  <div className="glyph">≈</div>
                  <b>An acoustic fingerprint</b>
                  <p>Recognizes your track by how it sounds, even a damaged or chopped-up copy.</p>
                </div>
                <div className="db-way">
                  <div className="glyph">§</div>
                  <b>A cryptographic signature</b>
                  <p>An unforgeable, timestamped seal. Change one sample and it breaks.</p>
                </div>
              </div>
            </section>

            <section className="db-preview" aria-hidden="true">
              <div className="db-preview-label">This is what a sealed record looks like</div>
              <div className="db-card sample">
                <div className="db-card-head">
                  <div className="db-card-title">
                    <b>Your next track</b>
                    <span className="artist">you</span>
                  </div>
                  <span className="db-chip ok">Sealed</span>
                </div>
                <div className="db-card-when">Sealed just now</div>
                <div className="db-card-badges">
                  <span className="mini ok">✓ stems rebuild 96%</span>
                  <span className="mini ok">session: strong</span>
                  <span className="mini ok">✓ watermarked</span>
                  <span className="mini ok">✓ signed</span>
                </div>
              </div>
            </section>

            <div className="db-verify-cta">
              Already released something and want to check a copy?{" "}
              <a href="/verify">Verify it →</a>
            </div>
          </div>
        )}

        {records !== null && visible.length > 0 && (
          <>
            {name && (
              <div className="db-welcome">
                <h1>Hi {name} 👋</h1>
                <p>Here's everything you've sealed.</p>
              </div>
            )}
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
