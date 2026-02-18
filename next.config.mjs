/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Keep remotePatterns explicit to reduce attack surface and DoS risk via /_next/image on self-hosted deployments.
    // TODO(security): add tightly scoped remotePatterns only for required hosts, e.g.:
    // remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com', pathname: '/images/**' }]
  }
};

export default nextConfig;
