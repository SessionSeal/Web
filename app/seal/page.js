"use client";

import { useEffect, useRef, useState } from "react";
import { zipSync } from "fflate";
import { signIn, useSession } from "next-auth/react";
import { AuthButton } from "../components";

const API = "/backend";

const PRESETS = {
  spotify: { label: "Spotify", codec: "vorbis", bitrate: "160", loudnorm: "-14", sample_rate: "44100", generations: "1" },
  apple: { label: "Apple Music", codec: "aac", bitrate: "256", loudnorm: "-16", sample_rate: "44100", generations: "1" },
  youtube: { label: "YouTube", codec: "aac", bitrate: "128", loudnorm: "-14", sample_rate: "48000", generations: "1" },
  trash: { label: "Worst case (×5)", codec: "opus", bitrate: "96", loudnorm: "-14", sample_rate: "48000", generations: "5" },
};

const STEPS = ["Your track", "Your stems", "Your session", "Seal it"];

function fmtBytes(n) {
  if (n == null) return "-";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

// A dropped bounce is almost always named after the track, so it seeds the
// title when that field is still empty. Strips the extension and the browser's
// " (1)" duplicate suffix, which can nest ("Belief.wav (1).wav").
const AUDIO_EXT = /\.(wav|wave|aif|aiff|mp3|m4a|flac|aac|ogg|caf)$/i;
function titleFromFilename(name) {
  let s = name;
  for (let i = 0; i < 4; i++) {
    const next = s.replace(AUDIO_EXT, "").replace(/\s*\(\d+\)\s*$/, "");
    if (next === s) break;
    s = next;
  }
  return s.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
}

async function walkEntry(entry, prefix, out) {
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej));
    out.push({ file, path: prefix });
    return;
  }
  if (entry.isDirectory) {
    const reader = entry.createReader();
    let batch;
    do {
      batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      for (const child of batch) await walkEntry(child, `${prefix}/${child.name}`, out);
    } while (batch.length > 0);
  }
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

function Confetti() {
  const ref = useRef(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#4d7eff", "#8fb0ff", "#f2f3f5", "#4ade80", "#eab308"];
    const parts = Array.from({ length: 170 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.35,
      y: h * 0.3,
      vx: (Math.random() - 0.5) * 12,
      vy: -(4 + Math.random() * 10),
      s: 4 + Math.random() * 5,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0],
    }));
    let frame;
    const t0 = performance.now();
    const tick = (t) => {
      const el = (t - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += 0.18;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - el / 2.6);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        ctx.restore();
      }
      if (el < 3) frame = requestAnimationFrame(tick);
      else setDone(true);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (done) return null;
  return (
    <canvas ref={ref} aria-hidden="true"
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh",
               pointerEvents: "none", zIndex: 60 }} />
  );
}

function Drop({ filled, big, small, onClick, onDrop, children }) {
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
      onDrop={(e) => { e.preventDefault(); setOver(false); onDrop(e); }}
    >
      <div className="big">{big}</div>
      <div className="small">{small}</div>
      {children}
    </div>
  );
}

