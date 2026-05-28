/**
 * Next.js Instrumentation Hook
 * Runs once when the Next.js server starts.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const fs = await import('fs')
      const path = await import('path')

      // Copy Caddyfile to parent directory for Caddy (container deployments)
      const caddySource = path.join(process.cwd(), 'Caddyfile')
      const caddyTarget = path.join(process.cwd(), '..', 'Caddyfile')

      if (fs.existsSync(caddySource) && !fs.existsSync(caddyTarget)) {
        try {
          fs.writeFileSync(caddyTarget, fs.readFileSync(caddySource, 'utf-8'), 'utf-8')
          console.log('[Instrumentation] Caddyfile copied to', caddyTarget)
        } catch (err) {
          console.warn('[Instrumentation] Could not copy Caddyfile:', (err as Error).message)
        }
      }

      // Verify database
      const dbUrl = process.env.DATABASE_URL
      if (dbUrl) {
        const dbPath = dbUrl.replace(/^file:/, '')
        const absPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath)
        if (fs.existsSync(absPath)) {
          console.log('[Instrumentation] Database found:', absPath)
        } else {
          console.warn('[Instrumentation] Database NOT found:', absPath)
        }
      }
    } catch (err) {
      console.warn('[Instrumentation] Setup error:', (err as Error).message)
    }
  }
}
