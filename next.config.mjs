/** @type {import('next').NextConfig} */
const nextConfig = {
  // Backend calls go through the streaming route handler at
  // app/backend/[...path]/route.js (same-origin, no body-size cap).
  // Real .logicx uploads are hundreds of MB and take a while to analyze,
  // so keep generous proxy limits for anything that still buffers.
  experimental: {
    proxyTimeout: 600_000,
  },
};

export default nextConfig;
