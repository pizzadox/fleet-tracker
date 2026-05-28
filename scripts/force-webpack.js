/**
 * Force Next.js to use Webpack instead of Turbopack for production builds.
 *
 * Next.js 16 defaults to Turbopack, which has a known bug with
 * `output: "standalone"` causing ChunkLoadError at runtime.
 *
 * This script patches the bundler selection in node_modules/next/dist/lib/bundler.js
 * to default to Webpack when no explicit bundler flag is provided.
 *
 * Runs automatically via `postinstall` hook.
 */

const fs = require('fs')
const path = require('path')

function patchBundler() {
  const bundlerPath = path.join(
    __dirname, '..', 'node_modules', 'next', 'dist', 'lib', 'bundler.js'
  )

  if (!fs.existsSync(bundlerPath)) {
    console.log('[force-webpack] bundler.js not found, skipping patch')
    return
  }

  let content = fs.readFileSync(bundlerPath, 'utf8')

  // Check if already patched
  if (content.includes('Force Webpack instead of Turbopack')) {
    console.log('[force-webpack] already patched, skipping')
    return
  }

  // Replace: if (bundlerFlags.size === 0) { process.env.TURBOPACK = 'auto'; return 0; }
  // With:    if (bundlerFlags.size === 0) { return 1; }  // 1 = Bundler.Webpack
  const original = /if \(bundlerFlags\.size === 0\) \{\s*process\.env\.TURBOPACK\s*=\s*['"]auto['"]\s*;\s*return\s*0\s*;/
  const patched = "if (bundlerFlags.size === 0) {\n    return 1;  // Force Webpack instead of Turbopack (patched by force-webpack.js)"

  if (original.test(content)) {
    content = content.replace(original, patched)
    fs.writeFileSync(bundlerPath, content, 'utf8')
    console.log('✅ [force-webpack] Patched Next.js to default to Webpack instead of Turbopack')
  } else {
    console.warn('⚠️ [force-webpack] Could not find expected pattern in bundler.js — Next.js may have been updated')
    console.warn('   You may need to update this patch script or use IS_WEBPACK_TEST=1 env var')
  }
}

try {
  patchBundler()
} catch (err) {
  console.warn('⚠️ [force-webpack] Error:', err.message)
}