export default function ArtistApp() {
  const { data: session, status: authStatus } = useSession();
  const [step, setStep] = useState(0);
  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [pastArtists, setPastArtists] = useState([]);

  // Prefill the artist with their most recent one; offer the rest as
  // one-click chips. Zero interaction for the single-alias musician.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/records`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.records) return;
        const seen = [];
        for (const r of d.records) {
          const a = (r.artist_name || "").trim();
          if (a && !seen.includes(a)) seen.push(a);
        }
        setPastArtists(seen);
        if (seen.length) setArtist((cur) => cur || seen[0]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const [master, setMaster] = useState(null);
  const [stems, setStems] = useState([]);
  const [project, setProject] = useState(null); // {files:[{file,path}], label} or {zip, label}
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null); // {pct, stage}
  const [record, setRecord] = useState(null);
  const [preset, setPreset] = useState("spotify");
  const [compressed, setCompressed] = useState(null);
  const [linkResult, setLinkResult] = useState(null);

  const masterInput = useRef(null);
  const stemsInput = useRef(null);
  const projInput = useRef(null);
  const folderInput = useRef(null);
  const linkInput = useRef(null);

  function pickMaster(f) {
    setMaster(f);
    setTitle((cur) => cur.trim() || titleFromFilename(f.name));
  }

  function dropFiles(e, multiple) {
    const files = Array.from(e.dataTransfer.files || []);
    return multiple ? files : files.slice(0, 1);
  }

  async function onProjectDrop(e) {
    const items = Array.from(e.dataTransfer.items || []);
    const collected = [];
    for (const item of items) {
      const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
      if (entry && entry.isDirectory) await walkEntry(entry, entry.name, collected);
      else if (entry && entry.isFile) {
        const f = await new Promise((res, rej) => entry.file(res, rej));
        collected.push({ file: f, path: f.name });
      }
    }
    if (collected.length === 1 && collected[0].path.toLowerCase().endsWith(".zip")) {
      setProject({ zip: collected[0].file, label: collected[0].file.name });
    } else if (collected.length) {
      setProject({
        files: collected,
        label: `${collected[0].path.split("/")[0]} (${collected.length} files)`,
      });
    }
  }

  const canNext =
    step === 0 ? title.trim() && artist.trim() && master :
    step === 1 ? stems.length >= 2 :
    step === 2 ? !!project : true;

  async function packProjectZip() {
    // A picked .zip uploads as-is; folder-picked/dragged files are zipped
    // in the browser (store-level, no compression, speed over size).
    if (project.zip) return project.zip;
    setProgress({ pct: 2, stage: "Packing your session" });
    const entries = {};
    for (const { file, path } of project.files) {
      entries[path] = new Uint8Array(await file.arrayBuffer());
    }
    const zipped = zipSync(entries, { level: 0 });
    return new Blob([zipped], { type: "application/zip" });
  }

  function putWithProgress(url, blob, contentType, onBytes) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      if (contentType) xhr.setRequestHeader("Content-Type", contentType);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) onBytes(ev.loaded);
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300)
        ? resolve() : reject(new Error(`upload failed (${xhr.status})`));
      xhr.onerror = () => reject(new Error("NetworkError"));
      xhr.send(blob);
    });
  }

  async function seal() {
    setBusy("seal");
    setError(null);
    setProgress({ pct: 0, stage: "Preparing" });
    let ticker = null;
    try {
      const projectBlob = await packProjectZip();

      // 1. draft record + upload slots
      const fileMeta = [
        { kind: "MASTER", filename: master.name,
          content_type: master.type || "audio/wav", size_bytes: master.size },
        ...stems.map((s) => ({ kind: "STEM", filename: s.name,
          content_type: s.type || "audio/wav", size_bytes: s.size })),
        { kind: "PROJECT", filename: "project.zip",
          content_type: "application/zip", size_bytes: projectBlob.size },
      ];
      const draftRes = await fetch(`${API}/records/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist: artist.trim(), title: title.trim(),
                               files: fileMeta }),
      });
      const draft = await draftRes.json();
      if (!draftRes.ok) throw new Error(draft.detail || "draft failed");

      // 2. upload each file straight to storage (real progress, 4-40%)
      const blobs = [master, ...stems, projectBlob];
      const totalBytes = blobs.reduce((a, b) => a + b.size, 0) || 1;
      const sent = blobs.map(() => 0);
      const bump = () => {
        const done = sent.reduce((a, b) => a + b, 0);
        setProgress({ pct: Math.min(40, 4 + Math.round((done / totalBytes) * 36)),
                      stage: "Uploading your files" });
      };
      for (let i = 0; i < blobs.length; i++) {
        const u = draft.uploads[i];
        await putWithProgress(u.url, blobs[i],
          fileMeta[i].content_type, (loaded) => { sent[i] = loaded; bump(); });
        sent[i] = blobs[i].size;
        bump();
      }

      // 3. seal, server-side work estimated 40-95% in pipeline order
      const t0 = Date.now();
      ticker = setInterval(() => {
        const t = (Date.now() - t0) / 1000;
        const pct = Math.round(40 + 55 * (1 - Math.exp(-t / 20)));
        const stage =
          pct < 52 ? "Checking your stems rebuild the master" :
          pct < 64 ? "Cross-examining your session" :
          pct < 76 ? "Embedding the inaudible watermark" :
          pct < 86 ? "Taking the sound fingerprint" :
          "Signing & timestamping";
        setProgress({ pct: Math.min(pct, 95), stage });
      }, 400);
      const sealRes = await fetch(`${API}/records/${draft.record_id}/seal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await sealRes.json();
      if (!sealRes.ok) throw new Error(body.detail || "sealing failed");
      setProgress({ pct: 100, stage: "Sealed" });
      setRecord(body);
    } catch (err) {
      const msg = String(err.message || err);
      setError(
        /NetworkError|fetch failed|Load failed|network/i.test(msg)
          ? "The upload failed before reaching the server. This usually " +
            "means the browser couldn't read one of the files, if you " +
            "picked the .logicx from a file dialog, go back and drag it " +
            "into the box instead (or zip it first). Also make sure the " +
            "project isn't open in Logic while uploading."
          : msg
      );
    } finally {
      if (ticker) clearInterval(ticker);
      setProgress(null);
      setBusy(null);
    }
  }

  async function compress() {
    setBusy("compress");
    setError(null);
    setCompressed(null);
    try {
      const dl = record.downloads.signed_master;
      const blob = await (await fetch(`${API}${dl.url}`)).blob();
      const fd = new FormData();
      fd.append("audio_file", new File([blob], dl.filename, { type: "audio/wav" }));
      const p = PRESETS[preset];
      fd.append("codec", p.codec);
      fd.append("bitrate", p.bitrate);
      fd.append("loudnorm", p.loudnorm);
      fd.append("sample_rate", p.sample_rate);
      fd.append("generations", p.generations);
      const res = await fetch(`${API}/fingerprint/simulate`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
      setCompressed(body);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(null);
    }
  }

  async function linkFile(file) {
    if (!file) return;
    setBusy("link");
    setError(null);
    setLinkResult(null);
    try {
      const fd = new FormData();
      fd.append("audio_file", file);
      const res = await fetch(`${API}/product/link`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
      setLinkResult(body);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(null);
    }
  }

  const so = record?.same_origin;

  return (
    <div className="wz-shell db-shell">
      <div className="wz-top">
        <a className="ld-mark" href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: "var(--text)", fontWeight: 700, fontSize: "0.9rem" }}>
          <Mark />
          <span>Session<b style={{ fontWeight: 800 }}>Seal</b></span>
        </a>
        <div className="links">
          <AuthButton />
        </div>
      </div>

      {!record && (
        <div className="wz-steps" role="list">
          {STEPS.map((s, i) => (
            <span key={s} role="listitem"
              className={`wz-step-pill ${i === step ? "now" : ""} ${i < step ? "done" : ""}`}>
              {i < step ? "✓" : `0${i + 1}`} {s}
            </span>
          ))}
        </div>
      )}

      <main className="wz-main">
        {/* ---------------- step 1: track ---------------- */}
        {!record && step === 0 && (
          <>
            <h1>First, the finished track.</h1>
            <p className="lede">
              Your name and your final bounced master, the exact file you
              plan to release.
            </p>
            <label className="wz-field">
              <span>Track title</span>
              <input type="text" value={title} placeholder="e.g. Belief"
                onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="wz-field">
              <span>Artist name</span>
              <input type="text" value={artist} placeholder="e.g. raj"
                onChange={(e) => setArtist(e.target.value)} />
            </label>
            {pastArtists.filter((a) => a !== artist).length > 0 && (
              <div className="wz-chips">
                <span>Previously:</span>
                {pastArtists.filter((a) => a !== artist).slice(0, 4).map((a) => (
                  <button key={a} type="button" className="wz-chip"
                    onClick={() => setArtist(a)}>{a}</button>
                ))}
              </div>
            )}
            <Drop
              filled={!!master}
              big={master ? `✓ ${master.name}` : "Drop your master here"}
              small={master ? fmtBytes(master.size) : "WAV straight from your bounce, or click to browse"}
              onClick={() => masterInput.current.click()}
              onDrop={(e) => { const [f] = dropFiles(e, false); if (f) pickMaster(f); }}
            />
            <input ref={masterInput} type="file" accept="audio/*" hidden
              onChange={(e) => e.target.files[0] && pickMaster(e.target.files[0])} />
            <div className="wz-tip">
              <b>Tip:</b> in Logic, bounce with <b>File → Bounce → Project or
              Section</b>, PCM/WAVE, and <b>Normalize off</b>.
            </div>
            <div className="wz-navrow">
              <span className="wz-need">
                {canNext ? "" :
                 !master ? "Add your master to continue." :
                 !title.trim() ? "Give the track a title to continue." :
                 "Add your artist name to continue."}
              </span>
              <button className="wz-btn" disabled={!canNext} onClick={() => setStep(1)}>
                Next: your stems →
              </button>
            </div>
          </>
        )}

        {/* ---------------- step 2: stems ---------------- */}
        {!record && step === 1 && (
          <>
            <h1>Now, the layers it&apos;s made of.</h1>
            <p className="lede">
              Your stems, one file per layer, exported with the mix exactly as
              it was when you bounced the master. They&apos;re how we verify
              the track is really yours, and they never leave your record.
            </p>
            <Drop
              filled={stems.length >= 2}
              big={stems.length ? `✓ ${stems.length} stems added` : "Drop your stems here"}
              small="Two or more audio files, or click to browse"
              onClick={() => stemsInput.current.click()}
              onDrop={(e) => { const fs = dropFiles(e, true); if (fs.length) setStems((cur) => [...cur, ...fs]); }}
            />
            <input ref={stemsInput} type="file" accept="audio/*" multiple hidden
              onChange={(e) => setStems((cur) => [...cur, ...Array.from(e.target.files)])} />
            {stems.length > 0 && (
              <ul className="wz-filelist">
                {stems.map((s, i) => (
                  <li key={i}>
                    <span>{s.name}</span>
                    <span className="sz">
                      {fmtBytes(s.size)}{" "}
                      <button className="wz-btn ghost" style={{ padding: "1px 10px", fontSize: "0.72rem", marginLeft: 8 }}
                        onClick={() => setStems(stems.filter((_, j) => j !== i))}>
                        remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="wz-tip">
              <b>Exporting from Logic:</b> File → Export → All Tracks as Audio
              Files (⇧⌘E) · WAVE · <b>Normalize: Off</b> · include audio tail
              and volume/pan automation. Leave your mutes exactly as they were
              for the final mix.
            </div>
            <div className="wz-navrow">
              <button className="wz-btn ghost" onClick={() => setStep(0)}>← Back</button>
              <button className="wz-btn" disabled={!canNext} onClick={() => setStep(2)}>
                Next: your session →
              </button>
            </div>
          </>
        )}

        {/* ---------------- step 3: session ---------------- */}
        {!record && step === 2 && (
          <>
            <h1>Last, the session itself.</h1>
            <p className="lede">
              Your Logic project, exactly as it is, mess, muted tracks, old
              takes and all. The mess is the evidence: it&apos;s what someone
              who only stole your finished song can never fake.
            </p>
            <Drop
              filled={!!project}
              big={project ? `✓ ${project.label}` : "Drag your .logicx here, straight from Finder"}
              small={project
                ? "Session received"
                : "Dragging works best, or click to browse (.zip works from the dialog)"}
              onClick={() => projInput.current.click()}
              onDrop={onProjectDrop}
            />
            <input ref={projInput} type="file" accept=".zip,.logicx" hidden
              onChange={(e) => {
                const f = e.target.files[0];
                e.target.value = "";
                if (!f) return;
                if (!f.name.toLowerCase().endsWith(".zip") || f.size === 0) {
                  setError(
                    "Browsers can't read a Logic project chosen from the file " +
                    "dialog, please drag the .logicx into the box instead " +
                    "(straight from Finder, no zip needed). A .zip of the " +
                    "project also works from the dialog."
                  );
                  return;
                }
                setError(null);
                setProject({ zip: f, label: f.name });
              }} />
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 24 }}>
              No drag available?{" "}
              <button className="wz-btn ghost" style={{ padding: "3px 14px", fontSize: "0.78rem" }}
                onClick={() => folderInput.current.click()}>
                Pick the folder that contains the project
              </button>
              <input ref={folderInput} type="file" webkitdirectory="" multiple hidden
                onChange={(e) => {
                  const all = Array.from(e.target.files || []);
                  e.target.value = "";
                  if (!all.length) return;
                  const relPath = (f) => {
                    const p = f.webkitRelativePath || f.name;
                    const parts = p.split("/");
                    const i = parts.findIndex((s) => s.toLowerCase().endsWith(".logicx"));
                    return i >= 0 ? parts.slice(i).join("/") : p;
                  };
                  // Keep only the .logicx subtree; if several projects live in
                  // the chosen folder, take the one with the most files.
                  const inPkg = all.filter((f) =>
                    (f.webkitRelativePath || "").toLowerCase().includes(".logicx/"));
                  let fs;
                  if (inPkg.length) {
                    const byRoot = {};
                    for (const f of inPkg) {
                      const root = relPath(f).split("/")[0];
                      (byRoot[root] = byRoot[root] || []).push(f);
                    }
                    fs = Object.values(byRoot).sort((a, b) => b.length - a.length)[0];
                  } else if (all.some((f) =>
                      /(^|\/)(projectdata|metadata\.plist)$/i.test(f.webkitRelativePath || f.name))) {
                    fs = all; // the chosen folder IS the project
                  } else {
                    setError(
                      "No Logic project found in that folder. Choose the " +
                      "folder that contains your .logicx (for example your " +
                      "Logic Projects folder), or drag the project in."
                    );
                    return;
                  }
                  const first = relPath(fs[0]);
                  setError(null);
                  setProject({
                    files: fs.map((f) => ({ file: f, path: relPath(f) })),
                    label: `${first.split("/")[0]} (${fs.length} files)`,
                  });
                }} />
            </p>
            <div className="wz-tip">
              <b>Don&apos;t clean anything up.</b> Backups, unused takes, and
              recording dates across days all make your record stronger.
            </div>
            {error && <div className="wz-flag">{error}</div>}
            <div className="wz-navrow">
              <button className="wz-btn ghost" onClick={() => { setError(null); setStep(1); }}>← Back</button>
              <button className="wz-btn" disabled={!canNext} onClick={() => setStep(3)}>
                Review &amp; seal →
              </button>
            </div>
          </>
        )}

        {/* ---------------- step 4: seal ---------------- */}
        {!record && step === 3 && (
          <>
            <h1>Ready to seal.</h1>
            <p className="lede">
              We&apos;ll verify everything belongs together, embed an
              inaudible watermark, take a sound fingerprint, and sign the lot
              into a timestamped record. Takes about a minute.
            </p>
            <div className="wz-review">
              <div className="row"><span className="k">Artist</span><span className="v">{artist}</span></div>
              <div className="row"><span className="k">Master</span><span className="v">{master?.name} · {fmtBytes(master?.size)}</span></div>
              <div className="row"><span className="k">Stems</span><span className="v">{stems.length} files · {fmtBytes(stems.reduce((a, s) => a + s.size, 0))}</span></div>
              <div className="row"><span className="k">Session</span><span className="v">{project?.label}</span></div>
            </div>
            {error && <div className="wz-flag">{error}</div>}
            <div className="wz-navrow">
              <button className="wz-btn ghost" disabled={!!busy} onClick={() => setStep(2)}>← Back</button>
              {authStatus !== "loading" && !session?.user ? (
                <button className="wz-btn seal" onClick={() => signIn("google")}>
                  Sign in with Google to seal
                </button>
              ) : (
                <button className="wz-btn seal" disabled={!!busy || authStatus === "loading"} onClick={seal}>
                  {busy ? "Sealing…" : "Seal my record"}
                </button>
              )}
            </div>
            {busy === "seal" && progress && (
              <div className="wz-busy">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <div className="stage">{progress.stage}…</div>
                  <div className="stage" style={{ fontVariantNumeric: "tabular-nums", color: "var(--accent)" }}>
                    {progress.pct}%
                  </div>
                </div>
                <div className="sub">
                  Verifying and sealing your record, this usually takes about
                  a minute.
                </div>
                <div className="bar">
                  <div style={{ width: `${progress.pct}%`, animation: "none", transition: "width 0.45s ease" }} />
                </div>
              </div>
            )}
          </>
        )}

        {/* ---------------- done ---------------- */}
        {record && (
          <>
            {record.coherence.verified && <Confetti />}
            <div className="wz-sealed">
              <div className="t">Your record is sealed.</div>
              <div className="s">
                {record.created_at_utc} · record{" "}
                <span className="wz-mono">{record.record_id}</span>
              </div>
            </div>

            <ul className="wz-checklist">
              <li>
                <span className={`ic ${record.coherence.verified ? "ok" : "warn"}`}>
                  {record.coherence.verified ? "✓" : "!"}
                </span>
                <span>
                  Your stems rebuild your master,{" "}
                  {(record.coherence.confidence * 100).toFixed(1)}% match
                  {!record.coherence.verified && (
                    <span className="detail">
                      Below the verification bar, the record is sealed, but it
                      says coherence was not verified.
                    </span>
                  )}
                </span>
              </li>
              <li>
                <span className={`ic ${so.band === "strong" ? "ok" : "warn"}`}>
                  {so.band === "strong" ? "✓" : "!"}
                </span>
                <span>
                  Your session checks out, {so.score}/100 ({so.band})
                  <span className="detail">
                    Takes found inside your stems, edit history, recording
                    dates, the things only the real session has.
                  </span>
                </span>
              </li>
              <li>
                <span className="ic ok">✓</span>
                <span>
                  Inaudible watermark embedded
                  <span className="detail">
                    Carries your record ID through streaming compression.
                    Self-check score {record.watermark.self_check_score}.
                  </span>
                </span>
              </li>
              <li>
                <span className="ic ok">✓</span>
                <span>
                  Sound fingerprint saved,{" "}
                  {Math.round(record.fingerprint.seconds)}s analyzed
                </span>
              </li>
              <li>
                <span className="ic ok">✓</span>
                <span>
                  Signed &amp; timestamped, set in stone
                  <span className="detail">
                    Proves you held these exact files, unchanged, together, at
                    this moment. Does not prove {record.does_not_prove}, no
                    honest system can.
                  </span>
                </span>
              </li>
            </ul>

            {so.red_flags.length > 0 && so.red_flags.map((f, i) => (
              <div className="wz-flag" key={i}>{f}</div>
            ))}

            <details style={{ marginBottom: 24 }}>
              <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: "0.86rem" }}>
                Full verification detail
              </summary>
              <table className="coverage" style={{ marginTop: 12 }}>
                <thead><tr><th>check</th><th>result</th><th>detail</th></tr></thead>
                <tbody>
                  {so.checks.map((c, i) => (
                    <tr key={i}>
                      <td>{c.check}</td>
                      <td style={{
                        color: c.result === "match" ? "var(--ok)"
                          : c.result === "contradiction" ? "var(--warn)" : "var(--muted)",
                      }}>{c.result}</td>
                      <td>{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            <div className="wz-panel">
              <h3>1 · Release this file</h3>
              <p className="ph">
                This is your master with the watermark and signature inside,
                the copy to send to your distributor.
              </p>
              <a className="wz-btn" style={{ textDecoration: "none" }}
                href={`${API}${record.downloads.signed_master.url}`}
                download={record.downloads.signed_master.filename}>
                ⬇ Download release master ({fmtBytes(record.downloads.signed_master.size_bytes)})
              </a>
            </div>

            <div className="wz-panel">
              <h3>2 · See it survive streaming</h3>
              <p className="ph">
                Simulate what a platform does to your file, compress it, then
                link the mangled copy right back in step 3.
              </p>
              <div className="preset-row">
                {Object.entries(PRESETS).map(([key, p]) => (
                  <button key={key} className={`preset ${preset === key ? "selected" : ""}`}
                    onClick={() => setPreset(key)}>
                    {p.label}
                  </button>
                ))}
              </div>
              <button className="wz-btn ghost" disabled={!!busy} onClick={compress}>
                {busy === "compress" ? "Compressing…" : `Compress like ${PRESETS[preset].label}`}
              </button>
              {compressed && (
                <p style={{ marginTop: 14, fontSize: "0.9rem" }}>
                  <a className="navlink" href={`${API}${compressed.download.url}`}
                    download={compressed.download.filename}>
                    ⬇ Download the &quot;streamed&quot; copy ({fmtBytes(compressed.download.size_bytes)})
                  </a>
                </p>
              )}
            </div>

            <div className="wz-panel">
              <h3>3 · Link any copy back</h3>
              <p className="ph">
                Drop any version of your track, the streamed copy, a rip,
                anything, and watch it find its way home.
              </p>
              <button className="wz-btn ghost" disabled={!!busy}
                onClick={() => linkInput.current.click()}>
                {busy === "link" ? "Checking…" : "Choose a file to link"}
              </button>
              <input ref={linkInput} type="file" accept="audio/*" hidden
                onChange={(e) => linkFile(e.target.files[0])} />
              {linkResult && (
                <div style={{ marginTop: 16 }}>
                  {linkResult.linked ? (
                    <p style={{ fontSize: "0.95rem" }}>
                      <span className="badge ok">Linked</span>
                      Found its record via{" "}
                      {linkResult.linked_via.startsWith("watermark")
                        ? "the watermark (exact match, corroborated by sound)"
                        : "the sound fingerprint"}, artist{" "}
                      <b>{linkResult.record.artist}</b>, sealed{" "}
                      {linkResult.record.registered_at_utc}.
                    </p>
                  ) : linkResult.copy_attack_suspected ? (
                    <div className="wz-flag">
                      A watermark was found, but the audio doesn&apos;t match
                      that record, this looks like a copied/transplanted
                      watermark, so it was not linked.
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.95rem", color: "var(--muted)" }}>
                      No registered record matched this audio.
                    </p>
                  )}
                  <p className="status-note">
                    watermark: {linkResult.mechanisms.watermark.detected ? "found" : "not found"} ·
                    fingerprint similarity {(linkResult.mechanisms.fingerprint.best_similarity * 100).toFixed(1)}% ·
                    embedded signature: {linkResult.mechanisms.c2pa.manifest_present ? "present" : "stripped (expected after streaming)"}
                  </p>
                </div>
              )}
            </div>

            {error && <div className="wz-flag">{error}</div>}

            <div className="wz-navrow">
              <button className="wz-btn ghost" onClick={() => {
                setRecord(null); setCompressed(null); setLinkResult(null);
                setStep(0); setMaster(null); setStems([]); setProject(null);
              }}>
                Seal another track
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
