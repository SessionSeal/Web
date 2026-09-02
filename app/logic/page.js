"use client";

import { useMemo, useState } from "react";

const API = "/backend";

function fmtBytes(n) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function JsonTree({ name, data, depth = 0 }) {
  if (data === null || typeof data !== "object") {
    return (
      <div className="jt-leaf">
        <span className="jt-key">{name}</span>
        <span className="jt-val">{JSON.stringify(data)}</span>
      </div>
    );
  }
  const isArr = Array.isArray(data);
  const entries = isArr
    ? data.map((v, i) => [i, v])
    : Object.entries(data);
  if (entries.length === 0) {
    return (
      <div className="jt-leaf">
        <span className="jt-key">{name}</span>
        <span className="jt-val">{isArr ? "[]" : "{}"}</span>
      </div>
    );
  }
  return (
    <details className="jt-node" open={depth < 1}>
      <summary>
        <span className="jt-key">{name}</span>
        <span className="jt-meta">{isArr ? `array (${entries.length})` : `object (${entries.length})`}</span>
      </summary>
      <div className="jt-children">
        {entries.map(([k, v]) => (
          <JsonTree key={String(k)} name={String(k)} data={v} depth={depth + 1} />
        ))}
      </div>
    </details>
  );
}

function StringsExplorer({ strings }) {
  const [query, setQuery] = useState("");
  const all = useMemo(() => {
    const a = (strings.ascii || []).map((x) => ({ ...x, enc: "ascii" }));
    const u = (strings.utf16 || []).map((x) => ({ ...x, enc: "utf-16" }));
    return [...a, ...u];
  }, [strings]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? all.filter((x) => x.s.toLowerCase().includes(q)) : all;
  }, [all, query]);
  const shown = filtered.slice(0, 400);
  return (
    <div>
      <input
        type="text"
        placeholder={`search ${all.length} extracted strings…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 10, maxWidth: 420 }}
      />
      <div className="strings-box">
        {shown.map((x, i) => (
          <div key={i} className="string-row">
            <span className="string-count">×{x.n}</span>
            <span className="string-enc">{x.enc}</span>
            <span className="string-val">{x.s}</span>
          </div>
        ))}
        {filtered.length > shown.length && (
          <p className="status-note">
            showing {shown.length} of {filtered.length} — refine the search to see more
          </p>
        )}
        {filtered.length === 0 && <p className="status-note">no matches</p>}
      </div>
      {(strings.ascii_truncated || strings.utf16_truncated) && (
        <p className="status-note">
          note: string list capped server-side ({strings.ascii_unique_total} unique
          ascii / {strings.utf16_unique_total} unique utf-16 found in total)
        </p>
      )}
    </div>
  );
}

function BinaryReport({ bin }) {
  return (
    <div className="binary-report">
      <dl className="kv">
        <div><dt>size</dt><dd>{fmtBytes(bin.size)}</dd></div>
        <div><dt>sha256</dt><dd>{bin.sha256}</dd></div>
        <div><dt>entropy</dt><dd>{bin.entropy_bits_per_byte} bits/byte (8.0 = random/compressed)</dd></div>
        <div><dt>header</dt><dd style={{ fontFamily: "monospace" }}>{bin.header_hex}</dd></div>
      </dl>
      <p className="status-note">{bin.note}</p>
      {bin.strings?.paths_found?.length > 0 && (
        <>
          <h4>File paths found inside</h4>
          <div className="strings-box">
            {bin.strings.paths_found.map((p, i) => (
              <div key={i} className="string-row"><span className="string-val">{p}</span></div>
            ))}
          </div>
        </>
      )}
      <h4>Embedded strings</h4>
      <StringsExplorer strings={bin.strings || {}} />
    </div>
  );
}

function MediaRow({ m }) {
  const fmt = m.ffprobe?.format || {};
  const stream = (m.ffprobe?.streams || [])[0] || {};
  const chunkReport = m.wav_chunks || m.aiff_chunks || m.caf_chunks;
  return (
    <details className="media-row">
      <summary>
        <strong>{m.path}</strong>
        <span className="jt-meta">
          {stream.codec_name || "unreadable"}
          {fmt.duration ? ` · ${Number(fmt.duration).toFixed(2)}s` : ""}
          {stream.sample_rate ? ` · ${stream.sample_rate} Hz` : ""}
          {stream.channels ? ` · ${stream.channels}ch` : ""}
          {` · ${fmtBytes(m.size)}`}
        </span>
      </summary>
      <div className="jt-children">
        <div className="jt-leaf"><span className="jt-key">sha256</span><span className="jt-val">{m.sha256}</span></div>
        {m.ffprobe && <JsonTree name="ffprobe" data={m.ffprobe} depth={1} />}
        {chunkReport && (
          <JsonTree
            name={m.wav_chunks ? "wav chunks" : m.aiff_chunks ? "aiff chunks" : "caf chunks"}
            data={chunkReport}
            depth={0}
          />
        )}
      </div>
    </details>
  );
}

// Recursively walk a dropped directory entry, collecting files with their
// package-relative paths. readEntries() returns at most ~100 entries per
// call, so keep calling until it comes back empty.
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
      for (const child of batch) {
        await walkEntry(child, `${prefix}/${child.name}`, out);
      }
    } while (batch.length > 0);
  }
}

export default function LogicInspector() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  async function runRequest(makeForm, endpoint) {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        body: makeForm(),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail));
      }
      setReport(body);
    } catch (err) {
      setError(
        `${err.message || err} — if this mentions a network/CORS failure, check that ` +
          "the backend is running: uvicorn app.main:app --port 8000"
      );
    } finally {
      setBusy(false);
    }
  }

  function sendFolder(filesWithPaths) {
    return runRequest(() => {
      const fd = new FormData();
      for (const { file, path } of filesWithPaths) {
        fd.append("files", file);
        fd.append("paths", path);
      }
      return fd;
    }, "/logic/inspect-files");
  }

  function sendZip(file) {
    return runRequest(() => {
      const fd = new FormData();
      fd.append("project", file);
      return fd;
    }, "/logic/inspect");
  }

  async function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    setError(null);
    try {
      const items = Array.from(e.dataTransfer.items || []);
      const collected = [];
      let zip = null;
      for (const item of items) {
        const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
        if (entry && entry.isDirectory) {
          await walkEntry(entry, entry.name, collected);
        } else if (entry && entry.isFile) {
          const f = await new Promise((res, rej) => entry.file(res, rej));
          if (f.name.toLowerCase().endsWith(".zip")) zip = f;
          else collected.push({ file: f, path: f.name });
        }
      }
      if (collected.length > 0) return sendFolder(collected);
      if (zip) return sendZip(zip);
      setError("Drop a .logicx package (or a zip of one).");
    } catch (err) {
      setError(String(err.message || err));
    }
  }

  async function submit(e) {
    e.preventDefault();
    const folderFiles = Array.from(e.target.folder.files || []);
    const zipFile = e.target.project.files[0];
    if (folderFiles.length > 0) {
      return sendFolder(
        folderFiles.map((f) => ({ file: f, path: f.webkitRelativePath || f.name }))
      );
    }
    if (zipFile) return sendZip(zipFile);
    setError("Drag a .logicx onto the drop zone, or pick a folder/zip first.");
  }

  return (
    <main>
      <p><a className="navlink" href="/app">← back to the app</a></p>
      <h1>Logic project inspector</h1>
      <p className="subtitle">
        Upload a zipped .logicx package. Everything parseable is extracted and
        shown; the coverage table at the bottom accounts for every file.
      </p>
      <p className="disclaimer">
        Logic&apos;s core ProjectData file is a proprietary, undocumented binary —
        it cannot be decoded, so for it (and any other unrecognized binary) the
        parseable limit is metadata + embedded strings, which is what you&apos;ll
        see below. Every plist, media file, image, and text file is fully parsed.
      </p>

      <section className="card">
        <h2>Inspect a project</h2>
        <p className="hint">
          Easiest: <strong>drag your .logicx straight from Finder</strong> onto
          the drop zone — macOS treats .logicx as a package, so folder-picker
          dialogs won&apos;t let you select it, but dragging works. A zip of the
          package works too. Demo: <code>sample-files/DemoProject.logicx</code>.
        </p>
        <div
          className={`dropzone ${dragOver ? "active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {busy
            ? "Uploading and extracting everything… (big projects take a minute)"
            : "Drop your .logicx package (or a .zip of it) here"}
        </div>
        <form onSubmit={submit}>
          <label className="field">
            <span>
              …or pick a folder (note: the dialog can&apos;t select a .logicx
              package itself — use drag &amp; drop for that)
            </span>
            <input type="file" name="folder" webkitdirectory="" multiple />
          </label>
          <label className="field">
            <span>…or a zipped .logicx</span>
            <input type="file" name="project" accept=".zip,.logicx" />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Extracting everything…" : "Inspect"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      {report && (
        <>
          <section className="card">
            <h2>Overview</h2>
            <dl className="kv">
              <div><dt>zip</dt><dd>{report.zip.filename} ({fmtBytes(report.zip.size)})</dd></div>
              <div><dt>sha256</dt><dd>{report.zip.sha256}</dd></div>
              <div><dt>package root</dt><dd>{report.package.root || "(files at zip root)"}</dd></div>
              <div><dt>looks like .logicx</dt><dd>{String(report.package.looks_like_logicx)}</dd></div>
              <div><dt>files</dt><dd>{report.zip.file_count}</dd></div>
              <div><dt>alternatives</dt><dd>{Object.keys(report.package.alternatives).join(", ") || "none found"}</dd></div>
              <div><dt>parsed</dt><dd>
                {report.plists.length} plists · {report.media.length} media · {report.images.length} images ·{" "}
                {report.project_data.length} ProjectData · {report.text_files.length} text ·{" "}
                {report.other_binaries.length} other binaries
              </dd></div>
            </dl>
            <p className="status-note">{report.limits_note}</p>
          </section>

          {report.images.length > 0 && (
            <section className="card">
              <h2>Images</h2>
              <div className="gallery">
                {report.images.map((img, i) => (
                  <figure key={i}>
                    {img.data_url ? (
                      <img src={img.data_url} alt={img.path} />
                    ) : (
                      <div className="noimg">{img.note}</div>
                    )}
                    <figcaption>
                      {img.path}
                      <br />
                      {img.width && `${img.width}×${img.height} `}
                      {img.codec} · {fmtBytes(img.size)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )}

          {report.plists.length > 0 && (
            <section className="card">
              <h2>Property lists ({report.plists.length})</h2>
              <p className="hint">
                Fully parsed. NSKeyedArchiver archives are additionally resolved
                into plain nested structures.
              </p>
              {report.plists.map((p, i) => (
                <details key={i} className="media-row">
                  <summary>
                    <strong>{p.path}</strong>
                    <span className="jt-meta">{p.format} plist · {fmtBytes(p.size)}</span>
                  </summary>
                  <div className="jt-children">
                    <JsonTree name="parsed" data={p.parsed} depth={0} />
                    {p.nskeyedarchiver_resolved && (
                      <JsonTree name="NSKeyedArchiver resolved" data={p.nskeyedarchiver_resolved} depth={0} />
                    )}
                    {p.nskeyedarchiver_error && (
                      <p className="error">archiver resolution failed: {p.nskeyedarchiver_error}</p>
                    )}
                  </div>
                </details>
              ))}
            </section>
          )}

          {report.media.length > 0 && (
            <section className="card">
              <h2>Media files ({report.media.length})</h2>
              <p className="hint">
                ffprobe format/stream data plus manual chunk-level decoding
                (bext, iXML, INFO tags, cue points, loops, tempo/acid, markers).
              </p>
              {report.media.map((m, i) => <MediaRow key={i} m={m} />)}
            </section>
          )}

          {report.project_data.map((pd, i) => (
            <section className="card" key={i}>
              <h2>ProjectData: {pd.path}</h2>
              <BinaryReport bin={pd} />
            </section>
          ))}

          {report.other_binaries.map((b, i) => (
            <section className="card" key={i}>
              <h2>Unrecognized binary: {b.path}</h2>
              <BinaryReport bin={b} />
            </section>
          ))}

          {report.text_files.length > 0 && (
            <section className="card">
              <h2>Text files ({report.text_files.length})</h2>
              {report.text_files.map((t, i) => (
                <details key={i} className="media-row">
                  <summary>
                    <strong>{t.path}</strong>
                    <span className="jt-meta">{fmtBytes(t.size)}{t.truncated ? " · preview truncated" : ""}</span>
                  </summary>
                  <pre className="json">{t.preview}</pre>
                </details>
              ))}
            </section>
          )}

          <section className="card">
            <h2>Coverage — every file, how it was handled</h2>
            <table className="coverage">
              <thead>
                <tr><th>path</th><th>size</th><th>handled as</th></tr>
              </thead>
              <tbody>
                {report.coverage.map((c, i) => (
                  <tr key={i}>
                    <td>{c.path}</td>
                    <td>{fmtBytes(c.size)}</td>
                    <td>{c.handled_as}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report.unparsed.length > 0 && (
              <>
                <h4 style={{ marginTop: 14 }}>Failed to parse</h4>
                <ul>
                  {report.unparsed.map((u, i) => (
                    <li key={i} className="error">{u.path}: {u.reason}</li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="card">
            <h2>Zip entries (raw)</h2>
            <table className="coverage">
              <thead>
                <tr><th>path</th><th>size</th><th>compressed</th><th>modified</th><th>crc32</th></tr>
              </thead>
              <tbody>
                {report.zip.entries.map((e, i) => (
                  <tr key={i}>
                    <td>{e.path}</td>
                    <td>{fmtBytes(e.size)}</td>
                    <td>{fmtBytes(e.compressed_size)}</td>
                    <td>{e.modified}</td>
                    <td style={{ fontFamily: "monospace" }}>{e.crc32}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}
