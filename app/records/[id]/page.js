"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Download, FileText, Share2, Link2, Copy, Check, Trash2, ChevronRight,
  AudioLines, FolderOpen, FileCheck,
} from "lucide-react";
import { AuthButton, Info } from "../../components";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";

function IconAction({ label, href, download, onClick, children }) {
  const btn = (
    <Button variant="outline" size="icon" className="rounded-full"
      asChild={!!href} onClick={onClick} aria-label={label}>
      {href
        ? <a href={href} {...(download ? {} : { target: "_blank", rel: "noopener noreferrer" })}>{children}</a>
        : children}
    </Button>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const API = "/backend";

const TIER_META = {
  STEM_PREVIEW: {
    label: "Isolated stems",
    sub: "Reviewer can listen to each stem in the browser (no download).",
    tip: "Hearing the separate layers of the song (drums, vocals, and so on) is strong confirmation of real multi-track production. An AI export has no stems.",
    Icon: AudioLines,
  },
  SESSION: {
    label: "Full session file",
    sub: "Reviewer can download your complete project file.",
    tip: "Your most sensitive file. Only enable this if a reviewer specifically asks. Most disputes are won with the report alone.",
    Icon: FolderOpen,
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
        toast.success("Access updated");
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
    } catch (e) { toast.error(e.message); setBusy(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal">
            {editing ? "Manage access" : "Create a dispute link"}
          </DialogTitle>
          <DialogDescription>
            Choose exactly what the reviewer can see. You can change this anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-1">
          <div className="grid gap-2">
            <Label className="flex items-center text-muted-foreground">
              Label
              <Info text="A private note to help you remember which dispute this link is for. The reviewer never sees it." />
            </Label>
            <Input value={label} placeholder="e.g. DistroKid ticket #4821"
              onChange={(e) => setLabel(e.target.value)} />
          </div>

          <div className="grid gap-1">
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              What the reviewer can access
            </div>
            <div className="flex items-center gap-3 py-3 border-t border-border">
              <FileCheck className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <div className="text-sm font-semibold">Verification report</div>
                <div className="text-xs text-muted-foreground">
                  Always on. The plain-language evidence that wins most disputes.
                </div>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Included</span>
            </div>
            {["STEM_PREVIEW", "SESSION"].map((t) => {
              const m = TIER_META[t];
              return (
                <div key={t} className="flex items-center gap-3 py-3 border-t border-border">
                  <m.Icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center text-sm font-semibold">
                      {m.label}<Info text={m.tip} />
                    </div>
                    <div className="text-xs text-muted-foreground">{m.sub}</div>
                  </div>
                  <Switch checked={tiers.has(t)} onCheckedChange={() => toggle(t)} />
                </div>
              );
            })}
          </div>

          {!editing && (
            <div className="grid gap-2">
              <Label className="flex items-center text-muted-foreground">
                Link expires after
                <Info text="After this, the link stops working automatically. You can also revoke it anytime." />
              </Label>
              <Select value={String(expiry)} onValueChange={(v) => setExpiry(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="0">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} onClick={save}>
            {busy ? "Saving…" : editing ? "Save changes" : "Create link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CopyLinkRow({ url }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true); toast.success("Link copied");
      setTimeout(() => setCopied(false), 1600);
    });
  }
  return (
    <div className="flex items-center gap-2 rounded-[10px] border border-border bg-secondary px-3 py-2">
      <Link2 className="size-4 shrink-0 text-muted-foreground" />
      <code className="flex-1 truncate text-xs">{url}</code>
      <Button size="sm" onClick={copy} className="shrink-0">
        {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy</>}
      </Button>
    </div>
  );
}

function CreatedLink({ url, onClose }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal">Your link is ready</DialogTitle>
          <DialogDescription>
            Paste this into your reply to the distributor. They won't need a
            SessionSeal account to open it.
          </DialogDescription>
        </DialogHeader>
        <div className="py-1"><CopyLinkRow url={url} /></div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

  function copyLink(token) {
    navigator.clipboard.writeText(`${window.location.origin}/s/${token}`)
      .then(() => toast.success("Link copied"));
  }

  return (
    <section id="dispute-links" className="mt-8 scroll-mt-6 border-t border-border pt-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center text-lg font-bold">
            Dispute links
            <Info text="If a distributor flags this track as AI, send them a link. They see a plain-language report proving real studio work. You control exactly what each link can access and can change or revoke it anytime." />
          </h2>
          <p className="mt-1 max-w-[46ch] text-sm text-muted-foreground">
            Share this record's evidence with a distributor, without handing over your files.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="shrink-0 gap-1.5">
          <Link2 className="size-4" /> New link
        </Button>
      </div>

      {shares === null && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[68px] w-full rounded-xl" />
          <Skeleton className="h-[68px] w-full rounded-xl" />
        </div>
      )}
      {shares && active.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
          No links yet. Create one to share this record with a reviewer.
        </div>
      )}

      {shares && active.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {active.map((s) => {
            const extra = s.tiers.filter((t) => t !== "REPORT");
            const views = (s.accesses || []).length;
            const reviewers = new Set((s.accesses || [])
              .map((a) => a.reviewer_email).filter(Boolean)).size;
            const last = (s.accesses || [])[0];
            return (
              <div key={s.id}
                className="group flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3.5 transition-colors hover:border-accent cursor-pointer"
                onClick={() => setDetail(s)}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <b className="text-[0.95rem]">{s.label || "Untitled link"}</b>
                    <div className="flex flex-wrap gap-1.5">
                      {extra.length === 0 ? (
                        <Badge variant="outline" className="text-muted-foreground">Report only</Badge>
                      ) : extra.map((t) => (
                        <Badge key={t} variant="secondary">{TIER_META[t].label}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground">
                    {views === 0
                      ? "Not opened yet"
                      : `Opened ${views} time${views > 1 ? "s" : ""}` +
                        (reviewers ? ` by ${reviewers} reviewer${reviewers > 1 ? "s" : ""}` : "") +
                        (last ? ` · last ${relTime(last.created_at)}` : "")}
                  </div>
                </div>
                <Button variant="ghost" size="icon"
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); copyLink(s.token); }}
                  aria-label="Copy link">
                  <Copy className="size-4" />
                </Button>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
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

// Detail dialog: link, activity timeline, manage / revoke. Opened by a card.
function ShareDetail({ share, onClose, onEdit, onRevoke }) {
  const extra = share.tiers.filter((t) => t !== "REPORT");
  const accesses = share.accesses || [];
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/s/${share.token}` : "";
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal">
            {share.label || "Untitled link"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-1">
          <div className="flex flex-wrap gap-1.5">
            {extra.length === 0
              ? <Badge variant="outline" className="text-muted-foreground">Report only</Badge>
              : <>
                  <Badge variant="secondary">Report</Badge>
                  {extra.map((t) => <Badge key={t} variant="secondary">{TIER_META[t].label}</Badge>)}
                </>}
          </div>

          <CopyLinkRow url={url} />

          <div>
            <div className="mb-3 text-xs font-semibold text-muted-foreground">Activity</div>
            {accesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">This link hasn't been opened yet.</p>
            ) : (
              <ul className="flex flex-col gap-3.5">
                {accesses.map((a, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                    <div>
                      <b>{a.reviewer_email || "A reviewer"}</b>{" "}
                      {a.action === "VIEW_REPORT" ? "viewed the report"
                        : a.action === "STREAM_STEM" ? "listened to a stem"
                        : a.action === "DOWNLOAD_SESSION" ? "downloaded the session"
                        : "accessed the record"}
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {relTime(a.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {confirmRevoke ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Revoke now?</span>
              <Button variant="destructive" size="sm"
                onClick={() => { onRevoke(); toast.success("Link revoked"); }}>
                Yes, revoke
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmRevoke(false)}>Keep</Button>
            </div>
          ) : (
            <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => setConfirmRevoke(true)}>
              <Trash2 className="size-4" /> Revoke
            </Button>
          )}
          <Button onClick={onEdit}>Manage access</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        {!rec && !error && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-48 w-full rounded-2xl" />
          </div>
        )}

        {rec && (
          <>
            <div className="db-rec-head">
              <div>
                <h1>{rec.title || "Untitled"}</h1>
                <p className="artist">{rec.artist_name}</p>
              </div>
              {sealed && (
                <div className="rec-actions">
                  <IconAction label="Download signed master"
                    href={`${API}/records/${rec.id}/release`} download>
                    <Download className="size-[18px]" />
                  </IconAction>
                  {rec.manifest_public_url && (
                    <IconAction label="View signed manifest"
                      href={rec.manifest_public_url}>
                      <FileText className="size-[18px]" />
                    </IconAction>
                  )}
                  <IconAction label="Share for a dispute"
                    onClick={() => document.getElementById("dispute-links")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                    <Share2 className="size-[18px]" />
                  </IconAction>
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
