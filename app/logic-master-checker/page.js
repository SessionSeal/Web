"use client";

import { useState } from "react";

const API = "/backend";

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

const RESULT_STYLE = {
  match: { color: "var(--ok)", label: "match" },
  contradiction: { color: "var(--warn)", label: "CONTRADICTION" },
  not_evaluable: { color: "var(--muted)", label: "not evaluable" },
};

export default function LogicMasterChecker() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [dropped, setDropped] = useState(null); // {files:[{file,path}], label}
  const [dragOver, setDragOver] = useState(false);

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

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const fd = new FormData();
      fd.append("master", e.target.master.files[0]);
      for (const s of e.target.stems.files) fd.append("stems", s);
      const zip = e.target.project.files[0];
      const folder = Array.from(e.target.folder.files || []);
      if (dropped) {
        for (const { file, path } of dropped.files) {
          if (path.toLowerCase().endsWith(".zip") && dropped.files.length === 1) {
            fd.append("project", file);
          } else {
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
        throw new Error("Provide the .logicx: drag it in, pick the folder, or upload a zip.");
      }
      const res = await fetch(`${API}/check/logic-master`, { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
      setReport(body);
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
        <a className="navlink" href="/stem-master-checker">stem-master checker</a>
      </p>
      <h1>Logic ↔ stems ↔ master checker</h1>
      <p className="subtitle">
        Same-origin confidence: did these stems, this master, and this Logic
        project come from one session? Audio-DNA containment matching, superset
        evidence, and metadata consistency — each check reports match /
        contradiction / not-evaluable, and only contradictions subtract.
      </p>
      <p className="disclaimer">
        This measures same-session plausibility for a human adjudicator. It does
        not prove authorship. Try <code>sample-files/ProductTest.logicx.zip</code>{" "}
        with the real stems (scores strong) vs{" "}
        <code>DemoProject.logicx.zip</code> (scores contradicted).
      </p>

      <section className="card">
        <h2>Check</h2>
        <div
          className={`dropzone ${dragOver ? "active" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {dropped ? `✓ ${dropped.label}` : "Drop the .logicx package (or a .zip of it) here"}
        </div>
        <form onSubmit={submit}>
          <label className="field">
            <span>…or pick the project folder</span>
            <input type="file" name="folder" webkitdirectory="" multiple />
          </label>
          <label className="field">
            <span>…or a zipped .logicx</span>
            <input type="file" name="project" accept=".zip,.logicx" />
          </label>
          <label className="field">
            <span>Master</span>
            <input type="file" name="master" accept="audio/*" required />
          </label>
          <label className="field">
            <span>Stems (2 or more)</span>
            <input type="file" name="stems" accept="audio/*" multiple required />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Fingerprinting takes and cross-matching…" : "Analyze same-origin confidence"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      {report && (
        <section className="card">
          <h2>Result</h2>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
            <span className="bignum">{report.score}%</span>
            <span className={`badge ${report.band === "strong" ? "ok" : report.band === "moderate" ? "" : "warn"}`}
              style={report.band === "moderate" ? { background: "rgba(154,103,0,0.12)", color: "var(--amber)" } : {}}>
              {report.band}
            </span>
            <span className="hint" style={{ margin: 0 }}>{report.profile}</span>
          </div>
          {report.cap_applied && (
            <p className="error">score capped at {report.cap_applied}% by red-flag signature</p>
          )}
          {report.red_flags.length > 0 && (
            <ul style={{ margin: "10px 0 0 20px" }}>
              {report.red_flags.map((f, i) => <li key={i} className="error">{f}</li>)}
            </ul>
          )}
          <table className="coverage" style={{ marginTop: 16 }}>
            <thead>
              <tr><th>check</th><th>weight</th><th>result</th><th>detail</th></tr>
            </thead>
            <tbody>
              {report.checks.map((c, i) => (
                <tr key={i}>
                  <td>{c.check}</td>
                  <td>{c.weight || "info"}</td>
                  <td style={{ color: RESULT_STYLE[c.result].color, fontWeight: 600 }}>
                    {RESULT_STYLE[c.result].label}
                  </td>
                  <td>{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.media_matching?.length > 0 && (
            <details style={{ marginTop: 12 }}>
              <summary className="hint" style={{ cursor: "pointer" }}>
                per-take audio-DNA matching detail
              </summary>
              <table className="coverage" style={{ marginTop: 8 }}>
                <thead><tr><th>project media file</th><th>best containment in stems</th><th>in master</th></tr></thead>
                <tbody>
                  {report.media_matching.map((m, i) => (
                    <tr key={i}>
                      <td>{m.file}</td>
                      <td>{(m.best_in_stems * 100).toFixed(1)}%</td>
                      <td>{(m.best_in_master * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
          <p className="status-note" style={{ marginTop: 10 }}>{report.notes.join(" · ")}</p>
        </section>
      )}
    </main>
  );
}
