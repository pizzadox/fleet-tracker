import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────
// CRITICAL: Force Webpack instead of Turbopack.
// Next.js 16 defaults to Turbopack which has a bug with
// `output: "standalone"` causing ChunkLoadError at runtime.
// This patch runs when next.config.ts is loaded, before any build.
// ─────────────────────────────────────────────────────────────
(function forceWebpackBundler() {
  try {
    const candidates = [
      path.join(process.cwd(), "node_modules", "next", "dist", "lib", "bundler.js"),
      path.join(__dirname, "node_modules", "next", "dist", "lib", "bundler.js"),
    ];

    let bundlerPath: string | null = null;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        bundlerPath = p;
        break;
      }
    }

    if (!bundlerPath) {
      console.warn("[next.config] bundler.js not found, skipping webpack patch");
      return;
    }

    const content = fs.readFileSync(bundlerPath, "utf8");

    if (content.includes("Force Webpack instead of Turbopack")) {
      console.log("[next.config] Bundler already patched to use Webpack");
      return;
    }

    // Pattern: when no bundler flag is set, default to Webpack (1) instead of Turbopack (0)
    const pattern = /if \(bundlerFlags\.size === 0\) \{[\s\S]*?return\s+0\s*;/;

    if (pattern.test(content)) {
      const patched = content.replace(
        pattern,
        "if (bundlerFlags.size === 0) {\n    return 1;  // Force Webpack instead of Turbopack (patched in next.config.ts)"
      );
      fs.writeFileSync(bundlerPath, patched, "utf8");
      console.log("[next.config] ✅ Patched bundler to default to Webpack instead of Turbopack");
    } else {
      console.warn("[next.config] Could not find bundler patch target");
    }
  } catch (err) {
    console.warn("[next.config] Failed to patch bundler:", (err as Error).message);
  }

  // Fallback: set env var
  if (!process.env.TURBOPACK) {
    process.env.IS_WEBPACK_TEST = "1";
  }
})();

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
