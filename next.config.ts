import type { NextConfig } from "next";

// Устанавливаем IS_WEBPACK_TEST до загрузки Next.js
// Это заставляет Next.js использовать Webpack вместо Turbopack
// (Turbopack имеет баг с output: "standalone" → ChunkLoadError)
if (!process.env.TURBOPACK && !process.env.IS_WEBPACK_TEST) {
  process.env.IS_WEBPACK_TEST = "1";
}

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
