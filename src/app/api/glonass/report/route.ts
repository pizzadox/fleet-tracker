import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// ═══════════════════════════════════════════════════════════════
// Sensor Report Export API
// POST /api/glonass/report — generate XLSX report for sensors over a period
// ═══════════════════════════════════════════════════════════════

interface ReportRequest {
  equipmentIds: string[]       // IDs of equipment to include
  startDate: string            // ISO date string
  endDate: string              // ISO date string
  sensorTypes?: string[]       // Optional: filter by sensor types
  includeStats?: boolean       // Include summary statistics from Axenta
  includeTrackSummary?: boolean // Include trip/parking summary
}

async function getValidToken(settings: {
  id: string; apiUrl: string; apiKey: string;
  username: string | null; password: string | null;
}): Promise<string | null> {
  try {
    const testUrl = `${settings.apiUrl}/api/current_user/`
    const testResponse = await fetch(testUrl, {
      headers: { 'Authorization': `Token ${settings.apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (testResponse.ok) return settings.apiKey

    if ((testResponse.status === 401 || testResponse.status === 403) && settings.username && settings.password) {
      const loginUrl = `${settings.apiUrl}/api/auth/login/`
      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: settings.username, password: settings.password }),
        signal: AbortSignal.timeout(10000),
      })
      if (loginResponse.ok) {
        const loginData = await loginResponse.json()
        const newToken = loginData.token || ''
        if (newToken) {
          await db.axentaSettings.update({ where: { id: settings.id }, data: { apiKey: newToken } })
          return newToken
        }
      }
    }
    return null
  } catch { return null }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h} ч ${m} мин`
  return `${m} мин`
}

export async function POST(request: NextRequest) {
  try {
    const settings = await db.axentaSettings.findFirst()
    if (!settings || !settings.isActive || !settings.apiUrl || !settings.apiKey) {
      return NextResponse.json({ error: 'Интеграция не настроена' }, { status: 400 })
    }

    const body: ReportRequest = await request.json()
    const { equipmentIds, startDate, endDate, sensorTypes, includeStats = true, includeTrackSummary = true } = body

    if (!equipmentIds || equipmentIds.length === 0) {
      return NextResponse.json({ error: 'Не выбрана техника' }, { status: 400 })
    }
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Укажите период' }, { status: 400 })
    }

    const token = await getValidToken(settings)
    if (!token) {
      return NextResponse.json({ error: 'Не удалось авторизоваться' }, { status: 401 })
    }

    // Fetch equipment with trackers and sensor data
    const equipmentList = await db.equipment.findMany({
      where: { id: { in: equipmentIds } },
      include: {
        trackers: {
          include: {
            sensorData: true,
          },
        },
        owner: true,
      },
    })

    if (equipmentList.length === 0) {
      return NextResponse.json({ error: 'Техника не найдена' }, { status: 404 })
    }

    const wb = XLSX.utils.book_new()

    // ── Sheet 1: Summary ──────────────────────────────────────
    const summaryRows: Record<string, unknown>[] = []

    for (const eq of equipmentList) {
      for (const tracker of eq.trackers) {
        const row: Record<string, unknown> = {
          'Наименование': eq.name,
          'Тип': eq.type,
          'Гос. номер': eq.registrationNum || '—',
          'VIN': eq.vin || '—',
          'Марка': eq.brand || '—',
          'Модель': eq.model || '—',
          'Статус': eq.status === 'active' ? 'В эксплуатации' : eq.status === 'repair' ? 'На ремонте' : eq.status,
          'Трекер': tracker.trackerName || tracker.trackerId,
          'IMEI': tracker.imei || '—',
          'Онлайн': tracker.isActive ? 'Да' : 'Нет',
          'Последняя связь': tracker.lastSeenAt ? new Date(tracker.lastSeenAt).toLocaleString('ru-RU') : '—',
          'Широта': tracker.lastLatitude ?? '—',
          'Долгота': tracker.lastLongitude ?? '—',
          'Скорость (км/ч)': tracker.lastSpeed ?? '—',
          'Зажигание': tracker.lastIgnition != null ? (tracker.lastIgnition ? 'Вкл' : 'Выкл') : '—',
          'Топливо (л)': tracker.lastFuelLevel ?? '—',
          'Пробег (км)': tracker.lastMileage ?? '—',
          'Темп. двигателя': tracker.lastEngineTemp ?? '—',
          'Адрес': tracker.lastAddress || '—',
        }

        // Add sensor data
        const sensors = tracker.sensorData || []
        const filteredSensors = sensorTypes && sensorTypes.length > 0
          ? sensors.filter(s => sensorTypes.includes(s.sensorType))
          : sensors

        for (const sensor of filteredSensors) {
          const key = `${sensor.sensorName || sensor.sensorType}${sensor.unit ? ` (${sensor.unit})` : ''}`
          if (sensor.value != null) {
            row[key] = sensor.value
          } else if (sensor.stringValue) {
            row[key] = sensor.stringValue
          }
        }

        summaryRows.push(row)
      }
    }

    if (summaryRows.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(summaryRows)
      // Set column widths
      ws1['!cols'] = Object.keys(summaryRows[0]).map(k => ({
        wch: Math.max(k.length + 2, 15)
      }))
      XLSX.utils.book_append_sheet(wb, ws1, 'Сводка')
    }

    // ── Sheet 2: Sensor Data Detail ───────────────────────────
    const sensorRows: Record<string, unknown>[] = []

    for (const eq of equipmentList) {
      for (const tracker of eq.trackers) {
        const sensors = tracker.sensorData || []
        const filteredSensors = sensorTypes && sensorTypes.length > 0
          ? sensors.filter(s => sensorTypes.includes(s.sensorType))
          : sensors

        for (const sensor of filteredSensors) {
          sensorRows.push({
            'Техника': eq.name,
            'Гос. номер': eq.registrationNum || '—',
            'Тип техники': eq.type,
            'Трекер': tracker.trackerName || tracker.trackerId,
            'Датчик': sensor.sensorName || '—',
            'Тип датчика': sensor.sensorType,
            'Значение': sensor.value ?? '—',
            'Строковое значение': sensor.stringValue || '—',
            'Единица': sensor.unit || '—',
            'Время замера': sensor.timestamp ? new Date(sensor.timestamp).toLocaleString('ru-RU') : '—',
          })
        }
      }
    }

    if (sensorRows.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(sensorRows)
      ws2['!cols'] = [
        { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 20 },
        { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
        { wch: 10 }, { wch: 20 },
      ]
      XLSX.utils.book_append_sheet(wb, ws2, 'Датчики')
    }

    // ── Sheet 3: Statistics (if requested) ────────────────────
    if (includeStats) {
      const statsRows: Record<string, unknown>[] = []

      for (const eq of equipmentList) {
        for (const tracker of eq.trackers) {
          if (!tracker.axentaCloudId && !tracker.trackerId) continue

          try {
            const objectId = tracker.axentaCloudId || tracker.trackerId
            const statsUrl = `${settings.apiUrl}/api/objects/stats/`
            const statsResponse = await fetch(statsUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                objectId: Number(objectId),
                startDate,
                endDate,
              }),
              signal: AbortSignal.timeout(15000),
            })

            if (statsResponse.ok) {
              const stats = await statsResponse.json()
              statsRows.push({
                'Техника': eq.name,
                'Гос. номер': eq.registrationNum || '—',
                'Тип техники': eq.type,
                'Период с': new Date(startDate).toLocaleString('ru-RU'),
                'Период по': new Date(endDate).toLocaleString('ru-RU'),
                'Пробег (км)': stats.mileage ?? '—',
                'Ср. скорость (км/ч)': stats.avgSpeed ?? '—',
                'Макс. скорость (км/ч)': stats.maxSpeed ?? '—',
                'Расход топлива (л)': stats.fuelConsumption ?? '—',
                'Ср. расход (л/100км)': stats.avgFuelConsumption ?? '—',
                'Заправки (л)': stats.refuelVolume ?? '—',
                'Сливы (л)': stats.plumVolume ?? '—',
                'Время поездок': stats.tripsDuration ? formatDuration(Number(stats.tripsDuration)) : '—',
                'Время стоянок': stats.parkingsDuration ? formatDuration(Number(stats.parkingsDuration)) : '—',
                'Моточасы': stats.engineHours ?? '—',
                'Холостой ход': stats.idleTime ? formatDuration(Number(stats.idleTime)) : '—',
              })
            }
          } catch {
            // Skip stats for this tracker on error
            statsRows.push({
              'Техника': eq.name,
              'Гос. номер': eq.registrationNum || '—',
              'Тип техники': eq.type,
              'Период с': new Date(startDate).toLocaleString('ru-RU'),
              'Период по': new Date(endDate).toLocaleString('ru-RU'),
              'Ошибка': 'Не удалось получить статистику',
            })
          }
        }
      }

      if (statsRows.length > 0) {
        const ws3 = XLSX.utils.json_to_sheet(statsRows)
        ws3['!cols'] = Object.keys(statsRows[0]).map(k => ({
          wch: Math.max(k.length + 2, 14)
        }))
        XLSX.utils.book_append_sheet(wb, ws3, 'Статистика')
      }
    }

    // ── Sheet 4: Track Summary (trips, parkings, stops) ──────
    if (includeTrackSummary) {
      const trackRows: Record<string, unknown>[] = []

      for (const eq of equipmentList) {
        for (const tracker of eq.trackers) {
          if (!tracker.axentaCloudId && !tracker.trackerId) continue

          try {
            const objectId = tracker.axentaCloudId || tracker.trackerId
            const tracksUrl = `${settings.apiUrl}/api/tracks/create/`
            const tracksResponse = await fetch(tracksUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                objectId: Number(objectId),
                startDate,
                endDate,
                trackType: 'single',
                detectTrips: true,
                withStops: true,
                withParkings: true,
                withRefuels: true,
                withPlums: true,
              }),
              signal: AbortSignal.timeout(30000),
            })

            if (tracksResponse.ok) {
              const tracksData = await tracksResponse.json()

              // Trips
              if (tracksData.trips && Array.isArray(tracksData.trips)) {
                for (let i = 0; i < tracksData.trips.length; i++) {
                  const trip = tracksData.trips[i]
                  trackRows.push({
                    'Техника': eq.name,
                    'Гос. номер': eq.registrationNum || '—',
                    'Тип': 'Поездка',
                    'Номер': i + 1,
                    'Начало': trip.startDate ? new Date(trip.startDate).toLocaleString('ru-RU') : '—',
                    'Конец': trip.endDate ? new Date(trip.endDate).toLocaleString('ru-RU') : '—',
                    'Расстояние (км)': trip.distance ? Number(trip.distance).toFixed(1) : '—',
                    'Точек': trip.messagesCoordinates?.length || '—',
                  })
                }
              }

              // Parkings
              if (tracksData.parkings && Array.isArray(tracksData.parkings)) {
                for (let i = 0; i < tracksData.parkings.length; i++) {
                  const parking = tracksData.parkings[i]
                  trackRows.push({
                    'Техника': eq.name,
                    'Гос. номер': eq.registrationNum || '—',
                    'Тип': 'Стоянка',
                    'Номер': i + 1,
                    'Начало': parking.startDate ? new Date(parking.startDate).toLocaleString('ru-RU') : '—',
                    'Конец': parking.endDate ? new Date(parking.endDate).toLocaleString('ru-RU') : '—',
                    'Длительность': parking.duration ? formatDuration(Number(parking.duration)) : '—',
                    'Моточасы': parking.ignitionTime ? formatDuration(Number(parking.ignitionTime)) : '—',
                  })
                }
              }

              // Stops
              if (tracksData.stops && Array.isArray(tracksData.stops)) {
                for (let i = 0; i < tracksData.stops.length; i++) {
                  const stop = tracksData.stops[i]
                  trackRows.push({
                    'Техника': eq.name,
                    'Гос. номер': eq.registrationNum || '—',
                    'Тип': 'Остановка',
                    'Номер': i + 1,
                    'Начало': stop.startDate ? new Date(stop.startDate).toLocaleString('ru-RU') : '—',
                    'Конец': stop.endDate ? new Date(stop.endDate).toLocaleString('ru-RU') : '—',
                    'Длительность': stop.duration ? formatDuration(Number(stop.duration)) : '—',
                  })
                }
              }

              // Refuels
              if (tracksData.refuels && Array.isArray(tracksData.refuels)) {
                for (let i = 0; i < tracksData.refuels.length; i++) {
                  const refuel = tracksData.refuels[i]
                  trackRows.push({
                    'Техника': eq.name,
                    'Гос. номер': eq.registrationNum || '—',
                    'Тип': 'Заправка',
                    'Номер': i + 1,
                    'Начало': refuel.startDate ? new Date(refuel.startDate).toLocaleString('ru-RU') : '—',
                    'Конец': refuel.endDate ? new Date(refuel.endDate).toLocaleString('ru-RU') : '—',
                    'Объём (л)': refuel.volume ?? refuel.fuelDiff ?? '—',
                  })
                }
              }

              // Plums (fuel drains)
              if (tracksData.plums && Array.isArray(tracksData.plums)) {
                for (let i = 0; i < tracksData.plums.length; i++) {
                  const plum = tracksData.plums[i]
                  trackRows.push({
                    'Техника': eq.name,
                    'Гос. номер': eq.registrationNum || '—',
                    'Тип': 'Слив',
                    'Номер': i + 1,
                    'Начало': plum.startDate ? new Date(plum.startDate).toLocaleString('ru-RU') : '—',
                    'Конец': plum.endDate ? new Date(plum.endDate).toLocaleString('ru-RU') : '—',
                    'Объём (л)': plum.volume ?? plum.fuelDiff ?? '—',
                  })
                }
              }
            }
          } catch {
            // Skip track data for this tracker on error
          }
        }
      }

      if (trackRows.length > 0) {
        const ws4 = XLSX.utils.json_to_sheet(trackRows)
        ws4['!cols'] = [
          { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 8 },
          { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 10 },
        ]
        XLSX.utils.book_append_sheet(wb, ws4, 'Треки')
      }
    }

    // Generate XLSX buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Return as downloadable file
    const dateFrom = new Date(startDate).toLocaleDateString('ru-RU')
    const dateTo = new Date(endDate).toLocaleDateString('ru-RU')
    const filename = `Отчёт_датчики_${dateFrom}-${dateTo}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error('[GLONASS Report] Error:', error)
    return NextResponse.json({ error: 'Ошибка генерации отчёта' }, { status: 500 })
  }
}
