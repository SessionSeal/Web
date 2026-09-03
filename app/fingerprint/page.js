"use client";

import { useState } from "react";

const API = "/backend";

const PRESETS = {
  spotify: { label: "Spotify", codec: "vorbis", bitrate: "160", loudnorm: "-14", sample_rate: "44100", generations: "1" },
  spotify_hq: { label: "Spotify Premium", codec: "vorbis", bitrate: "320", loudnorm: "-14", sample_rate: "44100", generations: "1" },
  apple: { label: "Apple Music", codec: "aac", bitrate: "256", loudnorm: "-16", sample_rate: "44100", generations: "1" },
  youtube: { label: "YouTube", codec: "aac", bitrate: "128", loudnorm: "-14", sample_rate: "48000", generations: "1" },
  worst: { label: "Worst case", codec: "opus", bitrate: "96", loudnorm: "-14", sample_rate: "48000", generations: "2" },
  trash: { label: "Trash (×5)", codec: "opus", bitrate: "96", loudnorm: "-14", sample_rate: "48000", generations: "5" },
};

const DEFAULT_OPTS = PRESETS.spotify;

function fmtBytes(n) {
  if (n == null) return "—";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function LoudnessRow({ label, l }) {
  if (!l) return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {l.integrated_lufs ?? "—"} LUFS integrated · true peak {l.true_peak_dbtp ?? "—"} dBTP
        · LRA {l.loudness_range_lu ?? "—"} LU
      </dd>
    </div>
  );
}

function FingerprintCard({ title, info }) {
  if (!info) return null;
  return (
    <div className="result">
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <dl className="kv">
        {info.filename && <div><dt>file</dt><dd>{info.filename} ({fmtBytes(info.size_bytes)})</dd></div>}
        {!info.filename && <div><dt>size</dt><dd>{fmtBytes(info.size_bytes)}{info.size_change_pct != null ? ` (${info.size_change_pct}% vs original)` : ""}</dd></div>}
        <div>
          <dt>format</dt>
          <dd>
            {info.format?.codec} · {info.format?.sample_rate} Hz · {info.format?.channels}ch
            {info.format?.duration_seconds ? ` · ${info.format.duration_seconds}s` : ""}
            {info.format?.bit_rate ? ` · ${Math.round(info.format.bit_rate / 1000)} kbps` : ""}
          </dd>
        </div>
        <LoudnessRow label="loudness" l={info.loudness} />
        <div>
          <dt>fingerprint</dt>
          <dd>
            chromaprint · {info.fingerprint?.frames} frames over {info.fingerprint?.analyzed_seconds}s
          </dd>
        </div>
        {info.sha256 && <div><dt>sha256</dt><dd>{info.sha256}</dd></div>}
      </dl>
      <details>
        <summary className="hint" style={{ cursor: "pointer" }}>compressed fingerprint string</summary>
        <pre className="json" style={{ maxHeight: 120 }}>{info.fingerprint?.compressed}</pre>
      </details>
    </div>
  );
}

function ErrorStrip({ errors }) {
  if (!errors || errors.length === 0) return null;
  return (
    <div>
      <p className="hint" style={{ margin: "12px 0 6px" }}>
        per-frame bit error across the track (green = identical, red = diverged):
      </p>
      <div className="fp-strip">
        {errors.map((e, i) => {
          const t = Math.min(e * 2, 1); // typical errors live in 0..0.5
          return <div key={i} style={{ background: `hsl(${140 * (1 - t)}, 65%, 42%)` }} title={`frame bucket ${i}: ${(e * 100).toFixed(1)}% bits differ`} />;
        })}
      </div>
    </div>
  );
}

