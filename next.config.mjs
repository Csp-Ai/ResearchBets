/** @type {import('next').NextConfig} */
const nextConfig = {
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
