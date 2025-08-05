import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';
import { withSentryConfig } from '@sentry/nextjs';

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    typescript: {
        ignoreBuildErrors: false,
    },
    transpilePackages: ["next-mdx-remote"],
    images: {
        remotePatterns: [
            {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  experimental: {
    reactCompiler: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: http: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https: http: wss: ws:",
              "media-src 'self' blob:",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-src 'self' https://vercel.live",
              "manifest-src 'self'",
              "worker-src 'self' blob:",
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
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
            value: 'geolocation=(), camera=(), microphone=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.lottie$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/lottie/[name].[hash][ext]',
      },
    });

    // Generate source maps for Sentry
    if (!isServer) {
      config.devtool = 'source-map';
    }

    return config;
  },
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
  // Sentry configuration for source maps
  productionBrowserSourceMaps: true,
};

// Wrap the config with Sentry
const sentryWebpackPluginOptions = {
  // Your Sentry auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,
  
  // Your Sentry org and project
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Additional options for the Sentry webpack plugin
  silent: true, // Suppresses all logs
  
  // Upload source maps to Sentry
  include: ".next",
  ignore: ["node_modules"],
  
  // Automatically release tracking
  release: {
    create: true,
    finalize: true,
    // Use environment variable or generate from git
    name: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
  },

  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  hideSourceMaps: false,
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
};

// Conditionally apply Sentry config in production
const config = process.env.NODE_ENV === 'production' && process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(withMDX(nextConfig), sentryWebpackPluginOptions)
  : withMDX(nextConfig);

export default config;