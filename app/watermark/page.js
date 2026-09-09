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
  if (n == null) return "-";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function WatermarkLab() {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  // embed state
  const [wmInfo, setWmInfo] = useState(null);

  // chain state
  const [opts, setOpts] = useState(PRESETS.spotify);
  const [preset, setPreset] = useState("spotify");
  const [chainResult, setChainResult] = useState(null);

  // check state
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

  async function embed(e) {
    e.preventDefault();
    setWmInfo(null);
    setChainResult(null);
    const fd = new FormData(e.target);
    const body = await post("/watermark/embed", fd, "embed");
    if (body) setWmInfo(body);
  }

  async function runChain() {
    if (!wmInfo) return;
    setChainResult(null);
    setBusy("chain");
    setError(null);
    try {
      // fetch the watermarked WAV back and push it through the platform chain
      const blob = await (await fetch(`${API}${wmInfo.download.url}`)).blob();
      const fd = new FormData();
      fd.append("audio_file", new File([blob], wmInfo.download.filename, { type: "audio/wav" }));
      fd.append("codec", opts.codec);
      fd.append("bitrate", opts.bitrate);
      fd.append("loudnorm", opts.loudnorm);
      fd.append("sample_rate", opts.sample_rate);
      fd.append("generations", opts.generations);
      const res = await fetch(`${API}/fingerprint/simulate`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
      setChainResult(body);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(null);
    }
  }

  async function check(e) {
    e.preventDefault();
    setCheckResult(null);
    const fd = new FormData(e.target);
    const body = await post("/watermark/extract", fd, "check");
    if (body) setCheckResult(body);
  }

  return (
    <main>
      <p>
        <a className="navlink" href="/">← app</a>
        {"  ·  "}
        <a className="navlink" href="/fingerprint">fingerprint lab</a>
        {"  ·  "}
        <a className="navlink" href="/logic">logic inspector</a>
      </p>
      <h1>Watermark lab</h1>
      <p className="subtitle">
        Embed a UUID into audio as an inaudible time-spread echo watermark
        (repeated every 10 seconds), survive platform processing, and
        blind-extract it back out of any copy.
      </p>
      <p className="disclaimer">
        Robust to lossy codecs, loudness normalization, and resampling (verified
        against every preset below, including five encode generations). Destroyed
        by time-stretching or pitch-shifting. Detection requires the platform&apos;s
        PN key, this is an experiment in robustness, not a security guarantee.
      </p>

      <section className="card">
        <h2>1. Embed a watermark</h2>
        <p className="hint">
          The audio must be at least 10 seconds long, one full ID frame is
          embedded per 10-second block. Try <code>sample-files/master.wav</code>.
        </p>
        <form onSubmit={embed}>
          <label className="field">
            <span>Watermark ID (any UUID)</span>
            <input
              type="text"
              name="watermark_id"
              defaultValue="5b45e545-767f-4199-9473-916e46eebc41"
              style={{ fontFamily: "ui-monospace, monospace", maxWidth: 420 }}
              required
            />
          </label>
          <label className="field">
            <span>Audio file (any format)</span>
            <input type="file" name="audio_file" accept="audio/*" required />
          </label>
          <button className="primary" disabled={!!busy}>
            {busy === "embed" ? "Embedding…" : "Embed watermark"}
          </button>
        </form>
        {wmInfo && (
          <div className="result">
            <span className={`badge ${wmInfo.self_check.id_matches ? "ok" : "warn"}`}>
              {wmInfo.self_check.id_matches
                ? "embedded, self-check extraction matches"
                : "embedded, but self-check failed"}
            </span>
            <dl className="kv" style={{ marginTop: 10 }}>
              <div><dt>id</dt><dd style={{ fontFamily: "ui-monospace, monospace" }}>{wmInfo.id}</dd></div>
              <div><dt>blocks embedded</dt><dd>{wmInfo.blocks_embedded} (one per 10 s of audio)</dd></div>
              <div><dt>duration</dt><dd>{wmInfo.duration_seconds}s</dd></div>
            </dl>
            <p>
              <a className="navlink" href={`${API}${wmInfo.download.url}`} download={wmInfo.download.filename}>
                ⬇ Download watermarked WAV ({fmtBytes(wmInfo.download.size_bytes)})
              </a>
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <h2>2. Compress the watermarked audio</h2>
        <p className="hint">
          {wmInfo
            ? "Run the watermarked file through a platform chain, then download the result and check it in section 3."
            : "Embed a watermark first, this section processes that watermarked file."}
        </p>
        <div className="preset-row">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button key={key} className={`preset ${preset === key ? "selected" : ""}`} onClick={() => applyPreset(key)}>
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
            <span>Encode passes</span>
            <select value={opts.generations} onChange={(e) => setOpt("generations", e.target.value)} disabled={opts.codec === "none"}>
              <option value="1">1, single encode</option>
              <option value="2">2, rip &amp; re-upload</option>
              <option value="3">3</option>
              <option value="5">5, trash</option>
              <option value="10">10, deep-fried</option>
            </select>
          </label>
        </div>
        <button className="primary" disabled={!wmInfo || !!busy} onClick={runChain}>
          {busy === "chain" ? "Compressing…" : "Compress watermarked audio"}
        </button>
        {chainResult && (
          <div className="result">
            <dl className="kv">
              <div>
                <dt>chain</dt>
                <dd>{chainResult.chain.steps.map((s) => s.detail).join(" → ")}</dd>
              </div>
              <div>
                <dt>fingerprint similarity</dt>
                <dd>{(chainResult.comparison.similarity * 100).toFixed(2)}% (for comparison with the watermark result)</dd>
              </div>
              <div>
                <dt>size</dt>
                <dd>{fmtBytes(chainResult.processed.size_bytes)} ({chainResult.processed.size_change_pct}%)</dd>
              </div>
            </dl>
            <p>
              <a className="navlink" href={`${API}${chainResult.download.url}`} download={chainResult.download.filename}>
                ⬇ Download compressed audio ({fmtBytes(chainResult.download.size_bytes)}, {chainResult.download.filename})
              </a>
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <h2>3. Check for a watermark</h2>
        <p className="hint">
          Upload any audio in any format, the compressed file from section 2, a
          re-encode of it, anything. Extraction is blind: no original needed.
        </p>
        <form onSubmit={check}>
          <label className="field">
            <span>Audio file</span>
            <input type="file" name="audio_file" accept="audio/*" required />
          </label>
          <button className="primary" disabled={!!busy}>
            {busy === "check" ? "Analyzing echoes…" : "Extract watermark"}
          </button>
        </form>
        {checkResult && (
          <div className="result">
            {checkResult.found ? (
              <>
                <span className="badge ok">watermark found</span>
                <div className="bignum" style={{ fontFamily: "ui-monospace, monospace", fontSize: "1.4rem", margin: "10px 0" }}>
                  {checkResult.id}
                </div>
                <dl className="kv">
                  <div><dt>confidence</dt><dd>{checkResult.confidence} ({checkResult.blocks_crc_valid} of {checkResult.blocks_analyzed} blocks CRC-valid)</dd></div>
                  <div><dt>recovered via</dt><dd>{checkResult.source}</dd></div>
                  <div><dt>alignment offset</dt><dd>{checkResult.start_offset_samples} samples (codec padding)</dd></div>
                </dl>
              </>
            ) : (
              <>
                <span className="badge warn">no watermark found</span>
                {checkResult.reason && <p className="status-note">{checkResult.reason}</p>}
              </>
            )}
            {checkResult.blocks?.length > 0 && (
              <details style={{ marginTop: 10 }}>
                <summary className="hint" style={{ cursor: "pointer" }}>per-block detail</summary>
                <table className="coverage" style={{ marginTop: 8 }}>
                  <thead>
                    <tr><th>block</th><th>CRC valid</th><th>chase flips</th><th>sync bits</th><th>echo strength</th></tr>
                  </thead>
                  <tbody>
                    {checkResult.blocks.map((b) => (
                      <tr key={b.block}>
                        <td>{b.block}</td>
                        <td>{String(b.crc_valid)}</td>
                        <td>{b.chase_flips_used}</td>
                        <td>{b.sync_bits_matched}/16</td>
                        <td>{b.mean_echo_strength}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
