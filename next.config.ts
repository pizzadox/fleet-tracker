import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // УБРАН output: "standalone" — вызывает ChunkLoadError и 500 на статике
  // Turbopack + standalone = битые чанки; стандартный next start работает надёжно
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
