"use client";

import { useRef, useState } from "react";
import { Drop, PageTop, fmtBytes } from "../components";

const API = "/backend";

export default function Verify() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const input = useRef(null);

  async function run(f) {
    const audio = f || file;
    if (!audio) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("audio_file", audio);
      const res = await fetch(`${API}/product/link`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
      setResult(body);
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  const rec = result?.record;

  return (
    <div className="wz-shell">
      <PageTop links={[["Compress a copy", "/compress"], ["Open the app", "/"]]} />
      <main className="wz-main">
        <h1>Verify a copy.</h1>
        <p className="lede">
          Upload any version of a track, a download, a stream rip, a file
          someone sent you, and check whether it matches a sealed record.
          If it does, you get the record and its signed manifest.
        </p>

        <Drop
          filled={!!file}
          big={file ? `✓ ${file.name}` : "Drop the audio here"}
          small={file ? fmtBytes(file.size) : "Any format, or click to browse"}
          onClick={() => input.current.click()}
          onFiles={(fs) => { setFile(fs[0]); run(fs[0]); }}
        />
        <input ref={input} type="file" accept="audio/*" hidden
          onChange={(e) => {
            const f = e.target.files[0];
            if (f) { setFile(f); run(f); }
          }} />

        {busy && (
          <div className="wz-busy">
            <div className="stage">Checking watermark, fingerprint, and signature</div>
            <div className="bar"><div /></div>
          </div>
        )}

        {error && <div className="wz-flag" style={{ marginTop: 18 }}>{error}</div>}

        {result && !busy && (
          <>
            {result.linked ? (
              <div className="wz-sealed" style={{ marginTop: 24 }}>
                <div className="t">Match found.</div>
                <div className="s">
                  Linked via{" "}
                  {result.linked_via.startsWith("watermark")
                    ? "the watermark (exact match, corroborated by sound)"
                    : "the acoustic fingerprint"}
                </div>
              </div>
            ) : result.copy_attack_suspected ? (
              <div className="wz-flag" style={{ marginTop: 24 }}>
                A watermark was detected, but the audio does not match the
                record it points to, consistent with a copied or
                transplanted watermark. Not linked.
              </div>
            ) : (
              <div className="wz-panel" style={{ marginTop: 24 }}>
                <h3>No match</h3>
                <p className="ph" style={{ marginBottom: 0 }}>
                  This audio doesn&apos;t match any sealed record
                  ({result.registered_records} on file).
                </p>
              </div>
            )}

            {rec && (
              <div className="wz-panel" style={{ marginTop: 20 }}>
                <h3>The record</h3>
                <div className="wz-review" style={{ marginTop: 14 }}>
                  <div className="row"><span className="k">Artist</span><span className="v">{rec.artist}</span></div>
                  <div className="row"><span className="k">Sealed</span><span className="v">{rec.registered_at_utc}</span></div>
                  <div className="row"><span className="k">Record</span><span className="v wz-mono">{rec.record_id}</span></div>
                  <div className="row"><span className="k">Stems rebuild master</span>
                    <span className="v">{(rec.coherence.confidence * 100).toFixed(1)}% {rec.coherence.verified ? "(verified)" : "(not verified)"}</span></div>
                  <div className="row"><span className="k">Session check</span>
                    <span className="v">{rec.same_origin.score}/100 ({rec.same_origin.band})</span></div>
                  <div className="row"><span className="k">Proves</span><span className="v">{rec.proves}</span></div>
                  <div className="row"><span className="k">Does not prove</span><span className="v">{rec.does_not_prove}</span></div>
                </div>
                <a className="wz-btn ghost" style={{ textDecoration: "none" }}
                  href={rec.manifest_url || `${API}/product/records/${rec.record_id}/manifest`}
                  target="_blank" rel="noreferrer">
                  View the signed manifest →
                </a>
              </div>
            )}

            <p className="status-note">
              watermark: {result.mechanisms.watermark.detected ? "found" : "not found"} ·
              fingerprint similarity {(result.mechanisms.fingerprint.best_similarity * 100).toFixed(1)}% ·
              embedded signature: {result.mechanisms.c2pa.manifest_present ? "present" : "stripped (normal after streaming)"}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
