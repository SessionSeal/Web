"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Lock, Play, Download, ChevronDown,
  AudioLines, FolderOpen, ExternalLink, CircleCheck, TriangleAlert, MinusCircle,
} from "lucide-react";
import { Info, Mark, Wordmark } from "../../components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const API = "/backend";

// Verdict band -> the accent it paints with. STRONG = green (real work found),
// MODERATE = brand blue, WEAK = amber, CONTRADICTED = red.
const BAND_STYLE = {
  STRONG: {
    badge: "border-transparent bg-[rgba(74,222,128,0.14)] text-[#4ade80]",
    glow: "radial-gradient(ellipse 90% 130% at 50% -20%, rgba(74,222,128,0.10), transparent 70%)",
    ring: "border-[rgba(74,222,128,0.35)]",
  },
  MODERATE: {
    badge: "border-transparent bg-[rgba(77,126,255,0.16)] text-[#7ea0ff]",
    glow: "radial-gradient(ellipse 90% 130% at 50% -20%, rgba(77,126,255,0.12), transparent 70%)",
    ring: "border-[rgba(77,126,255,0.35)]",
  },
  WEAK: {
    badge: "border-transparent bg-[rgba(234,179,8,0.14)] text-[#eab308]",
    glow: "none",
    ring: "border-[rgba(234,179,8,0.35)]",
  },
  CONTRADICTED: {
    badge: "border-transparent bg-[rgba(248,113,113,0.14)] text-[#f87171]",
    glow: "none",
    ring: "border-[rgba(248,113,113,0.4)]",
  },
};

const BAND_LABEL = {
  STRONG: "Strong evidence",
  MODERATE: "Moderate evidence",
  WEAK: "Limited evidence",
  CONTRADICTED: "Inconsistent",
};

// Methodology check result -> icon + color.
const RESULT_META = {
  match: { Icon: CircleCheck, cls: "text-[#4ade80]", label: "Match" },
  contradiction: { Icon: TriangleAlert, cls: "text-[#f87171]", label: "Contradiction" },
  not_evaluable: { Icon: MinusCircle, cls: "text-muted-foreground", label: "Not evaluable" },
};

function fmtDate(iso) {
  if (!iso) return "unknown date";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// The reviewer-facing top bar: same brand lockup as the app, but no auth and
// no "seal a track" CTA (the reviewer is anonymous). A trust chip on the right
// reinforces that this is a verified record rather than a marketing page.
function ReviewerTop({ verified = false }) {
  return (
    <div className="wz-top">
      <a className="ld-mark" href="/"
        style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: "var(--text)", fontWeight: 500, fontSize: "0.9rem" }}>
        <Mark />
        <Wordmark />
      </a>
      {verified && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Lock className="size-3.5 text-[#4ade80]" />
          Verified record
        </span>
      )}
    </div>
  );
}

// One stem row with an inline player. Fetches a short-lived signed URL on first
// play; the audio element is download-disabled (previews are throwaway).
function StemRow({ token, asset, email }) {
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      const res = await fetch(`${API}/shares/${token}/asset-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: asset.asset_id, email: email || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "This stem is not available.");
      setUrl(body.url);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3">
      <AudioLines className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm">{asset.filename}</span>
      {url ? (
        <audio controls autoPlay controlsList="nodownload" src={url}
          className="h-9 max-w-[220px]" />
      ) : (
        <Button size="sm" variant="outline" disabled={busy} onClick={load} className="shrink-0 gap-1.5">
          <Play className="size-3.5" /> {busy ? "Loading" : "Listen"}
        </Button>
      )}
    </div>
  );
}

function SessionRow({ token, asset, email }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`${API}/shares/${token}/asset-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: asset.asset_id, email: email || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "This file is not available.");
      window.location.href = body.url;
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3">
      <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm">{asset.filename}<span className="text-muted-foreground"> (full session)</span></span>
      <Button size="sm" variant="outline" disabled={busy} onClick={download} className="shrink-0 gap-1.5">
        <Download className="size-3.5" /> {busy ? "Preparing" : "Download"}
      </Button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="wz-shell db-shell">
      <ReviewerTop />
      <main className="mx-auto w-full max-w-[720px] px-6 pb-24 pt-8" aria-hidden="true">
        <Skeleton className="h-[190px] w-full rounded-[18px]" />
        <Skeleton className="mt-4 h-16 w-full rounded-xl" />
        <Skeleton className="mt-7 h-6 w-72 rounded" />
        <Skeleton className="mt-4 h-24 w-full rounded-xl" />
        <Skeleton className="mt-3 h-24 w-full rounded-xl" />
      </main>
    </div>
  );
}

