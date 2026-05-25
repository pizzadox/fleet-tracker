import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const BACKUPS_DIR = path.join(process.cwd(), 'backups')

// GET — скачать файл бэкапа
export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(backupPath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
