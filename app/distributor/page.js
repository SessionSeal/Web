"use client";

import { useRef, useState } from "react";
import { Drop, PageTop, fmtBytes } from "../components";

const API = "/backend";

export default function Distributor() {
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
  const wm = result?.mechanisms?.watermark;
  const fp = result?.mechanisms?.fingerprint;
  const c2 = result?.mechanisms?.c2pa;

  return (
    <div className="wz-shell">
      <PageTop links={[["← Back to site", "/"], ["Open the app", "/app"]]} />
      <main className="wz-main">
        <p className="stepnum">FOR DISTRIBUTORS &amp; PLATFORMS</p>
        <h1>Check a delivery against sealed records.</h1>
        <p className="lede">
          Upload a delivered file. If the artist sealed it with MotherTape, you
          get the provenance record: who held the source material, when it
          was sealed, how it verified — with the signed manifest as the
          evidence trail. A signal for your review process, not a verdict.
        </p>

        <Drop
          filled={!!file}
          big={file ? `✓ ${file.name}` : "Drop the delivered audio here"}
          small={file ? fmtBytes(file.size) : "Any format — or click to browse"}
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
            <div className="stage">Checking against sealed records</div>
            <div className="sub">Watermark · acoustic fingerprint · embedded signature</div>
            <div className="bar"><div /></div>
          </div>
        )}

        {error && <div className="wz-flag" style={{ marginTop: 18 }}>{error}</div>}

        {result && !busy && (
          <>
            {result.linked ? (
              <div className="wz-sealed" style={{ marginTop: 24 }}>
                <div className="t">Provenance record found.</div>
                <div className="s">
                  This audio links to a record sealed{" "}
                  {rec.registered_at_utc} via{" "}
                  {result.linked_via.startsWith("watermark")
                    ? "an exact watermark match, corroborated by sound"
                    : "acoustic fingerprint similarity"}.
                </div>
              </div>
            ) : result.copy_attack_suspected ? (
              <div className="wz-flag" style={{ marginTop: 24 }}>
                <b>Caution:</b> a watermark was detected, but the audio does
                not match the record it points to. This is consistent with a
                watermark copied from another track onto this one. Treat this
                delivery as unverified and escalate to human review.
              </div>
            ) : (
              <div className="wz-panel" style={{ marginTop: 24 }}>
                <h3>No sealed record</h3>
                <p className="ph" style={{ marginBottom: 0 }}>
                  This audio matches none of the {result.registered_records}{" "}
                  sealed records. Absence of a record is not evidence of
                  anything — the artist may simply not use MotherTape.
                </p>
              </div>
            )}

            {rec && (
              <div className="wz-panel" style={{ marginTop: 20 }}>
                <h3>Record detail</h3>
                <div className="wz-review" style={{ marginTop: 14 }}>
                  <div className="row"><span className="k">Registered artist</span><span className="v">{rec.artist}</span></div>
                  <div className="row"><span className="k">Sealed (UTC)</span><span className="v">{rec.registered_at_utc}</span></div>
                  <div className="row"><span className="k">Record id</span><span className="v wz-mono">{rec.record_id}</span></div>
                  <div className="row"><span className="k">Stems rebuilt master</span>
                    <span className="v">{(rec.coherence.confidence * 100).toFixed(1)}% {rec.coherence.verified ? "(verified at sealing)" : "(NOT verified)"}</span></div>
                  <div className="row"><span className="k">Session verification</span>
                    <span className="v">{rec.same_origin.score}/100 ({rec.same_origin.band})</span></div>
                  <div className="row"><span className="k">Signer</span>
                    <span className="v">{rec.signer.cert_subject} (self-attested)</span></div>
                  <div className="row"><span className="k">Proves</span><span className="v">{rec.proves}</span></div>
                  <div className="row"><span className="k">Does not prove</span><span className="v">{rec.does_not_prove}</span></div>
                </div>
                <a className="wz-btn ghost" style={{ textDecoration: "none" }}
                  href={rec.manifest_url || `${API}/product/records/${rec.record_id}/manifest`}
                  target="_blank" rel="noreferrer">
                  Download the signed manifest →
                </a>
              </div>
            )}

            <div className="wz-panel" style={{ marginTop: 20 }}>
              <h3>Mechanism detail</h3>
              <table className="coverage" style={{ marginTop: 10 }}>
                <thead><tr><th>mechanism</th><th>result</th><th>detail</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Inaudible watermark</td>
                    <td>{wm.matched_registered_record ? "✓ exact record" : wm.detected ? "detected" : "—"}</td>
                    <td>{wm.note || `corroboration ${wm.fingerprint_corroboration ?? "n/a"}`}</td>
                  </tr>
                  <tr>
                    <td>Acoustic fingerprint</td>
                    <td>{fp.matched ? "✓ matched" : "—"}</td>
                    <td>best similarity {(fp.best_similarity * 100).toFixed(1)}% (threshold {(fp.threshold * 100).toFixed(0)}%)</td>
                  </tr>
                  <tr>
                    <td>Embedded signature</td>
                    <td>{c2.manifest_present ? "✓ present" : "—"}</td>
                    <td>{c2.manifest_present
                      ? `validation ${c2.validation_state}; notes: ${(c2.failures || []).join(", ") || "none"}`
                      : "stripped — normal after platform re-encoding; the server-side record is authoritative"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
