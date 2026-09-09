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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Providers>{children}<Toaster richColors position="bottom-center" /></Providers></body>
    </html>
  );
}
