import "./globals.css";
import Providers from "./providers";
import { Toaster } from "@/components/ui/sonner";

const TITLE = "SessionSeal: prove your music is yours";
const DESCRIPTION =
  "Seal a master, stems, and session into a tamper-evident signed record, and link any future copy back to it.";

// metadataBase makes Next emit ABSOLUTE og:image URLs (WhatsApp mobile and
// most scrapers reject relative ones). The image itself comes from the
// app/opengraph-image.png file convention, which supplies width/height/type.
export const metadata = {
  metadataBase: new URL("https://app.sessionseal.com"),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "SessionSeal",
  // Every route here sits behind the session gate in middleware.js, so there
  // is nothing on this host a search engine should hold. Marketing pages and
  // their rankings live on www.sessionseal.com.
  //
  // No canonical to that marketing site: pointing a noindex page at a
  // canonical elsewhere sends contradictory signals (Google treats the pair
  // as ambiguous). A plain noindex says the one thing we mean.
  //
  // The openGraph/twitter tags below deliberately stay. They drive the link
  // preview when an artist pastes a share link into WhatsApp or Slack, which
  // has nothing to do with indexing.
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "SessionSeal",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// Next 15 wants viewport and themeColor out of the metadata export.
// themeColor matches the manifest so an installed window doesn't flash white.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0d",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Providers>{children}<Toaster richColors position="bottom-center" /></Providers></body>
    </html>
  );
}
