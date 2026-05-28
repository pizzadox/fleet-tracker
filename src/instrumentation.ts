/**
 * Next.js Instrumentation Hook
 * Runs once when the Next.js server starts.
 *
 * Copies Caddyfile to the project root so Caddy can find it.
 * In container deployments (chatglm.site), the standalone build
 * output lands in /app/next-service-dist/, but Caddy runs from
 * /app/ and looks for /app/Caddyfile. This ensures it exists.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const fs = await import('fs')
      const path = await import('path')

      // Determine the Caddyfile source path (inside the standalone output)
      const standaloneDir = path.join(process.cwd(), '.next', 'standalone') 
      const possibleSources = [
        path.join(process.cwd(), 'Caddyfile'),
        path.join(standaloneDir, 'Caddyfile'),
        path.join(__dirname, '..', '..', 'Caddyfile'),
        path.join(__dirname, 'Caddyfile'),
      ]

      // Target: one directory up from the standalone output (i.e., /app/)
      const possibleTargets = [
        path.join(process.cwd(), '..', 'Caddyfile'),  // /app/Caddyfile
        path.join(process.cwd(), 'Caddyfile'),          // /app/next-service-dist/Caddyfile
      ]

      // Find the source Caddyfile
      let sourcePath: string | null = null
      for (const p of possibleSources) {
        try {
          if (fs.existsSync(p)) {
            sourcePath = p
            break
          }
        } catch { /* skip */ }
      }

      if (sourcePath) {
        const content = fs.readFileSync(sourcePath, 'utf-8')
        for (const target of possibleTargets) {
          try {
            if (!fs.existsSync(target)) {
              fs.writeFileSync(target, content, 'utf-8')
              console.log(`[Instrumentation] Caddyfile copied to ${target}`)
            }
          } catch (err) {
            // Permission denied or other error — non-critical
            console.warn(`[Instrumentation] Could not copy Caddyfile to ${target}:`, (err as Error).message)
          }
        }
      }
    } catch (err) {
      console.warn('[Instrumentation] Caddyfile setup error:', (err as Error).message)
    }
  }
}
