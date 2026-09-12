// The share page itself is a client component and cannot export metadata, so
// the noindex lives here.
//
// A /s/:token URL is a bearer credential: whoever holds it can hear the
// track. It must never reach a search index, an AI crawler, or the Referer
// header of an outbound click (that last one is handled by the
// Referrer-Policy in next.config.mjs).
export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function ShareLayout({ children }) {
  return children;
}