export default function FingerprintLab() {
  const [file, setFile] = useState(null);
  const [opts, setOpts] = useState(DEFAULT_OPTS);
  const [preset, setPreset] = useState("spotify");
  const [busy, setBusy] = useState(null); // "analyze" | "simulate" | null
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [result, setResult] = useState(null);

  function applyPreset(key) {
    setPreset(key);
    setOpts({ ...PRESETS[key] });
  }

  function setOpt(k, v) {
    setPreset(null);
    setOpts((o) => ({ ...o, [k]: v }));
  }

  async function call(endpoint, extra, busyKey) {
    if (!file) {
      setError("Choose an audio file first.");
      return null;
    }
    setBusy(busyKey);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("audio_file", file);
      for (const [k, v] of Object.entries(extra)) fd.append(k, String(v));
      const res = await fetch(`${API}${endpoint}`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
      return body;
    } catch (err) {
      setError(String(err.message || err));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function analyze() {
    setAnalysis(null);
    const body = await call("/fingerprint/analyze", {}, "analyze");
    if (body) setAnalysis(body);
  }

  async function simulateChain() {
    setResult(null);
    const body = await call(
      "/fingerprint/simulate",
      {
        codec: opts.codec,
        bitrate: opts.bitrate,
        loudnorm: opts.loudnorm,
        sample_rate: opts.sample_rate,
        generations: opts.generations,
      },
      "simulate"
    );
    if (body) {
      setResult(body);
      setAnalysis(body.original);
    }
  }

  const cmp = result?.comparison;

  return (
    <main>
      <p>
        <a className="navlink" href="/">← app</a>
        {"  ·  "}
        <a className="navlink" href="/logic">logic inspector</a>
      </p>
      <h1>Fingerprint lab</h1>
      <p className="subtitle">
        Fingerprint a track, then run it through the processing a streaming
        platform applies — lossy encoding, loudness normalization, resampling —
        and see how well the perceptual fingerprint survives.
      </p>

      <section className="card">
        <h2>1. Audio</h2>
        <label className="field">
          <span>Audio file (any format — e.g. <code>sample-files/master.wav</code>)</span>
          <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files[0] || null)} />
        </label>
        <button className="primary" disabled={!!busy} onClick={analyze}>
          {busy === "analyze" ? "Fingerprinting…" : "Fingerprint it"}
        </button>
        {analysis && !result && <FingerprintCard title="Original" info={analysis} />}
      </section>

      <section className="card">
        <h2>2. Platform processing chain</h2>
        <p className="hint">
          Pick a preset or combine steps manually. Loudness targets: −14 LUFS
          (Spotify/YouTube/Tidal), −16 (Apple Music), −11 (Spotify “loud”), −23
          (EBU broadcast). Note: some platforms apply loudness as playback gain
          rather than re-rendering — rendering it here is the harsher test.
        </p>
        <div className="preset-row">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              className={`preset ${preset === key ? "selected" : ""}`}
              onClick={() => applyPreset(key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="controls-grid">
          <label className="field">
            <span>Codec</span>
            <select value={opts.codec} onChange={(e) => setOpt("codec", e.target.value)}>
              <option value="vorbis">Ogg Vorbis (Spotify)</option>
              <option value="aac">AAC (Apple/YouTube)</option>
              <option value="mp3">MP3</option>
              <option value="opus">Opus</option>
              <option value="none">none (no lossy encode)</option>
            </select>
          </label>
          <label className="field">
            <span>Bitrate</span>
            <select value={opts.bitrate} onChange={(e) => setOpt("bitrate", e.target.value)} disabled={opts.codec === "none"}>
              {["96", "128", "160", "192", "256", "320"].map((b) => (
                <option key={b} value={b}>{b} kbps</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Loudness normalization</span>
            <select value={opts.loudnorm} onChange={(e) => setOpt("loudnorm", e.target.value)}>
              <option value="none">off</option>
              <option value="-11">−11 LUFS (Spotify loud)</option>
              <option value="-14">−14 LUFS (Spotify/YouTube)</option>
              <option value="-16">−16 LUFS (Apple Music)</option>
              <option value="-23">−23 LUFS (EBU broadcast)</option>
            </select>
          </label>
          <label className="field">
            <span>Sample rate</span>
            <select value={opts.sample_rate} onChange={(e) => setOpt("sample_rate", e.target.value)}>
              <option value="keep">keep original</option>
              <option value="44100">44100 Hz</option>
              <option value="48000">48000 Hz</option>
            </select>
          </label>
          <label className="field">
            <span>Encode passes (generation loss)</span>
            <select value={opts.generations} onChange={(e) => setOpt("generations", e.target.value)} disabled={opts.codec === "none"}>
              <option value="1">1 — single encode</option>
              <option value="2">2 — rip &amp; re-upload</option>
              <option value="3">3</option>
              <option value="5">5 — trash</option>
              <option value="10">10 — deep-fried</option>
            </select>
          </label>
        </div>
        <button className="primary" disabled={!!busy} onClick={simulateChain}>
          {busy === "simulate" ? "Applying chain and comparing…" : "Apply chain & compare fingerprints"}
        </button>
        {error && <p className="error">{error}</p>}
      </section>

      {result && (
        <>
          <section className="card">
            <h2>Result</h2>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
              <span className="bignum">{(cmp.similarity * 100).toFixed(2)}%</span>
              <span className={`badge ${cmp.would_relink ? "ok" : "warn"}`}>
                {cmp.would_relink ? "survives — would re-link" : "LOST — below re-link threshold"}
                {` (threshold ${(cmp.verify_threshold * 100).toFixed(0)}%)`}
              </span>
            </div>
            <p className="status-note">
              fingerprint similarity between original and processed audio ·
              alignment offset {cmp.offset_frames} frames · {cmp.frames_compared} frames compared
            </p>
            <ErrorStrip errors={cmp.frame_errors} />
            {result.download && (
              <p style={{ marginTop: 14 }}>
                <a
                  className="navlink"
                  href={`${API}${result.download.url}`}
                  download={result.download.filename}
                >
                  ⬇ Download the processed audio ({fmtBytes(result.download.size_bytes)},{" "}
                  {result.download.filename})
                </a>
              </p>
            )}
            <div style={{ marginTop: 10 }}>
              <h3 style={{ margin: "14px 0 6px" }}>Chain applied</h3>
              <ul style={{ marginLeft: 20 }}>
                {result.chain.steps.map((s, i) => (
                  <li key={i} className="hint" style={{ marginBottom: 2 }}>
                    <strong style={{ color: "var(--text)" }}>{s.step}</strong>: {s.detail}
                  </li>
                ))}
              </ul>
              <details>
                <summary className="hint" style={{ cursor: "pointer" }}>ffmpeg commands</summary>
                <pre className="json">{result.chain.ffmpeg_commands.join("\n\n")}</pre>
              </details>
            </div>
          </section>
          <section className="card">
            <h2>Before / after</h2>
            <FingerprintCard title="Original" info={result.original} />
            <FingerprintCard title="Processed" info={result.processed} />
          </section>
        </>
      )}
    </main>
  );
}
