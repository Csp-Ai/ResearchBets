/** @type {import('next').NextConfig} */
// Opt-in multi-zone mount for the Bender integration preview. Never change
// the existing standalone production routing just because a preview builds.
// Production cutover must set RESEARCHBETS_BENDER_MOUNT=1 explicitly.
const benderMount = process.env.RESEARCHBETS_BENDER_MOUNT === '1'
  || process.env.VERCEL_GIT_COMMIT_REF === 'feat/v12-unified-sports-entry-20261121';

const nextConfig = {
  ...(benderMount ? { basePath: '/research-bets' } : {}),
  reactStrictMode: true,
  ...(process.env.NODE_ENV === 'development'
    ? {
        allowedDevOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000']
      }
    : {}),

  images: {
    // Keep remotePatterns explicit to reduce attack surface and DoS risk via /_next/image on self-hosted deployments.
    // TODO(security): add tightly scoped remotePatterns only for required hosts, e.g.:
    // remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com', pathname: '/images/**' }]
  },

};

export default nextConfig;
