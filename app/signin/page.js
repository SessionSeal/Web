"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Mark } from "../components";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const WAVE = [22, 38, 56, 44, 30, 52, 66, 48, 34, 26, 42, 60, 72, 58, 40,
  30, 48, 64, 54, 38, 28, 44, 58, 70, 52, 36, 24, 40, 56, 46, 32, 50];

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function safeNext(raw) {
  // relative paths only, never an open redirect
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

function SignIn() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session?.user) window.location.replace(next);
  }, [session, next]);

  return (
    <div className="si-shell">
      <aside className="si-brand" aria-hidden="true">
        <a className="ld-mark si-mark" href={SITE_URL}>
          <Mark />
          <span>Session<b style={{ fontWeight: 800 }}>Seal</b></span>
        </a>
        <div className="si-brand-middle">
          <h1 className="si-headline">
            Prove your music
            <br />
            is <em>yours.</em>
          </h1>
          <ul className="si-points">
            <li>Seal your stems, master, and session in minutes</li>
            <li>Your proof exists before anyone questions you</li>
            <li>Every copy traces back, even after streaming</li>
          </ul>
        </div>
        <div className="si-wave">
          {WAVE.map((h, i) => (
            <i key={i} className={i >= 12 && i < 20 ? "hot" : ""}
              style={{ height: `${h}%` }} />
          ))}
        </div>
      </aside>

      <main className="si-form">
        <div className="si-card">
          <h2>Welcome to SessionSeal</h2>
          <p className="si-sub">
            Sign in to seal, verify, and manage your records.
          </p>
          <button className="si-google" disabled={status === "loading"}
            onClick={() => signIn("google", { callbackUrl: next })}>
            <GoogleG />
            Continue with Google
          </button>
          <p className="si-fine">
            More sign-in options, Apple and email, are coming. By
            continuing you agree that records prove custody, integrity,
            coherence, and priority, never authorship.
          </p>
        </div>
        <a className="si-back" href={SITE_URL}>← Back to the site</a>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignIn />
    </Suspense>
  );
}
