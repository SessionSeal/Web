"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthButton, Info, IconButton, Icons, Modal, Switch } from "../../components";

const API = "/backend";

const TIER_META = {
  STEM_PREVIEW: {
    label: "Isolated stems",
    sub: "Reviewer can listen to each stem in the browser (no download).",
    tip: "Hearing the separate layers of the song (drums, vocals, and so on) is strong confirmation of real multi-track production. An AI export has no stems.",
    icon: Icons.wave,
  },
  SESSION: {
    label: "Full session file",
    sub: "Reviewer can download your complete project file.",
    tip: "Your most sensitive file. Only enable this if a reviewer specifically asks. Most disputes are won with the report alone.",
    icon: Icons.folder,
  },
};

function relTime(iso) {
  const d = new Date(iso), now = Date.now();
  const s = Math.round((now - d) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`;
  const days = Math.round(h / 24); if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// The shared create/edit modal — same shape for both flows.
function ShareModal({ recordId, existing, onClose, onSaved }) {
  const editing = !!existing;
  const [label, setLabel] = useState(existing?.label || "");
  const [tiers, setTiers] = useState(
    new Set(existing?.tiers || ["REPORT"]));
  const [expiry, setExpiry] = useState(existing?.expiryDays ?? 30);
  const [busy, setBusy] = useState(false);

  function toggle(t) {
    setTiers((prev) => {
      const n = new Set(prev);
      n.has(t) ? n.delete(t) : n.add(t);
      n.add("REPORT");
      return n;
    });
  }

  async function save() {
    setBusy(true);
    try {
      const tierArr = ["REPORT", ...[...tiers].filter((t) => t !== "REPORT")];
      if (editing) {
        await fetch(`${API}/shares/${existing.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tiers: tierArr, label: label.trim() }),
        });
        onSaved(null);
      } else {
        const res = await fetch(`${API}/records/${recordId}/shares`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tiers: tierArr, label: label.trim(),
            expires_at: expiry ? new Date(Date.now() + expiry * 864e5).toISOString() : null,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail || "failed");
        onSaved(`${window.location.origin}/s/${body.token}`);
      }
    } catch (e) { alert(e.message); setBusy(false); }
  }

  return (
    <Modal
      title={editing ? "Manage access" : "Create a dispute link"}
      onClose={onClose}
      footer={
        <>
          <button className="sh-ghost" onClick={onClose}>Cancel</button>
          <button className="sh-primary" disabled={busy} onClick={save}>
            {busy ? "Saving…" : editing ? "Save changes" : "Create link"}
          </button>
        </>
      }>
      <label className="sh-field">
        <span>Label<Info text="A private note to help you remember which dispute this link is for. The reviewer never sees it." /></span>
        <input type="text" value={label} placeholder="e.g. DistroKid ticket #4821"
          onChange={(e) => setLabel(e.target.value)} />
      </label>

      <div className="sh-access">
        <div className="sh-access-head">What the reviewer can access</div>
        <div className="sh-accessrow locked">
          <span className="ic"><Icons.doc /></span>
          <div className="txt">
            <b>Verification report</b>
            <span>Always on. The plain-language evidence that wins most disputes.</span>
          </div>
          <span className="sh-always">Included</span>
        </div>
        {["STEM_PREVIEW", "SESSION"].map((t) => {
          const m = TIER_META[t];
          return (
            <div className="sh-accessrow" key={t}>
              <span className="ic"><m.icon /></span>
              <div className="txt">
                <b>{m.label}<Info text={m.tip} /></b>
                <span>{m.sub}</span>
              </div>
              <Switch checked={tiers.has(t)} onChange={() => toggle(t)} />
            </div>
          );
        })}
      </div>

      {!editing && (
        <label className="sh-field">
          <span>Link expires after<Info text="After this, the link stops working automatically. You can also revoke it anytime." /></span>
          <select value={expiry} onChange={(e) => setExpiry(Number(e.target.value))}>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={0}>Never</option>
          </select>
        </label>
      )}
    </Modal>
  );
}

function CreatedLink({ url, onClose }) {
  const [copied, setCopied] = useState(false);
  return (
    <Modal title="Your link is ready" onClose={onClose}
      footer={<button className="sh-primary" onClick={onClose}>Done</button>}>
      <p className="sh-modal-note">
        Paste this into your reply to the distributor. They will not need a
        SessionSeal account to open it.
      </p>
      <div className="sh-linkbox">
        <span className="ic"><Icons.link /></span>
        <code>{url}</code>
        <button className="sh-copy" onClick={() => {
          navigator.clipboard.writeText(url).then(() => {
            setCopied(true); setTimeout(() => setCopied(false), 1600);
          });
        }}>{copied ? "Copied" : <><Icons.copy /> Copy</>}</button>
      </div>
    </Modal>
  );
}

