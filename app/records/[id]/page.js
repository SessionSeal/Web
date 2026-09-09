"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthButton, Info } from "../../components";

const API = "/backend";

const TIER_INFO = {
  STEM_PREVIEW: {
    label: "Isolated stems",
    tip: "Lets the reviewer LISTEN to your individual stems (no download) to confirm real multi-track production. Hearing separate layers is strong proof it isn't an AI export.",
  },
  SESSION: {
    label: "Full session file",
    tip: "Lets the reviewer DOWNLOAD your complete .logicx project — your most sensitive file. Only enable this if a reviewer specifically needs it; most disputes are won with the report alone.",
  },
};

function SharePanel({ recordId }) {
  const [shares, setShares] = useState(null);
  const [stem, setStem] = useState(false);
  const [session, setSession] = useState(false);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState(null);
  const [copied, setCopied] = useState(false);

  function load() {
    fetch(`${API}/records/${recordId}/shares`)
      .then((r) => (r.ok ? r.json() : { shares: [] }))
      .then((d) => setShares(d.shares || []))
      .catch(() => setShares([]));
  }
  useEffect(load, [recordId]);

  async function create() {
    setCreating(true);
    try {
      const tiers = ["REPORT", ...(stem ? ["STEM_PREVIEW"] : []), ...(session ? ["SESSION"] : [])];
      const res = await fetch(`${API}/records/${recordId}/shares`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers, label: label.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "failed");
      setNewLink(`${window.location.origin}/s/${body.token}`);
      setLabel(""); setStem(false); setSession(false);
      load();
    } catch (e) { alert(e.message); } finally { setCreating(false); }
  }

  async function revoke(id) {
    if (!confirm("Revoke this link? The reviewer will immediately lose access.")) return;
    await fetch(`${API}/shares/${id}/revoke`, { method: "POST" });
    load();
  }

  async function toggleTier(share, tier) {
    const has = share.tiers.includes(tier);
    const tiers = has ? share.tiers.filter((t) => t !== tier)
                      : [...share.tiers, tier];
    await fetch(`${API}/shares/${share.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tiers }),
    });
    load();
  }

  return (
    <div className="sh-panel">
      <h3>Share for a dispute
        <Info text="If a distributor flags this track as AI, create a link to send them. They see a plain-language report proving real studio work — no SessionSeal account needed on their end. You control exactly what they can access, and can change or revoke it anytime." />
      </h3>
      <p className="hint">
        Creates one link you paste into the distributor's reply. The report is
        always included; you choose whether they can also hear stems or download
        the session.
      </p>

      <div className="sh-tier">
        <input type="checkbox" checked readOnly />
        <span className="lbl"><b>Verification report</b>
          <span>Always included — the plain-language evidence. Wins most disputes on its own.</span>
        </span>
      </div>
      {["STEM_PREVIEW", "SESSION"].map((t) => (
        <div className="sh-tier" key={t}>
          <input type="checkbox"
            checked={t === "STEM_PREVIEW" ? stem : session}
            onChange={(e) => (t === "STEM_PREVIEW" ? setStem : setSession)(e.target.checked)} />
          <span className="lbl"><b>{TIER_INFO[t].label}<Info text={TIER_INFO[t].tip} /></b></span>
        </div>
      ))}

      <div className="sh-row">
        <input type="text" placeholder="Label (e.g. DistroKid ticket #4821)"
          value={label} onChange={(e) => setLabel(e.target.value)} />
        <button className="sh-btn" disabled={creating} onClick={create}>
          {creating ? "Creating…" : "Create link"}
        </button>
      </div>

      {newLink && (
        <div className="sh-link">
          <code>{newLink}</code>
          <button className="sh-btn" onClick={() => {
            navigator.clipboard.writeText(newLink).then(() => {
              setCopied(true); setTimeout(() => setCopied(false), 1500);
            });
          }}>{copied ? "Copied ✓" : "Copy"}</button>
        </div>
      )}

      {shares && shares.length > 0 && (
        <div className="sh-existing">
          {shares.map((s) => (
            <div className={`sh-share ${s.status === "REVOKED" ? "sh-revoked" : ""}`} key={s.id}>
              <b>{s.label || "Untitled share"}</b> — {s.status.toLowerCase()}
              {s.tiers.filter((t) => t !== "REPORT").length > 0 &&
                <> · {s.tiers.filter((t) => t !== "REPORT").map((t) => TIER_INFO[t]?.label).join(", ")}</>}
              <div className="meta">
                {(s.accesses || []).length} view{(s.accesses || []).length === 1 ? "" : "s"}
                {(s.accesses || [])[0] && <> · last: {(s.accesses[0].reviewer_email || "anonymous")} on {new Date(s.accesses[0].created_at).toLocaleDateString()}</>}
              </div>
              {s.status !== "REVOKED" && (
                <div className="acts">
                  <button onClick={() => toggleTier(s, "STEM_PREVIEW")}>
                    {s.tiers.includes("STEM_PREVIEW") ? "Disable stems" : "Enable stems"}
                  </button>
                  <button onClick={() => toggleTier(s, "SESSION")}>
                    {s.tiers.includes("SESSION") ? "Disable session" : "Enable session"}
                  </button>
                  <button onClick={() => revoke(s.id)}>Revoke</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

            {sealed && <SharePanel recordId={rec.id} />}

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
