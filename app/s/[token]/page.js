"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Info } from "../../components";

const API = "/backend";

function Mark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path fill="#4d7eff" fillRule="evenodd"
        d="M32 3.00A29.00 29.00 0 1 1 31.99 3.00ZM32 20.00A12.00 12.00 0 1 1 31.99 20.00ZM54.12 35.50A22.40 22.40 0 0 1 32.39 54.40L32.29 48.40A16.40 16.40 0 0 0 48.20 34.57Z" />
    </svg>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const VERDICT_CLASS = { STRONG: "ok", MODERATE: "mid", WEAK: "warn", CONTRADICTED: "bad" };

export default function ReviewerPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [emailSaved, setEmailSaved] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [busyAsset, setBusyAsset] = useState(null);
  const [streamUrl, setStreamUrl] = useState({}); // assetId -> url

  const emailKey = `ss-share-email:${token}`;

  // Re-check access on every mount — DB is the source of truth. A revoked or
  // tier-changed share reflects immediately on reload.
  useEffect(() => {
    if (!token) return;
    let saved = "";
    try { saved = localStorage.getItem(emailKey) || ""; } catch {}
    if (saved) { setEmail(saved); setEmailSaved(true); }
    const q = saved ? `?email=${encodeURIComponent(saved)}` : "";
    fetch(`${API}/shares/${token}${q}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404
          ? "This link is no longer active. The musician may have revoked it or it has expired."
          : "Couldn't load this record.");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);

  function saveEmail(e) {
    e.preventDefault();
    if (!email.trim()) return;
    try { localStorage.setItem(emailKey, email.trim()); } catch {}
    setEmailSaved(true);
  }

  async function getAsset(assetId, kind) {
    setBusyAsset(assetId);
    try {
      const res = await fetch(`${API}/shares/${token}/asset-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId, email: email.trim() || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "unavailable");
      if (body.download) {
        window.location.href = body.url; // session zip download
      } else {
        setStreamUrl((s) => ({ ...s, [assetId]: body.url })); // stem: inline player
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyAsset(null);
    }
  }

  if (error) {
    return (
      <div className="rv-shell"><div className="rv-card rv-msg">
        <Mark size={30} /><h1>Link unavailable</h1><p>{error}</p>
      </div></div>
    );
  }
  if (!data) return <div className="rv-shell"><div className="rv-card rv-msg">Loading…</div></div>;

  const { report, tiers, assets } = data;
  const v = report.verdict;
  const vclass = VERDICT_CLASS[v.band] || "warn";
  const canStems = tiers.includes("STEM_PREVIEW");
  const canSession = tiers.includes("SESSION");
  const stems = assets.filter((a) => a.kind === "STEM");
  const session = assets.filter((a) => a.kind === "PROJECT");

  return (
    <div className="rv-shell">
      <div className="rv-top">
        <span className="rv-brand"><Mark /> Session<b>Seal</b></span>
        <span className="rv-top-note">Independent verification report</span>
      </div>

      <main className="rv-main">
        {/* LAYER 1 — the verdict, in plain words */}
        <section className={`rv-verdict ${vclass}`}>
          <div className="rv-badge">{v.band}</div>
          <h1>{v.headline}</h1>
          <p>{v.summary}</p>
          <div className="rv-meta">
            <span><b>{report.title}</b> — {report.artist}</span>
            <span>Sealed {fmtDate(report.sealed_at)}
              <Info text="The date SessionSeal cryptographically locked this record. Because it was sealed before any dispute, the evidence cannot have been fabricated after the fact." />
            </span>
          </div>
        </section>

        {/* Integrity line */}
        <section className="rv-integrity">
          <span className="tick">🔒</span>
          <p>
            Cryptographically sealed & unaltered since {fmtDate(report.sealed_at)}.
            <Info text={report.integrity.note} />
            {report.integrity.manifest_url && (
              <> · <a href={report.integrity.manifest_url} target="_blank" rel="noopener noreferrer">
                View the signed record</a>
                <Info text="The public, tamper-evident record (a C2PA Content Credential) — the same standard Adobe, cameras, and streaming platforms use to verify content origin." />
              </>
            )}
          </p>
        </section>

        {/* LAYER 2 — the evidence, explained */}
        <section className="rv-evidence">
          <h2>Why this looks like real studio work</h2>
          <p className="rv-sub">
            Each point below is something an AI-generated track cannot produce.
            Hover any <span className="q">?</span> for what it means.
          </p>
          {report.evidence.length === 0 && (
            <p className="rv-sub">No individual studio-work signals were confirmable for this record — see the detailed breakdown below.</p>
          )}
          <ul className="rv-ev-list">
            {report.evidence.map((e, i) => (
              <li key={i}>
                <span className="rv-ev-tick">✓</span>
                <div>
                  <b>{e.title}<Info text={e.tip} /></b>
                  <p className="finding">{e.finding}</p>
                  <p className="meaning">{e.meaning}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Tier B/C — hear the stems / get the session */}
        {(canStems || canSession) && (stems.length > 0 || session.length > 0) && (
          <section className="rv-assets">
            <h2>
              {canStems && "Hear the isolated stems"}
              {canStems && canSession && " · "}
              {canSession && "The session file"}
              <Info text="Stems are the separate layers of the song (drums, vocals, etc.). Hearing them isolated is strong confirmation of real multi-track production — an AI export has none. The session file is the producer's full project." />
            </h2>
            {!emailSaved ? (
              <form className="rv-emailgate" onSubmit={saveEmail}>
                <p>Enter your email to access these — it's logged for the musician and lets them see who reviewed the material. No account needed.</p>
                <div className="row">
                  <input type="email" required placeholder="you@distributor.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                  <button type="submit">Continue</button>
                </div>
              </form>
            ) : (
              <>
                {canStems && stems.map((a) => (
                  <div className="rv-asset" key={a.asset_id}>
                    <span className="name">{a.filename}</span>
                    {streamUrl[a.asset_id] ? (
                      <audio controls controlsList="nodownload" src={streamUrl[a.asset_id]} />
                    ) : (
                      <button disabled={busyAsset === a.asset_id}
                        onClick={() => getAsset(a.asset_id, a.kind)}>
                        {busyAsset === a.asset_id ? "…" : "▶ Listen"}
                      </button>
                    )}
                  </div>
                ))}
                {canSession && session.map((a) => (
                  <div className="rv-asset" key={a.asset_id}>
                    <span className="name">{a.filename} (full session)</span>
                    <button disabled={busyAsset === a.asset_id}
                      onClick={() => getAsset(a.asset_id, a.kind)}>
                      {busyAsset === a.asset_id ? "…" : "Download"}
                    </button>
                  </div>
                ))}
              </>
            )}
          </section>
        )}

        {/* LAYER 3 — methodology, collapsible, for the technical reviewer */}
        <section className="rv-method">
          <button className="rv-method-toggle" onClick={() => setMethodOpen((o) => !o)}>
            {methodOpen ? "▾" : "▸"} How this was determined (technical detail)
          </button>
          {methodOpen && (
            <div className="rv-method-body">
              <p>
                SessionSeal scores same-session plausibility from weighted checks;
                each either matches, contradicts, or can't be evaluated. Absence of
                a signal never counts against the record.
                <Info text="We never penalize missing evidence — e.g. an all-MIDI project legitimately has no recorded takes. Only actual contradictions lower the score." />
              </p>
              <div className="rv-method-stat">
                Overall band: <b>{report.methodology.band}</b>
                {report.methodology.score != null && <> · score {report.methodology.score}/100</>}
                {report.methodology.coherence?.confidence != null && (
                  <> · stems→master {(report.methodology.coherence.confidence * 100).toFixed(1)}%</>
                )}
              </div>
              <table className="rv-checks">
                <thead><tr><th>Check</th><th>Result</th><th>Detail</th></tr></thead>
                <tbody>
                  {report.methodology.checks.map((c, i) => (
                    <tr key={i} className={c.result}>
                      <td>{c.check}</td>
                      <td>{c.result.replace("_", " ")}</td>
                      <td>{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="rv-disclaimer">
                This report evidences real studio work; it does not by itself
                prove authorship. It is intended to help a reviewer assess an
                AI-generation flag.
              </p>
            </div>
          )}
        </section>

        <footer className="rv-foot">
          Verified with SessionSeal · this page reflects the record's current
          shared state and is logged for the musician.
        </footer>
      </main>
    </div>
  );
}