function SharePanel({ recordId }) {
  const [shares, setShares] = useState(null);
  const [creating, setCreating] = useState(false);   // create modal open
  const [editing, setEditing] = useState(null);      // share being edited
  const [createdLink, setCreatedLink] = useState(null); // just-created url
  const [detail, setDetail] = useState(null);        // share whose activity is open

  function load() {
    return fetch(`${API}/records/${recordId}/shares`)
      .then((r) => (r.ok ? r.json() : { shares: [] }))
      .then((d) => setShares(d.shares || []))
      .catch(() => setShares([]));
  }
  useEffect(() => { load(); }, [recordId]);

  async function revoke(id) {
    await fetch(`${API}/shares/${id}/revoke`, { method: "POST" });
    load();
  }

  const active = (shares || []).filter((s) => s.status !== "REVOKED");

  return (
    <section className="sh-panel">
      <div className="sh-panel-head">
        <div>
          <h2>Dispute links<Info text="If a distributor flags this track as AI, send them a link. They see a plain-language report proving real studio work. You control exactly what each link can access and can change or revoke it anytime." /></h2>
          <p>Share this record's evidence with a distributor, without handing over your files.</p>
        </div>
        <button className="sh-primary" onClick={() => setCreating(true)}>
          <Icons.link /> New link
        </button>
      </div>

      {shares === null && <p className="sh-empty">Loading…</p>}
      {shares && active.length === 0 && (
        <div className="sh-empty">
          No links yet. Create one to share this record with a reviewer.
        </div>
      )}

      {shares && active.length > 0 && (
        <div className="sh-list">
          {active.map((s) => {
            const extra = s.tiers.filter((t) => t !== "REPORT");
            const views = (s.accesses || []).length;
            const reviewers = new Set((s.accesses || [])
              .map((a) => a.reviewer_email).filter(Boolean)).size;
            const last = (s.accesses || [])[0];
            return (
              <div className="sh-card" key={s.id} onClick={() => setDetail(s)}>
                <div className="sh-card-main">
                  <div className="sh-card-title">
                    <b>{s.label || "Untitled link"}</b>
                    <span className="sh-badges">
                      <span className="sh-badge report">Report</span>
                      {extra.map((t) => (
                        <span className="sh-badge" key={t}>{TIER_META[t].label}</span>
                      ))}
                    </span>
                  </div>
                  <div className="sh-card-activity">
                    {views === 0
                      ? "Not opened yet"
                      : `Opened ${views} time${views > 1 ? "s" : ""}` +
                        (reviewers ? ` by ${reviewers} reviewer${reviewers > 1 ? "s" : ""}` : "") +
                        (last ? ` · last ${relTime(last.created_at)}` : "")}
                  </div>
                </div>
                <span className="sh-card-chev">›</span>
              </div>
            );
          })}
        </div>
      )}

      {creating && (
        <ShareModal recordId={recordId} onClose={() => setCreating(false)}
          onSaved={(link) => { load(); setCreating(false); if (link) setCreatedLink(link); }} />
      )}
      {createdLink && (
        <CreatedLink url={createdLink} onClose={() => setCreatedLink(null)} />
      )}
      {editing && (
        <ShareModal recordId={recordId}
          existing={{ id: editing.id, label: editing.label, tiers: editing.tiers }}
          onClose={() => setEditing(null)}
          onSaved={() => { load(); setEditing(null); }} />
      )}
      {detail && (
        <ShareDetail share={detail} onClose={() => setDetail(null)}
          onEdit={() => { const s = detail; setDetail(null); setEditing(s); }}
          onRevoke={async () => { await revoke(detail.id); setDetail(null); }} />
      )}
    </section>
  );
}

// Detail drawer: activity timeline + manage / revoke, opened by clicking a card.
function ShareDetail({ share, onClose, onEdit, onRevoke }) {
  const extra = share.tiers.filter((t) => t !== "REPORT");
  const accesses = share.accesses || [];
  return (
    <Modal title={share.label || "Untitled link"} onClose={onClose}
      footer={
        <>
          <button className="sh-danger" onClick={() => {
            if (confirm("Revoke this link? The reviewer loses access immediately.")) onRevoke();
          }}><Icons.trash /> Revoke</button>
          <button className="sh-primary" onClick={onEdit}>Manage access</button>
        </>
      }>
      <div className="sh-detail-tiers">
        <span className="sh-badge report">Report</span>
        {extra.map((t) => <span className="sh-badge" key={t}>{TIER_META[t].label}</span>)}
      </div>
      <div className="sh-detail-sub">Activity</div>
      {accesses.length === 0 ? (
        <p className="sh-empty">This link hasn't been opened yet.</p>
      ) : (
        <ul className="sh-timeline">
          {accesses.map((a, i) => (
            <li key={i}>
              <span className="dot" />
              <div>
                <b>{a.reviewer_email || "A reviewer"}</b>{" "}
                {a.action === "VIEW_REPORT" ? "viewed the report"
                  : a.action === "STREAM_STEM" ? "listened to a stem"
                  : a.action === "DOWNLOAD_SESSION" ? "downloaded the session"
                  : "accessed the record"}
                <span className="t">{relTime(a.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
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
          ? "This record doesn't exist, or it isn't yours."
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
              {sealed && (
                <div className="rec-actions">
                  <IconButton label="Download signed master"
                    href={`${API}/records/${rec.id}/release`} download>
                    <Icons.download />
                  </IconButton>
                  {rec.manifest_public_url && (
                    <IconButton label="View signed manifest"
                      href={rec.manifest_public_url}>
                      <Icons.manifest />
                    </IconButton>
                  )}
                </div>
              )}
            </div>

            <div className="db-rec-when">
              <span className={`rec-status ${sealed ? "ok" : rec.status === "FAILED" ? "bad" : "busy"}`}>
                {sealed ? "Sealed" : rec.status === "FAILED" ? "Failed" : "Sealing"}
              </span>
              {sealed
                ? <> {fmtDateTime(rec.sealed_at || rec.created_at)} · </>
                : <> {fmtDateTime(rec.created_at)} · </>}
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
                      This record was started but never finished sealing. The
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
                        ` · ${(rec.coherence_confidence * 100).toFixed(1)}% match`}
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
                      Cryptographically signed, record and results sealed
                      together
                    </span>
                  </li>
                )}
              </ul>
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
