import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "SessionSeal — prove your music is yours",
  description:
    "Seal a master, stems, and session into a tamper-evident signed record; link any future copy back to it.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
