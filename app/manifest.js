// Web app manifest. Artists keep /seal open for long uploads and pin it to a
// phone home screen, so this is about installability, not discovery.
// Icons reuse the existing app/icon.svg and app/apple-icon.png conventions.
export default function manifest() {
  return {
    name: "SessionSeal",
    short_name: "SessionSeal",
    description:
      "Seal a master, stems, and session into a tamper-evident signed record.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0d",
    theme_color: "#0b0b0d",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
