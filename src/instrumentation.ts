/**
 * Next.js Instrumentation Hook
 * Runs once when the Next.js server starts.
 *
 * Ensures:
 * 1. Caddyfile is accessible for Caddy reverse proxy
 * 2. Production database path is correctly resolved
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const fs = await import('fs')
      const path = await import('path')

      // ── Caddyfile ──
      // Copy Caddyfile to parent directory if not present (for container deployments)
      const possibleSources = [
        path.join(process.cwd(), 'Caddyfile'),
        path.join(__dirname, '..', '..', 'Caddyfile'),
      ]

      const possibleTargets = [
        path.join(process.cwd(), '..', 'Caddyfile'),  // /app/Caddyfile
      ]

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
        for (const target of possibleTargets) {
          try {
            if (!fs.existsSync(target)) {
              fs.writeFileSync(target, fs.readFileSync(sourcePath, 'utf-8'), 'utf-8')
              console.log(`[Instrumentation] Caddyfile copied to ${target}`)
            }
          } catch (err) {
            console.warn(`[Instrumentation] Could not copy Caddyfile to ${target}:`, (err as Error).message)
          }
        }
      }

      // ── Production Database ──
      const currentDbUrl = process.env.DATABASE_URL
      if (currentDbUrl) {
        const dbFilePath = currentDbUrl.replace(/^file:/, '')
        const absoluteDbPath = path.isAbsolute(dbFilePath)
          ? dbFilePath
          : path.resolve(process.cwd(), dbFilePath)

        if (fs.existsSync(absoluteDbPath)) {
          console.log(`[Instrumentation] Database found at: ${absoluteDbPath}`)
        } else {
          console.warn(`[Instrumentation] Database not found at: ${absoluteDbUrl}`)
          console.warn(`[Instrumentation] DATABASE_URL=${currentDbUrl}`)

          // Try to find production.db in alternative locations
          const altPaths = [
            path.join(process.cwd(), 'db', 'production.db'),
            path.join(__dirname, '..', '..', 'db', 'production.db'),
            path.join(process.cwd(), '..', 'db', 'production.db'),
          ]

          for (const altPath of altPaths) {
            if (fs.existsSync(altPath)) {
              const dbDir = path.join(process.cwd(), 'db')
              if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true })
              }
              const targetPath = path.join(dbDir, 'production.db')
              fs.copyFileSync(altPath, targetPath)
              console.log(`[Instrumentation] Production DB copied from ${altPath} to ${targetPath}`)
              break
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Instrumentation] Setup error:', (err as Error).message)
    }
  }
}
