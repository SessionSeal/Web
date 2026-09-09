import "./globals.css";
import Providers from "./providers";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "SessionSeal — prove your music is yours",
  description:
    "Seal a master, stems, and session into a tamper-evident signed record; link any future copy back to it.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Providers>{children}<Toaster richColors position="bottom-center" /></Providers></body>
    </html>
  );
}
