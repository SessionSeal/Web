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

function fmtBytes(n) {
  if (n == null) return "—";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function ErrorStrip({ errors }) {
  if (!errors || errors.length === 0) return null;
  return (
    <div className="fp-strip" style={{ marginTop: 8 }}>
      {errors.map((e, i) => {
        const t = Math.min(e * 2, 1);
        return <div key={i} style={{ background: `hsl(${140 * (1 - t)}, 65%, 42%)` }} />;
      })}
    </div>
  );
}

function VerdictBadge({ verdict }) {
  const ok = verdict === "both recovered";
  const partial = verdict === "fingerprint only" || verdict === "watermark only";
  return (
    <span
      className={`badge ${ok ? "ok" : "warn"}`}
      style={partial ? { background: "rgba(154,103,0,0.12)", color: "var(--amber)" } : {}}
    >
      {verdict.toUpperCase()}
    </span>
  );
}

function RecoveryPanels({ wm, fp, expectedId }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginTop: 14 }}>
      <div className="media-row" style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 8 }}>
          Watermark{" "}
          <span className={`badge ${wm.recovered ? "ok" : "warn"}`}>
            {wm.recovered ? "recovered" : "lost"}
          </span>
        </h3>
        <dl className="kv">
          <div><dt>extracted ID</dt><dd style={{ fontFamily: "ui-monospace, monospace" }}>{wm.extracted_id || "—"}</dd></div>
          {expectedId && <div><dt>expected ID</dt><dd style={{ fontFamily: "ui-monospace, monospace" }}>{expectedId}</dd></div>}
          <div><dt>confidence</dt><dd>{wm.confidence ?? "—"}{wm.blocks_analyzed ? ` (${wm.blocks_crc_valid}/${wm.blocks_analyzed} blocks)` : ""}</dd></div>
          {wm.source && <div><dt>via</dt><dd>{wm.source}</dd></div>}
        </dl>
      </div>
      <div className="media-row" style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 8 }}>
          Fingerprint{" "}
          <span className={`badge ${fp.recovered ? "ok" : "warn"}`}>
            {fp.recovered ? "re-linked" : "below threshold"}
          </span>
        </h3>
        <dl className="kv">
          <div><dt>similarity</dt><dd>{(fp.similarity * 100).toFixed(2)}%</dd></div>
          <div><dt>threshold</dt><dd>{(fp.threshold * 100).toFixed(0)}%</dd></div>
        </dl>
        <ErrorStrip errors={fp.frame_errors} />
      </div>
    </div>
  );
}

