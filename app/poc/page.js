"use client";

import { useState } from "react";

const API = "/backend";

const PRESETS = {
  spotify: { label: "Spotify", codec: "vorbis", bitrate: "160", loudnorm: "-14", sample_rate: "44100", generations: "1" },
  apple: { label: "Apple Music", codec: "aac", bitrate: "256", loudnorm: "-16", sample_rate: "44100", generations: "1" },
  youtube: { label: "YouTube", codec: "aac", bitrate: "128", loudnorm: "-14", sample_rate: "48000", generations: "1" },
  trash: { label: "Trash (×5)", codec: "opus", bitrate: "96", loudnorm: "-14", sample_rate: "48000", generations: "5" },
};

function fmtBytes(n) {
  if (n == null) return "—";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
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

function Badge({ ok, warn, children }) {
  return (
    <span className={`badge ${ok ? "ok" : "warn"}`}
      style={warn ? { background: "rgba(154,103,0,0.12)", color: "var(--amber)" } : {}}>
      {children}
    </span>
  );
}

export default function Product() {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);
  const [dropped, setDropped] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [opts, setOpts] = useState(PRESETS.spotify);
  const [preset, setPreset] = useState("spotify");
  const [compressed, setCompressed] = useState(null);
  const [linkResult, setLinkResult] = useState(null);

  async function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
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
    if (collected.length) {
      setDropped({ files: collected, label: `${collected[0].path.split("/")[0]} (${collected.length} files)` });
    }
  }

  async function register(e) {
    e.preventDefault();
    setBusy("register");
    setError(null);
    setRecord(null);
    setCompressed(null);
    try {
      const fd = new FormData();
      fd.append("artist", e.target.artist.value);
      fd.append("master", e.target.master.files[0]);
      for (const s of e.target.stems.files) fd.append("stems", s);
      const zip = e.target.project.files[0];
      const folder = Array.from(e.target.folder.files || []);
      if (dropped) {
        if (dropped.files.length === 1 && dropped.files[0].path.toLowerCase().endsWith(".zip")) {
          fd.append("project", dropped.files[0].file);
        } else {
          for (const { file, path } of dropped.files) {
            fd.append("project_files", file);
            fd.append("project_paths", path);
          }
        }
      } else if (folder.length > 0) {
        for (const f of folder) {
          fd.append("project_files", f);
          fd.append("project_paths", f.webkitRelativePath || f.name);
        }
      } else if (zip) {
        fd.append("project", zip);
      } else {
        throw new Error("Provide the .logicx project: drag it in, pick the folder, or upload a zip.");
      }
      const res = await fetch(`${API}/product/register`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
      setRecord(body);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(null);
    }
  }

  async function compress() {
    if (!record) return;
    setBusy("compress");
    setError(null);
    setCompressed(null);
    try {
      const dl = record.downloads.signed_master;
      const blob = await (await fetch(`${API}${dl.url}`)).blob();
      const fd = new FormData();
      fd.append("audio_file", new File([blob], dl.filename, { type: "audio/wav" }));
      fd.append("codec", opts.codec);
      fd.append("bitrate", opts.bitrate);
      fd.append("loudnorm", opts.loudnorm);
      fd.append("sample_rate", opts.sample_rate);
      fd.append("generations", opts.generations);
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

  async function linkCheck(e) {
    e.preventDefault();
    setBusy("link");
    setError(null);
    setLinkResult(null);
    try {
      const fd = new FormData(e.target);
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
    <main>
      <h1>MotherTape — POC console</h1>
      <p className="subtitle">
        Register a track — stems, master, and Logic project — and get a
        tamper-evident, timestamped, signed record with three independent ways
        to link any future copy back to it.
      </p>
      <p style={{ marginBottom: 8 }}>
        <a className="navlink" href="/">← home</a>
        {"  ·  "}
        <a className="navlink" href="/stem-master-checker">stem↔master checker</a>
        {"  ·  "}
        <a className="navlink" href="/logic-master-checker">logic↔master checker</a>
        {"  ·  "}
        <a className="navlink" href="/logic">logic inspector</a>
        {"  ·  "}
        <a className="navlink" href="/fingerprint">fingerprint lab</a>
        {"  ·  "}
        <a className="navlink" href="/watermark">watermark lab</a>
        {"  ·  "}
        <a className="navlink" href="/waterprint">waterprint lab</a>
      </p>
      <p className="disclaimer">
        Records prove <strong>custody, integrity, coherence, and priority</strong> —
        never authorship. Signing uses a self-attested development certificate
        (no trust list); every record and verifier will say so.
      </p>

      <section className="card">
        <h2>1. Register a track</h2>
        <p className="hint">
          Everything is verified before sealing: stems must reconstruct the
          master (coherence), and the project is cross-matched against both
          (same-origin). Then the master is watermarked (audiowmark, payload =
          record id), fingerprinted, and C2PA-signed. Samples:{" "}
          <code>master.wav</code> + <code>stem_*.wav</code> +{" "}
          <code>ProductTest.logicx.zip</code> in <code>sample-files/</code>.
        </p>
        <form onSubmit={register}>
          <label className="field">
            <span>Artist ID (any string — no accounts in the POC)</span>
            <input type="text" name="artist" defaultValue="demo-artist" required />
          </label>
          <label className="field">
            <span>Master (bounced WAV)</span>
            <input type="file" name="master" accept="audio/*" required />
          </label>
          <label className="field">
            <span>Stems (2 or more)</span>
            <input type="file" name="stems" accept="audio/*" multiple required />
          </label>
          <div
            className={`dropzone ${dragOver ? "active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            {dropped ? `✓ ${dropped.label}` : "Drop the .logicx package (or a .zip of it) here"}
          </div>
          <label className="field">
            <span>…or pick the project folder / a zip (picking the .logicx itself in a
              file dialog will NOT work — packages are unreadable that way; drag it instead)</span>
            <input type="file" name="folder" webkitdirectory="" multiple style={{ marginBottom: 6 }} />
            <input type="file" name="project" accept=".zip" />
          </label>
          <button className="primary" disabled={!!busy}>
            {busy === "register"
              ? "Verifying, watermarking, fingerprinting, signing…"
              : "Verify & register"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      {record && (
        <section className="card">
          <h2>Record sealed</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <Badge ok={record.coherence.verified}>
              coherence {(record.coherence.confidence * 100).toFixed(1)}%
            </Badge>
            <Badge ok={so.band === "strong"} warn={so.band === "moderate"}>
              same-origin {so.score}% ({so.band})
            </Badge>
            <Badge ok>watermarked</Badge>
            <Badge ok>fingerprinted</Badge>
            <Badge ok>C2PA-signed</Badge>
            <Badge warn>self-attested signer</Badge>
          </div>
          <dl className="kv">
            <div><dt>record_id</dt><dd style={{ fontFamily: "ui-monospace, monospace" }}>{record.record_id}</dd></div>
            <div><dt>artist</dt><dd>{record.artist}</dd></div>
            <div><dt>sealed at (UTC)</dt><dd>{record.created_at_utc}</dd></div>
            <div><dt>watermark</dt><dd>audiowmark, payload = record id, self-check score {record.watermark.self_check_score}</dd></div>
            <div><dt>fingerprint</dt><dd>chromaprint, {record.fingerprint.frames} frames / {record.fingerprint.seconds}s</dd></div>
            <div><dt>C2PA</dt><dd>{record.c2pa.cert_subject}</dd></div>
            <div><dt>logicx binding</dt><dd>{record.c2pa.logicx_hard_binding}</dd></div>
            <div><dt>proves</dt><dd>{record.proves}</dd></div>
            <div><dt>does not prove</dt><dd>{record.does_not_prove}</dd></div>
          </dl>
          {so.red_flags.length > 0 && (
            <ul style={{ margin: "8px 0 0 20px" }}>
              {so.red_flags.map((f, i) => <li key={i} className="error">{f}</li>)}
            </ul>
          )}
          <details style={{ marginTop: 10 }}>
            <summary className="hint" style={{ cursor: "pointer" }}>same-origin check detail</summary>
            <table className="coverage" style={{ marginTop: 8 }}>
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
          <p style={{ marginTop: 12 }}>
            <a className="navlink"
              href={`${API}${record.downloads.signed_master.url}`}
              download={record.downloads.signed_master.filename}>
              ⬇ Download the release master (watermarked + C2PA-signed WAV,{" "}
              {fmtBytes(record.downloads.signed_master.size_bytes)})
            </a>
          </p>
          <p className="status-note">{record.c2pa.trust_note}</p>
        </section>
      )}

      {record && (
        <section className="card">
          <h2>2. Distribute (simulate platform compression)</h2>
          <p className="hint">
            Run the sealed release master through a platform chain — this
            strips the embedded C2PA manifest, which is exactly why the record
            also carries a watermark and fingerprint.
          </p>
          <div className="preset-row">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button key={key} className={`preset ${preset === key ? "selected" : ""}`}
                onClick={() => { setPreset(key); setOpts({ ...PRESETS[key] }); }}>
                {p.label}
              </button>
            ))}
          </div>
          <button className="primary" disabled={!!busy} onClick={compress}>
            {busy === "compress" ? "Compressing…" : `Compress with ${opts.label} settings`}
          </button>
          {compressed && (
            <div className="result">
              <dl className="kv">
                <div><dt>chain</dt><dd>{compressed.chain.steps.map((s) => s.detail).join(" → ")}</dd></div>
                <div><dt>size</dt><dd>{fmtBytes(compressed.processed.size_bytes)} ({compressed.processed.size_change_pct}%)</dd></div>
              </dl>
              <p>
                <a className="navlink" href={`${API}${compressed.download.url}`} download={compressed.download.filename}>
                  ⬇ Download the &quot;streamed&quot; copy ({fmtBytes(compressed.download.size_bytes)})
                </a>
                {"  "}— now upload it in section 3.
              </p>
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h2>3. Link a copy back to its record</h2>
        <p className="hint">
          Upload any audio — the compressed copy from section 2, a rip of it,
          anything. Three mechanisms run: audiowmark payload (exact record id),
          chromaprint fingerprint search (survives manipulation), and embedded
          C2PA manifest (lossless copies only).
        </p>
        <form onSubmit={linkCheck}>
          <label className="field">
            <span>Audio file (any format)</span>
            <input type="file" name="audio_file" accept="audio/*" required />
          </label>
          <button className="primary" disabled={!!busy}>
            {busy === "link" ? "Checking watermark, fingerprint, and C2PA…" : "Link it"}
          </button>
        </form>
        {linkResult && (
          <div className="result">
            <Badge ok={linkResult.linked}>
              {linkResult.linked ? `LINKED via ${linkResult.linked_via}` : "no record matched"}
            </Badge>
            <table className="coverage" style={{ marginTop: 12 }}>
              <thead><tr><th>mechanism</th><th>result</th><th>detail</th></tr></thead>
              <tbody>
                <tr>
                  <td>audiowmark watermark</td>
                  <td>{linkResult.mechanisms.watermark.detected ? "✅ exact id" : "—"}</td>
                  <td>
                    {linkResult.mechanisms.watermark.payload_hex
                      ? `payload ${linkResult.mechanisms.watermark.payload_hex.slice(0, 16)}… score ${linkResult.mechanisms.watermark.score}`
                      : linkResult.mechanisms.watermark.note}
                  </td>
                </tr>
                <tr>
                  <td>chromaprint fingerprint</td>
                  <td>{linkResult.mechanisms.fingerprint.matched ? "✅ matched" : "—"}</td>
                  <td>
                    best similarity {(linkResult.mechanisms.fingerprint.best_similarity * 100).toFixed(2)}%
                    {" "}(threshold {(linkResult.mechanisms.fingerprint.threshold * 100).toFixed(0)}%)
                  </td>
                </tr>
                <tr>
                  <td>embedded C2PA manifest</td>
                  <td>{linkResult.mechanisms.c2pa.manifest_present ? "✅ present" : "—"}</td>
                  <td>
                    {linkResult.mechanisms.c2pa.manifest_present
                      ? `validation ${linkResult.mechanisms.c2pa.validation_state}; failures: ${(linkResult.mechanisms.c2pa.failures || []).join(", ") || "none"}`
                      : linkResult.mechanisms.c2pa.note}
                  </td>
                </tr>
              </tbody>
            </table>
            {linkResult.record && (
              <dl className="kv" style={{ marginTop: 12 }}>
                <div><dt>record</dt><dd style={{ fontFamily: "ui-monospace, monospace" }}>{linkResult.record.record_id}</dd></div>
                <div><dt>artist</dt><dd>{linkResult.record.artist}</dd></div>
                <div><dt>registered</dt><dd>{linkResult.record.registered_at_utc}</dd></div>
                <div><dt>coherence</dt><dd>{(linkResult.record.coherence.confidence * 100).toFixed(1)}% {linkResult.record.coherence.verified ? "(verified)" : "(not verified)"}</dd></div>
                <div><dt>same-origin</dt><dd>{linkResult.record.same_origin.score}% ({linkResult.record.same_origin.band})</dd></div>
                <div><dt>proves</dt><dd>{linkResult.record.proves}</dd></div>
                <div><dt>does not prove</dt><dd>{linkResult.record.does_not_prove}</dd></div>
              </dl>
            )}
            <p className="status-note">
              searched {linkResult.registered_records} registered record(s)
            </p>
          </div>
        )}
        {error && busy === null && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
