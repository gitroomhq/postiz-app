// @ts-check

const cspHeader = `
default-src 'self' chrome-extension:;
script-src 'self' 'unsafe-eval' 'unsafe-inline' chrome-extension:;
style-src 'self' 'unsafe-inline' chrome-extension:;
img-src 'self' blob: data: chrome-extension:;
font-src 'self' chrome-extension:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    proxyTimeout: 90_000,
  },
  reactStrictMode: false,
  transpilePackages: ['crypto-hash'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/api/uploads/:path*',
        destination:
          process.env.STORAGE_PROVIDER === 'local' ? '/uploads/:path*' : '/404',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination:
          process.env.STORAGE_PROVIDER === 'local'
            ? '/api/uploads/:path*'
            : '/404',
      },
    ];
  },
};

export default nextConfig;
