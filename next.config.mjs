/** @type {import('next').NextConfig} */
const nextConfig = {
  // Backend calls go through the streaming route handler at
  // app/backend/[...path]/route.js (same-origin, no body-size cap).
  // Real .logicx uploads are hundreds of MB and take a while to analyze,
  // so keep generous proxy limits for anything that still buffers.
  experimental: {
    proxyTimeout: 600_000,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The enforcing half of the noindex story. The <meta> tag in the
          // root layout only reaches crawlers that execute a full page
          // render; this header rides on every response, including the
          // /signin redirects that middleware.js hands anonymous visitors.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },

          // A /s/:token URL is a bearer credential. Without this, clicking
          // any outbound link from a share page would hand the destination
          // the full tokenised URL in the Referer header.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Stops a browser from MIME-sniffing an uploaded file into
          // something executable.
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
