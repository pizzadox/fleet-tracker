import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// GET /api/trips/[id]/print — Print-friendly trip report (HTML)
// ═══════════════════════════════════════════════════════════════

const TRIP_STATUS_MAP: Record<string, string> = {
  planned: 'Запланирован',
  in_progress: 'В пути',
  completed: 'Завершён',
  cancelled: 'Отменён',
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const dt = new Date(d)
  return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDur(sec: number | null | undefined): string {
  if (sec == null) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h} ч ${m} мин`
  if (m > 0) return `${m} мин`
  return `${Math.floor(sec)} сек`
}

function fmtPrice(val: number | null | undefined): string {
  if (val == null) return '—'
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val)
}

function sensorRow(name: string, startVal: any, endVal: any, unit: string, changed: boolean): string {
  const fmt = (v: any, u: string) => {
    if (v == null) return '—'
    if (typeof v === 'boolean') return v ? 'Вкл' : 'Выкл'
    const n = Number(v)
    if (u === '°') return n.toFixed(6) + '°'
    if (u === 'км') return n.toFixed(0) + ' км'
    return n.toFixed(1) + (u ? ' ' + u : '')
  }
  const diff = (startVal != null && endVal != null && typeof startVal === 'number' && typeof endVal === 'number')
    ? (endVal - startVal) : null
  const diffStr = diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(unit === '°' ? 6 : 1)}${unit ? ' ' + unit : ''}` : '—'
  const cls = changed ? ' class="changed"' : ''
  return `<tr${cls}><td>${name}</td><td>${fmt(startVal, unit)}</td><td>${fmt(endVal, unit)}</td><td>${diffStr}</td></tr>`
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const trip = await db.trip.findUnique({
      where: { id },
      include: {
        equipment: { select: { id: true, name: true, registrationNum: true, brand: true, model: true } },
        crew: { select: { id: true, name: true, members: { select: { fullName: true, role: true, phone: true } } } },
      },
    })
    if (!trip) return new Response('Рейс не найден', { status: 404 })

    // Get tracker and sensor comparison data
    const tracker = await db.glonassTracker.findFirst({
      where: { equipmentId: trip.equipmentId },
      include: { sensorData: { orderBy: { timestamp: 'desc' } } },
    })

    // Parse snapshots
    let startSnap: Record<string, any> | null = null
    let endSnap: Record<string, any> | null = null
    try { if (trip.trackerSnapshotStart) startSnap = JSON.parse(trip.trackerSnapshotStart) } catch {}
    try { if (trip.trackerSnapshot) endSnap = JSON.parse(trip.trackerSnapshot) } catch {}

    const status = TRIP_STATUS_MAP[trip.status] || trip.status
    const crew = trip.crew
    const eq = trip.equipment
    const calcDist = (trip.mileageStart != null && trip.mileageEnd != null) ? trip.mileageEnd - trip.mileageStart : null
    const displayDist = trip.distance ?? calcDist

    // Build main comparison from snapshots
    const mainFields = [
      { key: 'fuelLevel', label: 'Уровень топлива', unit: 'л' },
      { key: 'mileage', label: 'Пробег', unit: 'км' },
      { key: 'engineTemp', label: 'Температура двигателя', unit: '°C' },
      { key: 'speed', label: 'Скорость', unit: 'км/ч' },
      { key: 'ignition', label: 'Зажигание', unit: '' },
      { key: 'latitude', label: 'Широта', unit: '°' },
      { key: 'longitude', label: 'Долгота', unit: '°' },
      { key: 'altitude', label: 'Высота', unit: 'м' },
    ]

    let mainCompRows = ''
    for (const f of mainFields) {
      const sv = startSnap?.[f.key]
      const ev = endSnap?.[f.key]
      if (sv != null || ev != null) {
        let changed = false
        if (typeof sv === 'boolean' && typeof ev === 'boolean') changed = sv !== ev
        else if (typeof sv === 'number' && typeof ev === 'number') changed = sv !== ev
        mainCompRows += sensorRow(f.label, sv, ev, f.unit, changed)
      }
    }

    // Build sensor comparison from sensor arrays
    let sensorCompRows = ''
    if (startSnap?.sensors && endSnap?.sensors) {
      const startMap = new Map<string, any>()
      const endMap = new Map<string, any>()
      for (const s of startSnap.sensors) startMap.set(s.name || s.type, s)
      for (const s of endSnap.sensors) endMap.set(s.name || s.type, s)
      for (const key of new Set([...startMap.keys(), ...endMap.keys()])) {
        const ss = startMap.get(key)
        const es = endMap.get(key)
        const sv = ss?.value != null ? Number(ss.value) : null
        const ev = es?.value != null ? Number(es.value) : null
        const unit = ss?.unit || es?.unit || ''
        const diff = (sv != null && ev != null) ? ev - sv : null
        const changed = diff !== null && diff !== 0
        const diffStr = diff != null ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}${unit ? ' ' + unit : ''}` : '—'
        const fmt = (v: any) => v != null ? `${Number(v).toFixed(1)}${unit ? ' ' + unit : ''}` : '—'
        const cls = changed ? ' class="changed"' : ''
        sensorCompRows += `<tr${cls}><td>${key}</td><td>${fmt(sv)}</td><td>${fmt(ev)}</td><td>${diffStr}</td></tr>`
      }
    }

    // Crew members
    let crewHtml = '—'
    if (crew?.members && crew.members.length > 0) {
      crewHtml = crew.members.map(m => `${m.fullName} (${m.role || '—'})${m.phone ? ' • ' + m.phone : ''}`).join('<br>')
    }

    // Map iframe placeholder
    const mapSection = trip.startDate ? `
      <div class="section">
        <h2>🗺 Трек на карте</h2>
        <div class="map-placeholder">
          <p>Карта трека доступна в приложении</p>
          <p class="detail">Начало: ${fmtDate(trip.startDate)} • Окончание: ${fmtDate(trip.endDate)}</p>
          ${displayDist != null ? `<p class="detail">Расстояние: ${displayDist.toFixed(1)} км</p>` : ''}
          ${startSnap?.latitude != null ? `<p class="detail">Старт: ${Number(startSnap.latitude).toFixed(6)}°, ${Number(startSnap.longitude).toFixed(6)}°</p>` : ''}
          ${endSnap?.latitude != null ? `<p class="detail">Финиш: ${Number(endSnap.latitude).toFixed(6)}°, ${Number(endSnap.longitude).toFixed(6)}°</p>` : ''}
        </div>
      </div>` : ''

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Отчёт по рейсу — ${trip.route}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.5; }
    .header { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header h1 { font-size: 18pt; color: #1e40af; }
    .header .status { padding: 4px 12px; border-radius: 6px; font-size: 10pt; font-weight: 600; }
    .status-completed { background: #dcfce7; color: #166534; }
    .status-in_progress { background: #dbeafe; color: #1e40af; }
    .status-planned { background: #fef3c7; color: #92400e; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    .header .meta { text-align: right; font-size: 9pt; color: #6b7280; }
    .section { margin-bottom: 16px; page-break-inside: avoid; }
    .section h2 { font-size: 12pt; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
    .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 24px; }
    .field { display: flex; justify-content: space-between; padding: 2px 0; font-size: 10pt; }
    .field .label { color: #6b7280; }
    .field .value { font-weight: 500; }
    .value-highlight { color: #059669; font-weight: 600; }
    .value-warning { color: #d97706; font-weight: 600; }
    .value-danger { color: #dc2626; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th { background: #f1f5f9; text-align: left; padding: 6px 8px; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569; }
    td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
    tr.changed { background: #fffbeb; }
    tr.changed td:last-child { color: #d97706; font-weight: 600; }
    .map-placeholder { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; text-align: center; color: #64748b; }
    .map-placeholder .detail { font-size: 9pt; margin-top: 4px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 8pt; color: #9ca3af; text-align: center; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
    .signature-line { border-top: 1px solid #1a1a1a; padding-top: 4px; font-size: 9pt; color: #6b7280; margin-top: 60px; }
    @media print { body { font-size: 10pt; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>📝 Отчёт по рейсу</h1>
      <p style="font-size:12pt;margin-top:4px;">${trip.route}</p>
    </div>
    <div>
      <span class="status status-${trip.status}">${status}</span>
      <div class="meta" style="margin-top:8px;">
        Дата формирования: ${new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}<br>
        ID: ${trip.id.slice(0, 8).toUpperCase()}
      </div>
    </div>
  </div>

  <div class="section">
    <h2>📋 Основная информация</h2>
    <div class="grid">
      <div class="field"><span class="label">Маршрут</span><span class="value">${trip.route}</span></div>
      <div class="field"><span class="label">Техника</span><span class="value">${eq?.name || '—'}</span></div>
      <div class="field"><span class="label">Пункт отправления</span><span class="value">${trip.startPoint || '—'}</span></div>
      <div class="field"><span class="label">Регистрационный номер</span><span class="value">${eq?.registrationNum || '—'}</span></div>
      <div class="field"><span class="label">Пункт назначения</span><span class="value">${trip.endPoint || '—'}</span></div>
      <div class="field"><span class="label">Марка / Модель</span><span class="value">${[eq?.brand, eq?.model].filter(Boolean).join(' ') || '—'}</span></div>
      <div class="field"><span class="label">Груз</span><span class="value">${trip.cargo || '—'}</span></div>
      <div class="field"><span class="label">Вес груза</span><span class="value">${trip.cargoWeight != null ? trip.cargoWeight + ' т' : '—'}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>🕐 Время и длительность</h2>
    <div class="grid">
      <div class="field"><span class="label">Начало рейса</span><span class="value">${fmtDate(trip.startDate)}</span></div>
      <div class="field"><span class="label">Окончание рейса</span><span class="value">${fmtDate(trip.endDate)}</span></div>
      <div class="field"><span class="label">Планируемое окончание</span><span class="value">${fmtDate(trip.plannedEndDate)}</span></div>
      <div class="field"><span class="label">Длительность</span><span class="value">${fmtDur(trip.tripDuration)}</span></div>
      <div class="field"><span class="label">Время стоянок</span><span class="value">${fmtDur(trip.parkingsDuration)}</span></div>
      <div class="field"><span class="label">Моточасы</span><span class="value">${fmtDur(trip.engineHours)}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>👥 Экипаж</h2>
    <div class="field"><span class="label">Экипаж</span><span class="value">${crew?.name || '—'}</span></div>
    <div style="margin-top:6px;">${crewHtml}</div>
  </div>

  <div class="section">
    <h2>⛽ Топливо и пробег</h2>
    <div class="grid">
      <div class="field"><span class="label">Топливо на старте</span><span class="value">${trip.fuelStart != null ? trip.fuelStart + ' л' : '—'}</span></div>
      <div class="field"><span class="label">Топливо на финише</span><span class="value">${trip.fuelEnd != null ? trip.fuelEnd + ' л' : '—'}</span></div>
      <div class="field"><span class="label">Пробег на старте</span><span class="value">${trip.mileageStart != null ? trip.mileageStart.toLocaleString('ru-RU') + ' км' : '—'}</span></div>
      <div class="field"><span class="label">Пробег на финише</span><span class="value">${trip.mileageEnd != null ? trip.mileageEnd.toLocaleString('ru-RU') + ' км' : '—'}</span></div>
      ${trip.fuelConsumed != null ? `<div class="field"><span class="label">Расход топлива</span><span class="value value-warning">${trip.fuelConsumed} л</span></div>` : ''}
      ${trip.avgFuelRate != null ? `<div class="field"><span class="label">Средний расход</span><span class="value">${trip.avgFuelRate} л/100км</span></div>` : ''}
      ${displayDist != null ? `<div class="field"><span class="label">Расстояние</span><span class="value value-highlight">${displayDist.toFixed(1)} км</span></div>` : ''}
    </div>
  </div>

  <div class="section">
    <h2>📊 Статистика рейса</h2>
    <div class="grid3">
      ${trip.distance != null ? `<div class="field"><span class="label">Расстояние</span><span class="value value-highlight">${trip.distance.toFixed(1)} км</span></div>` : ''}
      ${trip.avgSpeed != null ? `<div class="field"><span class="label">Средняя скорость</span><span class="value">${trip.avgSpeed} км/ч</span></div>` : ''}
      ${trip.maxSpeed != null ? `<div class="field"><span class="label">Макс. скорость</span><span class="value">${trip.maxSpeed} км/ч</span></div>` : ''}
      ${trip.refuelVolume != null && trip.refuelVolume > 0 ? `<div class="field"><span class="label">Заправки</span><span class="value">${trip.refuelVolume} л</span></div>` : ''}
      ${trip.plumVolume != null && trip.plumVolume > 0 ? `<div class="field"><span class="label">Сливы</span><span class="value value-danger">${trip.plumVolume} л</span></div>` : ''}
      ${trip.idleTime != null ? `<div class="field"><span class="label">Холостой ход</span><span class="value">${fmtDur(trip.idleTime)}</span></div>` : ''}
    </div>
  </div>

  ${mainCompRows ? `<div class="section">
    <h2>📡 Показания датчиков (старт / финиш)</h2>
    <table>
      <thead><tr><th>Показатель</th><th>Старт</th><th>Финиш</th><th>Разница</th></tr></thead>
      <tbody>${mainCompRows}</tbody>
    </table>
  </div>` : ''}

  ${sensorCompRows ? `<div class="section">
    <h2>🔌 Датчики</h2>
    <table>
      <thead><tr><th>Датчик</th><th>Старт</th><th>Финиш</th><th>Разница</th></tr></thead>
      <tbody>${sensorCompRows}</tbody>
    </table>
  </div>` : ''}

  ${mapSection}

  <div class="section">
    <h2>💰 Финансы</h2>
    <div class="grid">
      <div class="field"><span class="label">Стоимость</span><span class="value">${fmtPrice(trip.cost)}</span></div>
      <div class="field"><span class="label">Доход</span><span class="value">${fmtPrice(trip.revenue)}</span></div>
    </div>
  </div>

  ${trip.notes ? `<div class="section"><h2>📝 Заметки</h2><p style="font-size:10pt;white-space:pre-wrap;">${trip.notes}</p></div>` : ''}

  <div class="signatures">
    <div><div class="signature-line">Водитель / ________________</div></div>
    <div><div class="signature-line">Диспетчер / ________________</div></div>
  </div>

  <div class="footer">
    Отчёт сформирован автоматически • ${new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} • Fleet Tracker
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:10px 24px;font-size:12pt;cursor:pointer;background:#2563eb;color:white;border:none;border-radius:6px;">🖨 Печать</button>
  </div>
</body>
</html>`

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (error) {
    console.error('Error generating trip print:', error)
    return new Response('Ошибка формирования отчёта', { status: 500 })
  }
}