export default function WaterprintLab() {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [opts, setOpts] = useState(PRESETS.spotify);
  const [preset, setPreset] = useState("spotify");
  const [run, setRun] = useState(null);
  const [checkResult, setCheckResult] = useState(null);

  function applyPreset(key) {
    setPreset(key);
    setOpts({ ...PRESETS[key] });
  }

  function setOpt(k, v) {
    setPreset(null);
    setOpts((o) => ({ ...o, [k]: v }));
  }

  async function post(endpoint, fd, busyKey) {
    setBusy(busyKey);
    setError(null);
    try {
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

  async function runPipeline(e) {
    e.preventDefault();
    setRun(null);
    setCheckResult(null);
    const fd = new FormData(e.target);
    for (const [k, v] of Object.entries(opts)) {
      if (k !== "label") fd.append(k, v);
    }
    const body = await post("/waterprint/run", fd, "run");
    if (body) setRun(body);
  }

  async function check(e) {
    e.preventDefault();
    setCheckResult(null);
    const fd = new FormData(e.target);
    fd.append("run_id", run.run_id);
    const body = await post("/waterprint/check", fd, "check");
    if (body) setCheckResult(body);
  }

  return (
    <main>
      <p>
        <a className="navlink" href="/app">← app</a>
        {"  ·  "}
        <a className="navlink" href="/fingerprint">fingerprint lab</a>
        {"  ·  "}
        <a className="navlink" href="/watermark">watermark lab</a>
        {"  ·  "}
        <a className="navlink" href="/logic">logic inspector</a>
      </p>
      <h1>Waterprint lab</h1>
      <p className="subtitle">
        Both protections on one file: embed a watermark ID, register the
        fingerprint, run platform compression, then recover both from the
        damaged copy. The watermark carries an exact ID; the fingerprint
        recognizes the sound — each covers the other&apos;s blind spots.
      </p>

      <section className="card">
        <h2>1. Run the pipeline</h2>
        <p className="hint">
          embed watermark → fingerprint the watermarked master → compress →
          extract watermark + match fingerprint from the compressed copy.
          Audio must be ≥ 10 s (try <code>sample-files/master.wav</code>).
        </p>
        <form onSubmit={runPipeline}>
          <label className="field">
            <span>Waterprint ID (any UUID)</span>
            <input
              type="text"
              name="waterprint_id"
              defaultValue="5b45e545-767f-4199-9473-916e46eebc41"
              style={{ fontFamily: "ui-monospace, monospace", maxWidth: 420 }}
              required
            />
          </label>
          <label className="field">
            <span>Audio file (any format)</span>
            <input type="file" name="audio_file" accept="audio/*" required />
          </label>
          <div className="preset-row">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button type="button" key={key} className={`preset ${preset === key ? "selected" : ""}`} onClick={() => applyPreset(key)}>
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
                <option value="none">none</option>
              </select>
            </label>
            <label className="field">
              <span>Bitrate</span>
              <select value={opts.bitrate} onChange={(e) => setOpt("bitrate", e.target.value)} disabled={opts.codec === "none"}>
                {["96", "128", "160", "192", "256", "320"].map((b) => <option key={b} value={b}>{b} kbps</option>)}
              </select>
            </label>
            <label className="field">
              <span>Loudness normalization</span>
              <select value={opts.loudnorm} onChange={(e) => setOpt("loudnorm", e.target.value)}>
                <option value="none">off</option>
                <option value="-11">−11 LUFS</option>
                <option value="-14">−14 LUFS</option>
                <option value="-16">−16 LUFS</option>
                <option value="-23">−23 LUFS</option>
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
              <span>Encode passes</span>
              <select value={opts.generations} onChange={(e) => setOpt("generations", e.target.value)} disabled={opts.codec === "none"}>
                <option value="1">1 — single encode</option>
                <option value="2">2 — rip &amp; re-upload</option>
                <option value="3">3</option>
                <option value="5">5 — trash</option>
                <option value="10">10 — deep-fried</option>
              </select>
            </label>
          </div>
          <button className="primary" disabled={!!busy}>
            {busy === "run" ? "Embedding, fingerprinting, compressing, recovering…" : "Run waterprint pipeline"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      {run && (
        <section className="card">
          <h2>Result</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <VerdictBadge verdict={run.recovery.verdict} />
            <span className="hint" style={{ margin: 0 }}>
              after: {run.chain.steps.map((s) => s.detail).join(" → ")}
            </span>
          </div>
          <RecoveryPanels wm={run.recovery.watermark} fp={run.recovery.fingerprint} expectedId={run.id} />
          <dl className="kv" style={{ marginTop: 14 }}>
            <div><dt>registered</dt><dd>{run.registered.watermark_blocks} watermark block(s) · {run.registered.fingerprint_frames} fingerprint frames over {run.registered.fingerprint_seconds}s</dd></div>
            <div><dt>run_id</dt><dd style={{ fontFamily: "ui-monospace, monospace" }}>{run.run_id}</dd></div>
          </dl>
          <p style={{ marginTop: 8 }}>
            <a className="navlink" href={`${API}${run.registered.download.url}`} download={run.registered.download.filename}>
              ⬇ Waterprinted WAV ({fmtBytes(run.registered.download.size_bytes)})
            </a>
            {"   ·   "}
            <a className="navlink" href={`${API}${run.processed.download.url}`} download={run.processed.download.filename}>
              ⬇ Compressed copy ({fmtBytes(run.processed.download.size_bytes)})
            </a>
          </p>
        </section>
      )}

      {run && (
        <section className="card">
          <h2>2. Check any copy against this run</h2>
          <p className="hint">
            Upload anything — the compressed copy, a re-encode of it, a totally
            different song — and it&apos;s tested against this run&apos;s
            registered fingerprint and expected ID.
          </p>
          <form onSubmit={check}>
            <label className="field">
              <span>Audio file (any format)</span>
              <input type="file" name="audio_file" accept="audio/*" required />
            </label>
            <button className="primary" disabled={!!busy}>
              {busy === "check" ? "Checking both…" : "Check both"}
            </button>
          </form>
          {checkResult && (
            <div className="result">
              <VerdictBadge verdict={checkResult.verdict} />
              <RecoveryPanels wm={checkResult.watermark} fp={checkResult.fingerprint} expectedId={checkResult.expected_id} />
            </div>
          )}
        </section>
      )}
    </main>
  );
}
