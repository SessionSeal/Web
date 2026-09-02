"use client";

import { useRef, useState } from "react";
import { Drop, PageTop, fmtBytes } from "../components";

const API = "/backend";

const PRESETS = {
  spotify: { label: "Spotify", codec: "vorbis", bitrate: "160", loudnorm: "-14", sample_rate: "44100", generations: "1" },
  apple: { label: "Apple Music", codec: "aac", bitrate: "256", loudnorm: "-16", sample_rate: "44100", generations: "1" },
  youtube: { label: "YouTube", codec: "aac", bitrate: "128", loudnorm: "-14", sample_rate: "48000", generations: "1" },
  trash: { label: "Worst case (×5)", codec: "opus", bitrate: "96", loudnorm: "-14", sample_rate: "48000", generations: "5" },
};

export default function Compress() {
  const [file, setFile] = useState(null);
  const [preset, setPreset] = useState("spotify");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const input = useRef(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const p = PRESETS[preset];
      const fd = new FormData();
      fd.append("audio_file", file);
      fd.append("codec", p.codec);
      fd.append("bitrate", p.bitrate);
      fd.append("loudnorm", p.loudnorm);
      fd.append("sample_rate", p.sample_rate);
      fd.append("generations", p.generations);
      const res = await fetch(`${API}/fingerprint/simulate`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
      setResult(body);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wz-shell">
      <PageTop links={[["← Back to site", "/"], ["Verify a copy", "/verify"], ["Open the app", "/app"]]} />
      <main className="wz-main">
        <h1>Hear what streaming does to your track.</h1>
        <p className="lede">
          Upload any audio and run it through a platform&apos;s compression —
          the same codec, loudness, and sample-rate treatment your release
          gets. Download the result and hear it for yourself.
        </p>

        <Drop
          filled={!!file}
          big={file ? `✓ ${file.name}` : "Drop your audio here"}
          small={file ? fmtBytes(file.size) : "Any format — or click to browse"}
          onClick={() => input.current.click()}
          onFiles={(fs) => setFile(fs[0])}
        />
        <input ref={input} type="file" accept="audio/*" hidden
          onChange={(e) => e.target.files[0] && setFile(e.target.files[0])} />

        <div className="preset-row">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button key={key} className={`preset ${preset === key ? "selected" : ""}`}
              onClick={() => setPreset(key)}>
              {p.label}
            </button>
          ))}
        </div>

        <button className="wz-btn" disabled={!file || busy} onClick={run}>
          {busy ? "Compressing…" : `Compress like ${PRESETS[preset].label}`}
        </button>

        {error && <div className="wz-flag" style={{ marginTop: 18 }}>{error}</div>}

        {result && (
          <div className="wz-panel" style={{ marginTop: 24 }}>
            <h3>Done</h3>
            <p className="ph">
              {result.chain.steps.map((s) => s.detail).join(" → ")}
            </p>
            <p style={{ fontSize: "0.9rem", marginBottom: 14 }}>
              Size: {fmtBytes(result.processed.size_bytes)}{" "}
              ({result.processed.size_change_pct}% of the original)
            </p>
            <a className="wz-btn" style={{ textDecoration: "none" }}
              href={`${API}${result.download.url}`}
              download={result.download.filename}>
              ⬇ Download the compressed copy ({fmtBytes(result.download.size_bytes)})
            </a>
          </div>
        )}

        <div className="wz-tip" style={{ marginTop: 26 }}>
          <b>Sealed your track already?</b> Compress the release master here,
          then <a className="navlink" href="/verify">verify the compressed
          copy</a> — it will still trace back to your record.
        </div>
      </main>
    </div>
  );
}
