"use client";

import { useEffect } from "react";

function Scribble({ children }) {
  return (
    <span className="scribble">
      {children}
      <svg viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M3 8 C 30 3, 55 10, 82 6 S 135 4, 160 8 S 190 6, 197 5"
          fill="none" stroke="#4d7eff" strokeWidth="3"
          strokeLinecap="round" opacity="0.9" />
        <path
          d="M8 10 C 40 7, 80 11, 120 8 S 180 9, 194 8"
          fill="none" stroke="#4d7eff" strokeWidth="1.6"
          strokeLinecap="round" opacity="0.5" />
      </svg>
    </span>
  );
}

function Mark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        fill="#4d7eff"
        fillRule="evenodd"
        d="M32 3.00A29.00 29.00 0 1 1 31.99 3.00ZM32 20.00A12.00 12.00 0 1 1 31.99 20.00ZM54.12 35.50A22.40 22.40 0 0 1 32.39 54.40L32.29 48.40A16.40 16.40 0 0 0 48.20 34.57Z"
      />
    </svg>
  );
}

function Wordmark() {
  return (
    <span>Session<b style={{ fontWeight: 800 }}>Seal</b></span>
  );
}

const WAVE = [
  22, 38, 56, 44, 30, 52, 66, 48, 34, 26, 42, 60, 72, 58, 40, 30, 48, 64, 54,
  38, 28, 44, 58, 70, 52, 36, 24, 40, 56, 46, 32, 50, 68, 60, 44, 30, 22, 38,
  52, 42, 28, 46, 62, 50, 36, 26, 34, 48,
];

const ROWS = [
  {
    n: "01",
    t: "Verified before sealed",
    b:
      "Nothing gets a stamp until the parts prove they belong together: your " +
      "stems must audibly rebuild your master, and your session must show " +
      "the fossil record of real work — takes inside stems, save history, " +
      "recording dates spread over time.",
  },
  {
    n: "02",
    t: "Survives every platform",
    b:
      "Streaming services strip your metadata and compress everything. The " +
      "record is built for that: an inaudible watermark and an acoustic " +
      "fingerprint carry any copy back home after the metadata is long gone.",
  },
  {
    n: "03",
    t: "Three ways home",
    b:
      "The watermark finds the exact match, the fingerprint finds the " +
      "damaged copy, the signature proves the lossless one. Each covers the " +
      "others' blind spots — by design.",
  },
  {
    n: "04",
    t: "Honest by design",
    b:
      "Every record states exactly what it proves — you held the files, " +
      "they're unchanged, they belong together, and you had them first — " +
      "and what it doesn't. Precision is what wins disputes.",
  },
];

