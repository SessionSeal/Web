"use client";

import { useState } from "react";

const API = "/backend";

export default function StemMasterChecker() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData(e.target);
      const res = await fetch(`${API}/check/stem-master`, { method: "POST", body: fd });
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
    <main>
      <p>
        <a className="navlink" href="/">← app</a>
        {"  ·  "}
        <a className="navlink" href="/logic-master-checker">logic-master checker</a>
      </p>
      <h1>Stem ↔ master checker</h1>
      <p className="subtitle">
        Do these stems actually reconstruct this master? The stems are summed
        into a mixdown and compared to the master by perceptual fingerprint —
        byte differences from mastering don&apos;t matter, sound does.
      </p>

      <section className="card">
        <h2>Check</h2>
        <p className="hint">
          Samples: <code>sample-files/master.wav</code> with the three{" "}
          <code>stem_*.wav</code> files (should verify ~99%), or the{" "}
          <code>alt_stem_*.wav</code> set (should fail ~74%).
        </p>
        <form onSubmit={submit}>
          <label className="field">
            <span>Master</span>
            <input type="file" name="master" accept="audio/*" required />
          </label>
          <label className="field">
            <span>Stems (select 2 or more)</span>
            <input type="file" name="stems" accept="audio/*" multiple required />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Mixing down and comparing…" : "Check match"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        {result && (
          <div className="result">
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
              <span className="bignum">{(result.match_rate * 100).toFixed(2)}%</span>
              <span className={`badge ${result.verified ? "ok" : "warn"}`}>
                {result.verified ? "verified" : "NOT verified"} (threshold {(result.threshold * 100).toFixed(0)}%)
              </span>
            </div>
            <p className="status-note">{result.statement}</p>
            <p className="status-note">{result.method}</p>
            {result.flags.length > 0 && (
              <ul style={{ marginLeft: 20, marginTop: 8 }}>
                {result.flags.map((f, i) => <li key={i} className="error">{f}</li>)}
              </ul>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