function MessageState({ title, body }) {
  return (
    <div className="wz-shell db-shell">
      <ReviewerTop />
      <main className="mx-auto flex w-full max-w-[460px] flex-col items-center px-6 pt-24 text-center">
        <Mark />
        <h1 className="mt-4 font-serif text-3xl font-normal">{title}</h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">{body}</p>
      </main>
    </div>
  );
}

export default function ReviewerPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [methodOpen, setMethodOpen] = useState(false);

  const emailKey = `ss-share-email:${token}`;

  // Re-check access on every mount: the DB is the source of truth, so a revoked
  // or tier-changed share is reflected the moment the reviewer reloads.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let saved = "";
    try { saved = localStorage.getItem(emailKey) || ""; } catch {}
    if (saved) { setEmail(saved); setEmailInput(saved); }
    const q = saved ? `?email=${encodeURIComponent(saved)}` : "";
    fetch(`${API}/shares/${token}${q}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404
          ? "This link is no longer active. The musician may have revoked it, or it has expired."
          : "We couldn't load this record. Please try again shortly.");
        return r.json();
      })
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [token]);

  function saveEmail(e) {
    e.preventDefault();
    const v = emailInput.trim();
    if (!v) return;
    try { localStorage.setItem(emailKey, v); } catch {}
    setEmail(v);
    toast.success("Access unlocked");
  }

  if (error) return <MessageState title="Link unavailable" body={error} />;
  if (!data) return <LoadingState />;

  const { report, tiers, assets } = data;
  const v = report.verdict;
  const band = v.band || "WEAK";
  const style = BAND_STYLE[band] || BAND_STYLE.WEAK;
  const canStems = tiers.includes("STEM_PREVIEW");
  const canSession = tiers.includes("SESSION");
  const stems = (assets || []).filter((a) => a.kind === "STEM");
  const session = (assets || []).filter((a) => a.kind === "PROJECT");
  const showAssets = (canStems || canSession) && (stems.length > 0 || session.length > 0);
  const emailUnlocked = !!email;

  return (
    <div className="wz-shell db-shell">
      <ReviewerTop verified />

      <main className="mx-auto w-full max-w-[720px] px-6 pb-24 pt-8">
        {/* LAYER 1 - the verdict, in plain words */}
        <section
          className={`rounded-[18px] border ${style.ring} p-7`}
          style={{ background: `${style.glow}, var(--panel)` }}>
          <Badge className={`mb-3.5 rounded-full px-3 py-1 text-[0.7rem] font-bold tracking-wide ${style.badge}`}>
            {BAND_LABEL[band] || band}
          </Badge>
          <h1 className="font-serif text-[clamp(1.8rem,4.5vw,2.5rem)] font-normal leading-[1.12]">
            {v.headline}
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">{v.summary}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-border pt-4 text-sm text-muted-foreground">
            <span><b className="text-foreground">{report.title}</b> by {report.artist}</span>
            <span>Sealed {fmtDate(report.sealed_at)}</span>
          </div>
        </section>

        {/* Integrity strip. One (i) only, on C2PA, the single term a reviewer
            genuinely won't know. */}
        <section className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-secondary px-4 py-3.5 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0 text-[#4ade80]" />
          <p className="leading-relaxed">
            Cryptographically sealed and unaltered since {fmtDate(report.sealed_at)}.
            {report.integrity.manifest_url && (
              <>
                {" "}
                <a href={report.integrity.manifest_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand hover:underline">
                  View the signed record <ExternalLink className="size-3" />
                </a>
                <Info text="The signed record is a C2PA Content Credential: a public, tamper-evident file using the same standard Adobe, camera makers, and streaming platforms use to verify where content came from." />
              </>
            )}
          </p>
        </section>

        {/* Hear the material FIRST: the strongest, most direct evidence a
            reviewer can check with their own ears. Behind the email gate. */}
        {showAssets && (
          <section className="mt-8">
            <h2 className="inline-flex items-center text-lg font-bold">
              {canStems && "Hear the isolated stems"}
              {canStems && canSession && " and session"}
              {!canStems && canSession && "The session file"}
              <Info text="Stems are the separate layers of the song (drums, vocals, and so on). Hearing them isolated is strong confirmation of real multi-track production, since an AI export has none. The session file is the producer's complete project." />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The most direct check you can make: real multi-track production sounds
              like separable layers. An AI export has none.
            </p>

            {!emailUnlocked ? (
              <form onSubmit={saveEmail}
                className="mt-4 rounded-xl border border-border bg-secondary p-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Enter your email to access these. It is logged so the musician can
                  see who reviewed the material. No account needed.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input type="email" required placeholder="you@distributor.com"
                    value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                    className="flex-1" />
                  <Button type="submit" className="shrink-0">Continue</Button>
                </div>
              </form>
            ) : (
              <div className="mt-4 flex flex-col gap-2.5">
                {canStems && stems.map((a) => (
                  <StemRow key={a.asset_id} token={token} asset={a} email={email} />
                ))}
                {canSession && session.map((a) => (
                  <SessionRow key={a.asset_id} token={token} asset={a} email={email} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* The evidence, as a scannable checklist. No subtitle, no per-row (i):
            each row leads with the plain claim and shows the specifics beneath. */}
        <section className="mt-10 border-t border-border pt-8">
          <h2 className="text-lg font-bold">Why this looks like real studio work</h2>

          {report.evidence.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              No individual studio-work signals were confirmable for this record. See the detailed breakdown below before relying on this alone.
            </div>
          ) : (
            <ul className="mt-5 flex flex-col divide-y divide-border">
              {report.evidence.map((e, i) => (
                <li key={i} className="flex gap-3.5 py-4 first:pt-0">
                  <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-[#4ade80]" />
                  <div className="min-w-0">
                    <b className="text-[0.98rem] font-semibold">{e.title}</b>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {e.meaning}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* LAYER 3 - methodology, collapsible, for the technical reviewer */}
        <section className="mt-8 border-t border-border pt-7">
          <button type="button" onClick={() => setMethodOpen((o) => !o)}
            className="flex w-full items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ChevronDown className={`size-4 transition-transform ${methodOpen ? "" : "-rotate-90"}`} />
            How this was determined (technical detail)
          </button>

          {methodOpen && (
            <div className="mt-4 rounded-xl border border-border bg-secondary p-5">
              <p className="inline-flex items-start text-sm leading-relaxed text-muted-foreground">
                <span>
                  SessionSeal scores same-session plausibility from a set of weighted
                  checks. Each one either matches, contradicts, or cannot be evaluated.
                  The absence of a signal never counts against the record.
                </span>
                <Info text="We never penalise missing evidence. An all-MIDI project legitimately has no recorded takes, for example. Only actual contradictions lower the score." />
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="text-muted-foreground">Overall band:</span>
                <b>{report.methodology.band}</b>
                {report.methodology.score != null && (
                  <span className="text-muted-foreground">· score {report.methodology.score}/100</span>
                )}
                {report.methodology.coherence?.confidence != null && (
                  <span className="text-muted-foreground">
                    · stems rebuild the master {(report.methodology.coherence.confidence * 100).toFixed(1)}%
                  </span>
                )}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-semibold">Check</th>
                      <th className="py-2 pr-3 font-semibold">Result</th>
                      <th className="py-2 font-semibold">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.methodology.checks.map((c, i) => {
                      const rm = RESULT_META[c.result] || RESULT_META.not_evaluable;
                      return (
                        <tr key={i} className="border-b border-border/60 align-top">
                          <td className="py-2.5 pr-3">{c.check}</td>
                          <td className="py-2.5 pr-3">
                            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${rm.cls}`}>
                              <rm.Icon className="size-3.5" /> {rm.label}
                            </span>
                          </td>
                          <td className="py-2.5 text-muted-foreground">{c.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs italic leading-relaxed text-muted-foreground">
                This report evidences real studio work. It does not by itself prove
                authorship. It is intended to help a reviewer assess an AI-generation flag.
              </p>
            </div>
          )}
        </section>

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          Verified with SessionSeal. This page reflects the record's current shared
          state and is logged for the musician.
        </footer>
      </main>
    </div>
  );
}
