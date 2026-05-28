/**
 * Next.js Instrumentation Hook
 * Runs once when the Next.js server starts.
 *
 * In container deployments (chatglm.site), the standalone build
 * output lands in /app/next-service-dist/. This hook ensures:
 * 1. Caddyfile is accessible for Caddy reverse proxy
 * 2. Production database path is correctly resolved
 * 3. .env.production is available in the deployment directory
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const fs = await import('fs')
      const path = await import('path')

      // ── Caddyfile ──
      const standaloneDir = path.join(process.cwd(), '.next', 'standalone')
      const possibleSources = [
        path.join(process.cwd(), 'Caddyfile'),
        path.join(standaloneDir, 'Caddyfile'),
        path.join(__dirname, '..', '..', 'Caddyfile'),
        path.join(__dirname, 'Caddyfile'),
      ]

      const possibleTargets = [
        path.join(process.cwd(), '..', 'Caddyfile'),  // /app/Caddyfile
        path.join(process.cwd(), 'Caddyfile'),          // /app/next-service-dist/Caddyfile
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
        const content = fs.readFileSync(sourcePath, 'utf-8')
        for (const target of possibleTargets) {
          try {
            if (!fs.existsSync(target)) {
              fs.writeFileSync(target, content, 'utf-8')
              console.log(`[Instrumentation] Caddyfile copied to ${target}`)
            }
          } catch (err) {
            console.warn(`[Instrumentation] Could not copy Caddyfile to ${target}:`, (err as Error).message)
          }
        }
      }

      // ── Production Database ──
      // Ensure DATABASE_URL points to a valid database file
      const currentDbUrl = process.env.DATABASE_URL
      if (currentDbUrl) {
        // Extract file path from SQLite URL (file:/path/to/db or file:./relative/path)
        const dbFilePath = currentDbUrl.replace(/^file:/, '')
        const absoluteDbPath = path.isAbsolute(dbFilePath)
          ? dbFilePath
          : path.resolve(process.cwd(), dbFilePath)

        if (!fs.existsSync(absoluteDbPath)) {
          console.warn(`[Instrumentation] Database file not found at: ${absoluteDbPath}`)
          console.warn(`[Instrumentation] DATABASE_URL=${currentDbUrl}`)

          // Try to find the production database in alternative locations
          const altPaths = [
            path.join(process.cwd(), 'db', 'production.db'),
            path.join(__dirname, '..', '..', 'db', 'production.db'),
            path.join(process.cwd(), '..', 'db', 'production.db'),
          ]

          for (const altPath of altPaths) {
            if (fs.existsSync(altPath)) {
              // Ensure db directory exists in CWD
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
        } else {
          console.log(`[Instrumentation] Database found at: ${absoluteDbPath}`)
        }
      }

      // ── .env.production ──
      // Copy .env.production to CWD if it doesn't exist (for container deployments)
      const envProdTarget = path.join(process.cwd(), '.env.production')
      if (!fs.existsSync(envProdTarget)) {
        const envSources = [
          path.join(__dirname, '..', '..', '.env.production'),
          path.join(process.cwd(), '..', '.env.production'),
        ]
        for (const src of envSources) {
          if (fs.existsSync(src)) {
            try {
              fs.copyFileSync(src, envProdTarget)
              console.log(`[Instrumentation] .env.production copied to ${envProdTarget}`)
            } catch (err) {
              console.warn(`[Instrumentation] Could not copy .env.production:`, (err as Error).message)
            }
            break
          }
        }
      }
    } catch (err) {
      console.warn('[Instrumentation] Setup error:', (err as Error).message)
    }
  }
}
