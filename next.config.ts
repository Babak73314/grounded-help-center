import type { NextConfig } from 'next';

/**
 * The help center is a fully static export: every page is pre-rendered to
 * HTML at build time. The only dynamic part, the assistant, is a separate API
 * (`backend/`), so nothing here may depend on a request (no middleware, no
 * runtime APIs).
 */
const nextConfig: NextConfig = {
  output: 'export',
  // `/en/articles/x/` is written as `/en/articles/x/index.html`, which is what a
  // static host (S3 + CloudFront, or the local server) serves without a rewrite.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
