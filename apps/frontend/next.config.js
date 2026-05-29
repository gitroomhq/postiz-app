// @ts-check
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    proxyTimeout: 90_000,
  },
  // Security and Document-Policy headers
  async headers() {
    // CSP: static policy (no per-request nonce — nonce requires middleware refactor).
    // img-src includes *.supabase.co for stored avatars/media, *.scdn.cc for TikTok CDN
    // thumbnails served via our proxy-image route (the proxy validates host; these
    // domains appear in the browser as the origin of the proxied response).
    // media-src includes commondatastorage.googleapis.com for showcase sample videos.
    // Dev React/Next (webpack eval-source-map + Turbopack HMR) require eval() for
    // hydration and debugging. Prod CSP stays strict — React never evals in prod.
    const scriptSrc =
      process.env.NODE_ENV === 'production'
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.scdn.cc https://picsum.photos",
      "media-src 'self' https://commondatastorage.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // Dev points at a local Supabase stack on 127.0.0.1:54321 — allow it (and ws HMR).
      // https://*.sentry.io covers the Sentry ingest endpoint for client-side
      // error reporting, tracing, and session replay.
      process.env.NODE_ENV === 'production'
        ? "connect-src 'self' https://*.supabase.co https://*.sentry.io"
        : "connect-src 'self' https://*.supabase.co https://*.sentry.io http://127.0.0.1:54321 http://localhost:54321 ws://127.0.0.1:54321 ws://localhost:4200",
      // Sentry Session Replay compresses payloads in a Web Worker loaded from a blob: URL.
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Document-Policy',
            value: 'js-profiling',
          },
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  reactStrictMode: false,
  transpilePackages: ['crypto-hash'],
  // Browser sourcemaps disabled in production — prevents source exposure to end-users.
  // Sentry still receives server-side maps via the Sentry webpack plugin (deleteSourcemapsAfterUpload: true).
  productionBrowserSourceMaps: false,

  // Custom webpack config to ensure sourcemaps are generated properly
  webpack: (config, { buildId, dev, isServer, defaultLoaders }) => {
    // Enable sourcemaps for both client and server in production
    if (!dev) {
      config.devtool = isServer ? 'source-map' : 'hidden-source-map';
    }

    return config;
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

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Sourcemap configuration optimized for monorepo
  sourcemaps: {
    disable: false,
    // More comprehensive asset patterns for monorepo
    assets: [
      '.next/static/**/*.js',
      '.next/static/**/*.js.map',
      '.next/server/**/*.js',
      '.next/server/**/*.js.map',
    ],
    ignore: [
      '**/node_modules/**',
      '**/*hot-update*',
      '**/_buildManifest.js',
      '**/_ssgManifest.js',
      '**/*.test.js',
      '**/*.spec.js',
    ],
    deleteSourcemapsAfterUpload: true,
  },

  // Release configuration
  release: {
    create: true,
    finalize: true,
    // Use git commit hash for releases in monorepo
    name:
      process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || undefined,
  },

  // NextJS specific optimizations for monorepo
  widenClientFileUpload: true,

  // Additional configuration
  telemetry: false,
  silent: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',

  // Error handling for CI/CD
  errorHandler: (error) => {
    console.warn('Sentry build error occurred:', error.message);
    console.warn(
      'This might be due to missing Sentry environment variables or network issues'
    );
    // Don't fail the build if Sentry upload fails in monorepo context
    return;
  },
});
