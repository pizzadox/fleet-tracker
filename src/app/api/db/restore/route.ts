import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'db', 'custom.db')
const BACKUPS_DIR = path.join(process.cwd(), 'backups')

// POST — восстановить из бэкапа
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const filename = body.filename

    if (!filename) {
      return NextResponse.json({ error: 'Не указано имя файла' }, { status: 400 })
    }

    // Security: only allow backup_*.db files
    if (!filename.match(/^backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}.*\.db$/)) {
      return NextResponse.json({ error: 'Недопустимое имя файла' }, { status: 400 })
    }

    const backupPath = path.join(BACKUPS_DIR, filename)
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ error: 'Файл бэкапа не найден' }, { status: 404 })
    }

    // Create an auto-backup before restore
    if (fs.existsSync(DB_PATH)) {
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10)
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-')

      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true })
      }

      const autoBackupName = `backup_${dateStr}_${timeStr}_перед_восстановлением.db`
      fs.copyFileSync(DB_PATH, path.join(BACKUPS_DIR, autoBackupName))
    }

    // Restore: copy backup to DB path
    fs.copyFileSync(backupPath, DB_PATH)

    return NextResponse.json({
      success: true,
      message: 'База данных восстановлена. Рекомендуется перезагрузить приложение.',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
