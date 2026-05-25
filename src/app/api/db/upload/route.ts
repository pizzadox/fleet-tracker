import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DB_PATH = process.env.DATABASE_URL?.replace('file:', '') || path.join(process.cwd(), 'db', 'custom.db')
const BACKUPS_DIR = path.join(process.cwd(), 'backups')

// POST — загрузить внешний .db файл как бэкап
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
    }

    // Validate file extension
    if (!file.name.endsWith('.db')) {
      return NextResponse.json({ error: 'Допускаются только файлы .db' }, { status: 400 })
    }

    // Validate file size (max 500 MB)
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: 'Файл слишком большой (макс. 500 МБ)' }, { status: 400 })
    }

    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true })
    }

    // Save as backup with upload marker
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10)
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-')

    const originalName = file.name.replace(/\.db$/, '').replace(/[^a-zA-Zа-яА-ЯёЁ0-9_\-\s]/g, '').slice(0, 50)
    const filename = `backup_${dateStr}_${timeStr}_загружен_${originalName.replace(/\s+/g, '_')}.db`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadPath = path.join(BACKUPS_DIR, filename)

    fs.writeFileSync(uploadPath, buffer)

    const formatBytes = (b: number) => {
      if (b === 0) return '0 Б'
      const k = 1024
      const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
      const i = Math.floor(Math.log(b) / Math.log(k))
      return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    return NextResponse.json({
      success: true,
      backup: {
        filename,
        label: `Загружен: ${file.name}`,
        date: now.toISOString(),
        size: file.size,
        sizeFormatted: formatBytes(file.size),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
