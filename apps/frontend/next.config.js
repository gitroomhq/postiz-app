// @ts-check
import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    proxyTimeout: 90_000,
    // Enable instrumentation for Sentry
    instrumentationHook: true,
  },
  reactStrictMode: false,
  transpilePackages: ['crypto-hash'],
  
  // Enable source maps for better Sentry debugging
  productionBrowserSourceMaps: true,
  
  // Webpack configuration to suppress Sentry/OpenTelemetry warnings
  webpack: (config, { isServer }) => {
    // Suppress OpenTelemetry warnings for dynamic imports
    config.ignoreWarnings = [
      {
        module: /node_modules\/@opentelemetry\/instrumentation/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      {
        module: /node_modules\/require-in-the-middle/,
        message: /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
    ];

    // For client-side builds, ignore server-side Sentry modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        os: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
  
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

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  
  // Upload source maps to Sentry
  widenClientFileUpload: true,
  
  // Hides source maps from generated client bundles
  hideSourceMaps: true,
  
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
  
  // Enable automatic instrumentation of Vercel Cron Monitors (if used)
  automaticVercelMonitors: true,
};

// Only wrap with Sentry if it's enabled
const shouldUseSentry = process.env.SENTRY_ENABLED === 'true' && process.env.SENTRY_DSN;

export default shouldUseSentry 
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
