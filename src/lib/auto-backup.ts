/**
 * Автоматическое резервное копирование БД
 *
 * — Создаёт бэкап каждые 30 минут
 * — Удаляет бэкапы старше 7 дней
 * — Запускается один раз при старте сервера (через instrumentation.ts)
 */

import fs from 'fs'
import path from 'path'

const BACKUP_INTERVAL_MS = 30 * 60 * 1000 // 30 минут
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 дней
const BACKUPS_DIR = path.join(process.cwd(), 'backups')
const AUTO_LABEL = 'авто'

let timer: ReturnType<typeof setInterval> | null = null

/** Убедиться, что папка backups существует */
function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true })
  }
}

/** Получить путь к текущей БД из DATABASE_URL */
function getDbPath(): string | null {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return null
  const dbPath = dbUrl.replace(/^file:/, '')
  const absPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath)
  return fs.existsSync(absPath) ? absPath : null
}

/**
 * Создать автобэкап.
 * Имя файла: backup_2026-05-28_14-30-00_авто.db
 */
export function createAutoBackup(): { success: boolean; filename?: string; error?: string } {
  const dbPath = getDbPath()
  if (!dbPath) {
    return { success: false, error: 'База данных не найдена' }
  }

  ensureBackupsDir()

  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-')
  const filename = `backup_${dateStr}_${timeStr}_${AUTO_LABEL}.db`
  const backupPath = path.join(BACKUPS_DIR, filename)

  try {
    fs.copyFileSync(dbPath, backupPath)
    const size = fs.statSync(backupPath).size
    console.log(`[AutoBackup] Создан: ${filename} (${(size / 1024).toFixed(1)} КБ)`)
    return { success: true, filename }
  } catch (err: any) {
    console.error('[AutoBackup] Ошибка создания:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Удалить бэкапы старше MAX_AGE_MS (7 дней).
 * Удаляются только файлы с меткой «авто» (чтобы не трогать ручные бэкапы).
 * Дата определяется из имени файла (надёжнее, чем mtime — cp сбрасывает mtime).
 */
export function cleanupOldBackups(): { deleted: number; kept: number } {
  ensureBackupsDir()

  const nowMs = Date.now()
  const files = fs.readdirSync(BACKUPS_DIR).filter(
    f => f.startsWith('backup_') && f.endsWith('.db')
  )

  let deleted = 0
  let kept = 0

  for (const file of files) {
    const filePath = path.join(BACKUPS_DIR, file)
    // Только автобэкапы (суффикс _авто.db)
    const isAuto = file.endsWith('_авто.db')
    if (!isAuto) {
      kept++
      continue
    }

    // Парсим дату из имени файла
    const match = file.match(/^backup_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/)
    if (!match) {
      kept++
      continue
    }

    const backupDate = new Date(`${match[1]}T${match[2].replace(/-/g, ':')}`).getTime()
    const age = nowMs - backupDate

    if (age > MAX_AGE_MS) {
      try {
        fs.unlinkSync(filePath)
        deleted++
        console.log(`[AutoBackup] Удалён старый: ${file}`)
      } catch {
        // Файл мог быть удалён другим процессом — пропускаем
      }
    } else {
      kept++
    }
  }

  if (deleted > 0) {
    console.log(`[AutoBackup] Очистка: удалено ${deleted}, оставлено ${kept}`)
  }

  return { deleted, kept }
}

/**
 * Запустить автобэкап: каждые 30 мин — бэкап + очистка старых.
 * Вызывается один раз из instrumentation.ts.
 */
export function startAutoBackup(): void {
  if (timer) {
    console.log('[AutoBackup] Уже запущен, пропуск')
    return
  }

  console.log(`[AutoBackup] Запуск: интервал ${BACKUP_INTERVAL_MS / 60000} мин, хранение ${MAX_AGE_MS / 86400000} дней`)

  // Сразу при старте — очистка старых
  try {
    cleanupOldBackups()
  } catch (err: any) {
    console.warn('[AutoBackup] Ошибка очистки при старте:', err.message)
  }

  // Первый бэкап — через 1 минуту после старта (чтобы сервер успел инициализироваться)
  setTimeout(() => {
    try {
      createAutoBackup()
      cleanupOldBackups()
    } catch (err: any) {
      console.warn('[AutoBackup] Ошибка первого бэкапа:', err.message)
    }
  }, 60_000)

  // Периодический бэкап каждые 30 минут
  timer = setInterval(() => {
    try {
      createAutoBackup()
      cleanupOldBackups()
    } catch (err: any) {
      console.warn('[AutoBackup] Ошибка периодического бэкапа:', err.message)
    }
  }, BACKUP_INTERVAL_MS)

  // Не блокируем завершение процесса
  if (timer.unref) {
    timer.unref()
  }
}

/** Остановить автобэкап (для тестов) */
export function stopAutoBackup(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
    console.log('[AutoBackup] Остановлен')
  }
}
