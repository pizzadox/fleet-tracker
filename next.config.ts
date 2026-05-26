import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Note: Use `npx next build --webpack` for production builds.
  // Turbopack (default in Next.js 16) has a known bug with standalone output
  // where SSR generates chunk references that don't exist on disk,
  // causing ChunkLoadError at runtime.
};

export default nextConfig;
