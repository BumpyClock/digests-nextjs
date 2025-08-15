import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';
import bundleAnalyzer from '@next/bundle-analyzer';

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
    eslint: {
        dirs: ['app', 'components', 'lib', 'hooks', 'services', 'store', 'utils', 'types', 'contexts', 'config'],
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


    return config;
  },
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
};


// Configure bundle analyzer
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Configure with bundle analyzer
const config = withBundleAnalyzer(withMDX(nextConfig));

export default config;