export default function Landing() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="ld-page">
      <div className="ld-nav-wrap">
        <nav className="ld-nav">
          <a className="ld-mark" href="/">
            <Mark />
            <Wordmark />
          </a>
          <div className="ld-nav-links">
            <a href="#how">How it works</a>
            <a href="#checkers">Checkers</a>
          </div>
          <a className="ld-pill" href="/app">
            Open the app →
          </a>
        </nav>
      </div>

      <header className="ld-hero">
        <div className="ld-hero-inner">
          <h1 className="rise" style={{ "--d": "0.05s" }}>
            Prove your music
            <br />
            is <Scribble>yours.</Scribble>
          </h1>
          <p className="lede rise" style={{ "--d": "0.18s" }}>
            Upload your stems, master, and session once. Your track gets a
            sealed, timestamped record. If it&apos;s ever claimed, flagged,
            or stolen, your proof already exists.
          </p>
          <div className="ld-cta-row rise" style={{ "--d": "0.3s" }}>
            <a className="ld-pill ghost" href="#how">
              How it works
            </a>
            <a className="ld-pill" href="/app">
              Register a track →
            </a>
          </div>
        </div>

        <div className="ld-mock-wrap rise" style={{ "--d": "0.42s" }} aria-hidden="true">
          <div className="ld-mock">
            <div className="ld-mock-top">
              <span>
                <span className="dot" />
                Record sealed — 2026-09-01 04:14 UTC
              </span>
              <span>signed · timestamped</span>
            </div>
            <div className="ld-mock-body">
              <div className="ld-mock-wave">
                {WAVE.map((h, i) => (
                  <i key={i} className={i >= 18 && i < 30 ? "hot" : ""}
                    style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="ld-mock-badges">
                <span className="ld-mock-badge"><span className="tick">✓</span>Stems rebuild master — 96.4%</span>
                <span className="ld-mock-badge"><span className="tick">✓</span>Session checks out — 100</span>
                <span className="ld-mock-badge"><span className="tick">✓</span>Watermarked</span>
                <span className="ld-mock-badge"><span className="tick">✓</span>Fingerprinted</span>
                <span className="ld-mock-badge"><span className="tick">✓</span>Signed</span>
              </div>
              <p className="ld-mock-id">
                record <b>601e3e0c-0aaa-497a-a69a-a5634f2a835b</b> · watermark
                verified · fingerprint on file
              </p>
            </div>
          </div>
        </div>

        <div className="ld-standards rise" style={{ "--d": "0.55s" }}>
          <p className="lbl">Built on open standards</p>
          <div className="marks">
            <span className="mark">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2l8 3.5v6c0 5-3.4 8.6-8 10.5C7.4 20.1 4 16.5 4 11.5v-6L12 2z"
                  fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8.5 12l2.4 2.4 4.6-4.8" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              C2PA
            </span>
            <span className="mark">
              <svg width="24" height="18" viewBox="0 0 28 20" aria-hidden="true">
                <rect x="1" y="1" width="26" height="18" rx="9"
                  fill="none" stroke="currentColor" strokeWidth="1.8" />
                <text x="14" y="14" textAnchor="middle" fontSize="9.5"
                  fontWeight="800" fill="currentColor" fontFamily="inherit">CR</text>
              </svg>
              Content Credentials
            </span>
            <span className="mark">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="4.5" fill="none"
                  stroke="currentColor" strokeWidth="1.8" />
                <path d="M11.8 11.8 L20 20 M20 20 v-3.4 M17 17 h3.2"
                  fill="none" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" />
              </svg>
              ES256 signatures
            </span>
            <span className="mark">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5"
                  fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M9.5 7.5 L8.5 16.5 M15.5 7.5 L14.5 16.5 M7 10.2 h10.5 M6.5 13.8 h10.5"
                  fill="none" stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" />
              </svg>
              SHA-256
            </span>
          </div>
        </div>
      </header>

      <div className="ruler" aria-hidden="true" />

      <section id="how" className="ld-section">
        <div className="ld-section-inner">
          <h2 className="reveal">From session to sealed record.</h2>
          <p className="sub reveal" style={{ "--d": "0.1s" }}>
            The evidence that wins disputes today — session files and stems,
            produced manually, under duress — sealed cryptographically, in
            advance.
          </p>
          <div className="ld-rows">
            {ROWS.map((r, i) => (
              <div className="ld-row reveal" style={{ "--d": `${i * 0.06}s` }} key={r.n}>
                <h3>
                  <span>{r.n}</span>
                  {r.t}
                </h3>
                <p>{r.b}</p>
              </div>
            ))}
          </div>

          <div className="ld-cards">
            <div className="ld-card reveal">
              <div className="glyph">◌</div>
              <h3>
                Inaudible watermark
                <small>secret-keyed</small>
              </h3>
              <p>
                Hidden in the audio itself, below hearing. It survives every
                platform&apos;s compression, and it&apos;s locked with a
                secret key — nobody else can read it or fake it.
              </p>
            </div>
            <div className="ld-card reveal" style={{ "--d": "0.08s" }}>
              <div className="glyph">≈</div>
              <h3>
                Acoustic fingerprint
                <small>matches by sound</small>
              </h3>
              <p>
                Recognizes the track by how it sounds, not what file it&apos;s
                in. Catches what kills watermarks — tempo edits, heavy
                damage, chopped-up copies.
              </p>
            </div>
            <div className="ld-card reveal" style={{ "--d": "0.16s" }}>
              <div className="glyph">§</div>
              <h3>
                Cryptographic signature
                <small>C2PA standard</small>
              </h3>
              <p>
                An unforgeable seal over your master, stems, and session, with
                the verification results and a timestamp. Change a single
                sample and it breaks.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="ruler" aria-hidden="true" />

      <section id="checkers" className="ld-section">
        <div className="ld-section-inner">
          <h2 className="reveal">The forensics, à la carte.</h2>
          <p className="sub reveal" style={{ "--d": "0.1s" }}>
            The same checks that guard registration — usable on their own.
          </p>
          <div className="ld-tools">
            <a className="ld-tool reveal" href="/stem-master-checker">
              <h3>
                Stem ↔ master checker<span className="arr">→</span>
              </h3>
              <p>
                Do these stems really add up to this master? We mix them down
                and compare by sound — cheating gets caught.
              </p>
            </a>
            <a className="ld-tool reveal" style={{ "--d": "0.08s" }} href="/logic-master-checker">
              <h3>
                Logic ↔ master checker<span className="arr">→</span>
              </h3>
              <p>
                Did this session actually produce these files? Your takes
                inside your stems, your save history, your recording dates.
              </p>
            </a>
          </div>
        </div>
      </section>

      <section className="ld-cta">
        <div className="inner">
          <h2 className="reveal">
            Seal your first record
            <br />
            in <Scribble>minutes.</Scribble>
          </h2>
          <p className="reveal" style={{ "--d": "0.1s" }}>
            Insurance you buy before the fire — and the proof you produce in
            minutes instead of weeks.
          </p>
          <div className="reveal" style={{ "--d": "0.2s" }}>
            <a className="ld-pill" href="/app">
              Open the app →
            </a>
          </div>
        </div>
      </section>

      <footer className="ld-footer">
        <div className="ruler" aria-hidden="true" />
        <div className="ld-footer-inner">
          <div className="brand">
            <Mark size={30} />
            <h2>Your music, provable forever.</h2>
            <p>
              A sealed record for every release — before anyone can question
              it.
            </p>
          </div>
          <div className="ld-footer-cols">
            <div className="ld-footer-col">
              <h3>Product</h3>
              <a href="/app">Register a track</a>
              <a href="#how">How it works</a>
            </div>
            <div className="ld-footer-col">
              <h3>Verify</h3>
              <a href="/verify">Verify a copy</a>
              <a href="/compress">Compress test</a>
              <a href="/stem-master-checker">Stem ↔ master</a>
              <a href="/logic-master-checker">Logic ↔ master</a>
            </div>
            <div className="ld-footer-col">
              <h3>Labs</h3>
              <a href="/logic">Logic inspector</a>
              <a href="/fingerprint">Fingerprint</a>
              <a href="/watermark">Watermark</a>
              <a href="/waterprint">Waterprint</a>
            </div>
          </div>
        </div>
        <div className="ld-footer-base">
          <span>© 2026 SessionSeal — proof-of-concept</span>
          <span>Records state exactly what they prove — and what they don&apos;t.</span>
        </div>
      </footer>
    </div>
  );
}
