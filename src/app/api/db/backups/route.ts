import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'db', 'custom.db')
const BACKUPS_DIR = path.join(process.cwd(), 'backups')

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true })
  }
}

interface BackupMeta {
  filename: string
  label: string
  date: string
  size: number
  sizeFormatted: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Б'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function parseBackupFilename(filename: string): { date: string; label: string } | null {
  const match = filename.match(/^backup_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})(?:_(.+))?\.db$/)
  if (!match) return null
  const date = `${match[1]}T${match[2].replace(/-/g, ':')}`
  const label = match[3] ? match[3].replace(/_/g, ' ') : ''
  return { date, label }
}

function getBackupMeta(filename: string): BackupMeta | null {
  const parsed = parseBackupFilename(filename)
  if (!parsed) return null
  const filePath = path.join(BACKUPS_DIR, filename)
  try {
    const stats = fs.statSync(filePath)
    return {
      filename,
      label: parsed.label,
      date: parsed.date,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
    }
  } catch {
    return null
  }
}

// GET — список бэкапов
export async function GET() {
  try {
    ensureBackupsDir()
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
      .sort()
      .reverse()

    const backups: BackupMeta[] = []
    for (const f of files) {
      const meta = getBackupMeta(f)
      if (meta) backups.push(meta)
    }

    let dbSize = 0
    let dbExists = false
    try {
      if (fs.existsSync(DB_PATH)) {
        dbExists = true
        dbSize = fs.statSync(DB_PATH).size
      }
    } catch {}

    return NextResponse.json({
      backups,
      dbPath: path.basename(DB_PATH),
      dbExists,
      dbSize,
      dbSizeFormatted: formatBytes(dbSize),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — создать бэкап
export async function POST(request: NextRequest) {
  try {
    ensureBackupsDir()

    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ error: 'Файл базы данных не найден' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const customLabel = (body.label || '').trim().replace(/[^a-zA-Zа-яА-ЯёЁ0-9_\-\s]/g, '').slice(0, 50)

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-')

    let filename = `backup_${dateStr}_${timeStr}`
    if (customLabel) {
      filename += `_${customLabel.replace(/\s+/g, '_')}`
    }
    filename += '.db'

    const backupPath = path.join(BACKUPS_DIR, filename)

    fs.copyFileSync(DB_PATH, backupPath)

    const meta = getBackupMeta(filename)

    return NextResponse.json({
      success: true,
      backup: meta,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — удалить бэкап
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')

    if (!filename) {
      return NextResponse.json({ error: 'Не указано имя файла' }, { status: 400 })
    }

    // Security: only allow backup_*.db files
    if (!filename.match(/^backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}.*\.db$/)) {
      return NextResponse.json({ error: 'Недопустимое имя файла' }, { status: 400 })
    }

    const backupPath = path.join(BACKUPS_DIR, filename)
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ error: 'Бэкап не найден' }, { status: 404 })
    }

    fs.unlinkSync(backupPath)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
