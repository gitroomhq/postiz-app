// @ts-check
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    proxyTimeout: 90_000,
  },
  reactStrictMode: false,
  transpilePackages: ['crypto-hash'],
  // Enable production sourcemaps for Sentry
  productionBrowserSourceMaps: true,
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
  
  // Sourcemap configuration
  sourcemaps: {
    disable: false, // Enable sourcemap upload (default: false)
    assets: ["**/*.js", "**/*.js.map"], // Files to upload 
    ignore: ["**/node_modules/**"], // Exclude node_modules
    deleteSourcemapsAfterUpload: true, // Delete sourcemaps after upload for security
  },

  // Release configuration (optional but recommended)
  release: {
    create: true, // Create release in Sentry
    finalize: true, // Finalize release after build
  },

  // Additional configuration
  telemetry: false,
  silent: process.env.NODE_ENV === 'production', // Reduce build logs in production
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  
  // Error handling for CI/CD
  errorHandler: (error) => {
    console.warn("Sentry build error occurred:", error);
    // Don't fail the build if Sentry upload fails
    // Remove the next line if you want builds to fail on Sentry errors
    return;
  },
});
