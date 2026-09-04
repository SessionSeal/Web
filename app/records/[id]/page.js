"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthButton } from "../../components";

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

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function RecordPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [verifs, setVerifs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`${API}/records/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404
          ? "This record doesn't exist — or it isn't yours."
          : `couldn't load the record (${r.status})`);
        return r.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    fetch(`${API}/records/${id}/verifications`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setVerifs(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const rec = data?.record;
  const sealed = rec?.status === "SEALED";

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
        <a className="db-back" href="/">← All records</a>

        {error && <div className="db-error">{error}</div>}
        {!rec && !error && <div className="db-loading">Loading…</div>}

        {rec && (
          <>
            <div className="db-rec-head">
              <div>
                <h1>{rec.title || "Untitled"}</h1>
                <p className="artist">{rec.artist_name}</p>
              </div>
              <span className={`db-chip ${sealed ? "ok" : rec.status === "FAILED" ? "bad" : "busy"}`}>
                {sealed ? "Sealed" : rec.status === "FAILED" ? "Failed" : "Sealing…"}
              </span>
            </div>

            <div className="db-rec-when">
              {sealed
                ? <>Sealed <b>{fmtDateTime(rec.sealed_at || rec.created_at)}</b> · </>
                : <>Started <b>{fmtDateTime(rec.created_at)}</b> · </>}
              record <span className="wz-mono">{rec.id}</span>
            </div>

            {!sealed && (
              <div className="db-notsealed">
                {rec.status === "FAILED" || data.status === "FAILED" ? (
                  <>
                    <p>This seal didn't complete.</p>
                    {data.error && <p className="err">{data.error}</p>}
                    <a className="wz-btn" href="/seal">Try sealing again →</a>
                  </>
                ) : rec.status === "DRAFT" ? (
                  <>
                    <p>
                      This record was started but never finished sealing — the
                      upload didn't complete.
                    </p>
                    <a className="wz-btn" href="/seal">Start a new seal →</a>
                  </>
                ) : (
                  <p>Sealing in progress… this page will show the full record
                    once it's done.</p>
                )}
              </div>
            )}

            {sealed && (
              <ul className="wz-checklist db-rec-list">
                {rec.coherence_verified != null && (
                  <li>
                    <span className={`ic ${rec.coherence_verified ? "ok" : "warn"}`}>
                      {rec.coherence_verified ? "✓" : "!"}
                    </span>
                    <span>
                      Stems rebuild the master
                      {rec.coherence_confidence != null &&
                        ` — ${(rec.coherence_confidence * 100).toFixed(1)}% match`}
                    </span>
                  </li>
                )}
                {rec.sameorigin_band && (
                  <li>
                    <span className={`ic ${rec.sameorigin_band === "STRONG" ? "ok" : "warn"}`}>
                      {rec.sameorigin_band === "STRONG" ? "✓" : "!"}
                    </span>
                    <span>
                      Session evidence: {String(rec.sameorigin_band).toLowerCase()}
                      {rec.sameorigin_score != null && ` (${rec.sameorigin_score}/100)`}
                    </span>
                  </li>
                )}
                {rec.watermark_selfcheck != null && (
                  <li>
                    <span className="ic ok">✓</span>
                    <span>Inaudible watermark embedded and self-verified</span>
                  </li>
                )}
                <li>
                  <span className="ic ok">✓</span>
                  <span>Acoustic fingerprint on file</span>
                </li>
                {rec.manifest_public_url && (
                  <li>
                    <span className="ic ok">✓</span>
                    <span>
                      Cryptographically signed — record and results sealed
                      together
                    </span>
                  </li>
                )}
              </ul>
            )}

            {sealed && (
              <div className="db-actions">
                <a className="wz-btn" href={`${API}/records/${rec.id}/release`}>
                  Download signed master
                </a>
                {rec.manifest_public_url && (
                  <a className="wz-btn ghost" href={rec.manifest_public_url}
                    target="_blank" rel="noopener noreferrer">
                    View manifest
                  </a>
                )}
              </div>
            )}

            <section className="db-verifs">
              <h2>Verification history</h2>
              {!verifs && <p className="muted">Loading…</p>}
              {verifs && verifs.count === 0 && (
                <p className="muted">
                  No one has verified a copy of this track yet. When someone
                  checks a copy and it links back here, you'll see it below.
                </p>
              )}
              {verifs && verifs.count > 0 && (
                <ul className="db-verif-list">
                  {verifs.verifications.map((v, i) => (
                    <li key={i}>
                      <span className="dot" />
                      Copy linked back via{" "}
                      <b>{String(v.linked_via || "").toLowerCase()}</b>
                      {" · "}{fmtDateTime(v.created_at)}
                      {v.copy_attack_suspected && (
                        <span className="db-chip bad" style={{ marginLeft: 8 }}>
                          copy-attack flagged
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
