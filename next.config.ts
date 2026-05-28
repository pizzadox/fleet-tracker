import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────
// CRITICAL: Force Webpack instead of Turbopack for production.
//
// Next.js 16 defaults to Turbopack which has a known bug with
// `output: "standalone"`: SSR generates chunk references that
// don't exist on disk, causing ChunkLoadError at runtime.
//
// This patch runs when next.config.ts is loaded (before any
// build starts), regardless of how `next build` is invoked.
// ─────────────────────────────────────────────────────────────
(function forceWebpackBundler() {
  try {
    const bundlerPath = path.join(
      process.cwd(), "node_modules", "next", "dist", "lib", "bundler.js"
    );

    if (!fs.existsSync(bundlerPath)) {
      // Try relative to this file (for monorepo / custom layouts)
      const altPath = path.join(
        __dirname, "node_modules", "next", "dist", "lib", "bundler.js"
      );
      if (!fs.existsSync(altPath)) {
        console.warn("[next.config] bundler.js not found, skipping webpack patch");
        return;
      }
    }

    const content = fs.readFileSync(bundlerPath, "utf8");

    // Check if already patched
    if (content.includes("Force Webpack instead of Turbopack")) {
      console.log("[next.config] Bundler already patched to use Webpack");
      return;
    }

    // Patch: when no bundler flag is set, default to Webpack (1) instead of Turbopack (0)
    const original =
      /if \(bundlerFlags\.size === 0\) \{\s*\n\s*process\.env\.TURBOPACK\s*=\s*['"]auto['"]\s*;\s*\n\s*return\s*0\s*;/;

    if (original.test(content)) {
      const patched = content.replace(
        original,
        "if (bundlerFlags.size === 0) {\n    return 1;  // Force Webpack instead of Turbopack (patched in next.config.ts)"
      );
      fs.writeFileSync(bundlerPath, patched, "utf8");
      console.log("[next.config] Patched bundler to default to Webpack instead of Turbopack");
    } else {
      // Alternative pattern (might be already partially patched or different format)
      const altPattern = /if \(bundlerFlags\.size === 0\) \{[^}]*return\s+0\s*;/s;
      if (altPattern.test(content)) {
        const patched = content.replace(
          altPattern,
          "if (bundlerFlags.size === 0) {\n    return 1;  // Force Webpack instead of Turbopack (patched in next.config.ts)"
        );
        fs.writeFileSync(bundlerPath, patched, "utf8");
        console.log("[next.config] Patched bundler (alt pattern) to default to Webpack");
      } else {
        console.warn("[next.config] Could not find bundler patch target — Next.js may have been updated");
      }
    }
  } catch (err) {
    console.warn("[next.config] Failed to patch bundler:", (err as Error).message);
  }

  // Also set the environment variable as a fallback
  if (!process.env.IS_WEBPACK_TEST && !process.env.TURBOPACK) {
    process.env.IS_WEBPACK_TEST = "1";
    console.log("[next.config] Set IS_WEBPACK_TEST=1 environment variable");
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
