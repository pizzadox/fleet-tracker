import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// GET /api/glonass/sensors?trackerId=xxx
// Fetches the FULL sensor list from Axenta for a specific tracker,
// including sensor metadata (type, name, unit) and current values.
// ═══════════════════════════════════════════════════════════════

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
  } catch {
    return null
  }
}

// Fetch sensor metadata from Axenta: GET /api/objects/{id}/sensors/
async function fetchObjectSensors(apiUrl: string, token: string, objectId: number) {
  const url = `${apiUrl}/api/objects/${objectId}/sensors/`
  const response = await fetch(url, {
    headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) return []
  return await response.json()
}

// Fetch full object details (includes lastMessage.sensors with values): GET /api/objects/{id}/?full=true
async function fetchObjectDetails(apiUrl: string, token: string, objectId: number) {
  const url = `${apiUrl}/api/objects/${objectId}/?full=true`
  const response = await fetch(url, {
    headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) return null
  return await response.json()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackerId = searchParams.get('trackerId')

    if (!trackerId) {
      return NextResponse.json({ error: 'Не указан trackerId' }, { status: 400 })
    }

    // Get the tracker from DB
    const tracker = await db.glonassTracker.findUnique({
      where: { id: trackerId },
      include: { sensorData: { orderBy: { timestamp: 'desc' } } }
    })

    if (!tracker) {
      return NextResponse.json({ error: 'Трекер не найден' }, { status: 404 })
    }

    if (!tracker.axentaCloudId) {
      return NextResponse.json({ error: 'Трекер не привязан к Axenta' }, { status: 400 })
    }

    const settings = await db.axentaSettings.findFirst()
    if (!settings || !settings.isActive || !settings.apiUrl) {
      return NextResponse.json({ error: 'Интеграция с Axenta не настроена' }, { status: 400 })
    }

    const token = await getValidToken(settings)
    if (!token) {
      return NextResponse.json({ error: 'Не удалось авторизоваться в Axenta' }, { status: 401 })
    }

    const axentaId = parseInt(tracker.axentaCloudId)
    if (isNaN(axentaId)) {
      return NextResponse.json({ error: 'Некорректный Axenta ID' }, { status: 400 })
    }

    // Fetch sensor metadata and current values from Axenta
    const [sensorsRaw, objectDetails] = await Promise.all([
      fetchObjectSensors(settings.apiUrl, token, axentaId),
      fetchObjectDetails(settings.apiUrl, token, axentaId),
    ])

    // Extract current sensor values from lastMessage.sensors
    let sensorValuesMap: Record<string, number | null> = {}
    if (objectDetails?.lastMessage?.sensors && typeof objectDetails.lastMessage.sensors === 'object') {
      sensorValuesMap = objectDetails.lastMessage.sensors as Record<string, number | null>
    }

    // Extract position data from lastMessage
    const lastMessage = objectDetails?.lastMessage as Record<string, unknown> | undefined
    const pos = lastMessage?.pos as Record<string, unknown> | undefined

    // Build comprehensive sensor list
    const sensors = Array.isArray(sensorsRaw) ? sensorsRaw : []

    // Categorize and enrich sensors with values
    type SensorCategory = 'position' | 'ignition' | 'fuel' | 'temperature' | 'mileage' | 'voltage' | 'digital' | 'custom'

    interface EnrichedSensor {
      id: number | string
      name: string
      type: string
      category: SensorCategory
      value: number | null
      stringValue: string | null
      unit: string | null
      hasValue: boolean
      description?: string
    }

    const enrichedSensors: EnrichedSensor[] = sensors.map((s: Record<string, unknown>) => {
      const sensorApiId = s.id as number | undefined
      const sensorType = String(s.type || 'custom').toLowerCase()
      const sensorName = String(s.name || '')

      // Get value from sensorValuesMap
      let sensorValue: number | null = null
      if (sensorApiId != null && sensorValuesMap[`sensor_${sensorApiId}`] != null) {
        sensorValue = sensorValuesMap[`sensor_${sensorApiId}`]
      }

      // Determine category
      let category: SensorCategory = 'custom'
      const nameLower = sensorName.toLowerCase()

      if (sensorType.includes('fuel') || nameLower.includes('топлив') || nameLower.includes('бак')) {
        category = 'fuel'
      } else if (sensorType.includes('ignition') || nameLower.includes('зажиган')) {
        category = 'ignition'
      } else if (sensorType.includes('temperature') || sensorType.includes('temp') || nameLower.includes('темпер')) {
        category = 'temperature'
      } else if (sensorType.includes('odometer') || sensorType.includes('mileage') || nameLower.includes('пробег') || nameLower.includes('одометр')) {
        category = 'mileage'
      } else if (sensorType.includes('voltage') || nameLower.includes('напряжен') || nameLower.includes('напр.')) {
        category = 'voltage'
      } else if (sensorType.includes('digital') || sensorType.includes('discrete') || nameLower.includes('двер') || nameLower.includes('капот') || nameLower.includes('ремень') || nameLower.includes('движен') || nameLower.includes('датчик движ')) {
        category = 'digital'
      }

      // Build display value
      let stringValue: string | null = null
      if (sensorValue != null) {
        const unit = s.unit ? String(s.unit) : ''
        if (category === 'ignition') {
          stringValue = sensorValue > 0 ? 'Вкл' : 'Выкл'
        } else {
          stringValue = unit ? `${sensorValue} ${unit}` : String(sensorValue)
        }
      }

      return {
        id: sensorApiId || sensorName,
        name: sensorName,
        type: String(s.type || 'custom'),
        category,
        value: sensorValue,
        stringValue,
        unit: s.unit ? String(s.unit) : null,
        hasValue: sensorValue != null,
        description: s.description ? String(s.description) : undefined,
      }
    })

    // Also add position-based data as virtual sensors
    const positionSensors: EnrichedSensor[] = []
    if (pos) {
      if (pos.y != null) positionSensors.push({ id: 'pos_lat', name: 'Широта', type: 'position', category: 'position', value: Number(pos.y), stringValue: Number(pos.y).toFixed(6), unit: '°', hasValue: true })
      if (pos.x != null) positionSensors.push({ id: 'pos_lng', name: 'Долгота', type: 'position', category: 'position', value: Number(pos.x), stringValue: Number(pos.x).toFixed(6), unit: '°', hasValue: true })
      if (pos.s != null) positionSensors.push({ id: 'pos_speed', name: 'Скорость GPS', type: 'position', category: 'position', value: Number(pos.s), stringValue: `${Number(pos.s)} км/ч`, unit: 'км/ч', hasValue: true })
      if (pos.c != null) positionSensors.push({ id: 'pos_course', name: 'Курс', type: 'position', category: 'position', value: Number(pos.c), stringValue: `${Number(pos.c)}°`, unit: '°', hasValue: true })
      if (pos.z != null) positionSensors.push({ id: 'pos_alt', name: 'Высота', type: 'position', category: 'position', value: Number(pos.z), stringValue: `${Number(pos.z)} м`, unit: 'м', hasValue: true })
    }

    // Also add isIgnition and isMotion from monitoring data
    if (objectDetails?.isIgnition != null) {
      const ignSensor = enrichedSensors.find(s => s.category === 'ignition')
      if (ignSensor) {
        ignSensor.value = objectDetails.isIgnition ? 1 : 0
        ignSensor.stringValue = objectDetails.isIgnition ? 'Вкл' : 'Выкл'
        ignSensor.hasValue = true
      }
    }
    if (objectDetails?.isMotion != null) {
      positionSensors.push({ id: 'pos_motion', name: 'Движение', type: 'position', category: 'position', value: objectDetails.isMotion ? 1 : 0, stringValue: objectDetails.isMotion ? 'Да' : 'Нет', unit: null, hasValue: true })
    }

    // Update the local sensor data in DB — BULK createMany for speed
    if (sensors.length > 0) {
      await db.glonassSensorData.deleteMany({ where: { trackerId } })

      const sensorCreates: Array<{
        trackerId: string
        sensorType: string
        sensorName: string | null
        value: number | null
        stringValue: string | null
        unit: string | null
        timestamp: Date
      }> = []

      for (const s of sensors) {
        const sensorApiId = (s as Record<string, unknown>).id as number | undefined
        const sensorType = String((s as Record<string, unknown>).type || 'custom')
        const sensorName = (s as Record<string, unknown>).name ? String((s as Record<string, unknown>).name) : null
        let sensorValue: number | null = null
        if (sensorApiId != null && sensorValuesMap[`sensor_${sensorApiId}`] != null) {
          sensorValue = sensorValuesMap[`sensor_${sensorApiId}`]
        }
        let sensorStringValue: string | null = null
        if (sensorValue != null) {
          const unit = (s as Record<string, unknown>).unit ? String((s as Record<string, unknown>).unit) : ''
          sensorStringValue = unit ? `${sensorValue} ${unit}` : String(sensorValue)
        }

        sensorCreates.push({
          trackerId,
          sensorType,
          sensorName,
          value: sensorValue,
          stringValue: sensorStringValue,
          unit: (s as Record<string, unknown>).unit ? String((s as Record<string, unknown>).unit) : null,
          timestamp: new Date(),
        })
      }

      // Bulk insert — much faster than individual creates
      if (sensorCreates.length > 0) {
        await db.glonassSensorData.createMany({ data: sensorCreates })
      }
    }

    // Group sensors by category for UI
    const categoryOrder: SensorCategory[] = ['position', 'ignition', 'fuel', 'temperature', 'mileage', 'voltage', 'digital', 'custom']
    const categoryLabels: Record<SensorCategory, string> = {
      position: 'Позиция и движение',
      ignition: 'Зажигание',
      fuel: 'Топливо',
      temperature: 'Температура',
      mileage: 'Пробег',
      voltage: 'Напряжение',
      digital: 'Цифровые датчики',
      custom: 'Прочие датчики',
    }

    const grouped: Record<string, { label: string; sensors: EnrichedSensor[] }> = {}
    const allSensors = [...positionSensors, ...enrichedSensors]

    for (const sensor of allSensors) {
      const cat = sensor.category
      if (!grouped[cat]) {
        grouped[cat] = { label: categoryLabels[cat] || cat, sensors: [] }
      }
      grouped[cat].sensors.push(sensor)
    }

    // Sort groups by category order
    const sortedGroups = categoryOrder
      .filter(cat => grouped[cat])
      .map(cat => ({ key: cat, ...grouped[cat] }))
      .filter(g => g.sensors.length > 0)

    // Also return lastMessage time info
    const lastSeenInfo = {
      lastPositionAt: lastMessage?.tpos ? new Date(lastMessage.tpos as string).toISOString() : null,
      lastMessageAt: lastMessage?.t ? new Date(lastMessage.t as string).toISOString() : null,
      connectedStatus: objectDetails?.connectedStatus ?? null,
      isMotion: objectDetails?.isMotion ?? null,
      isIgnition: objectDetails?.isIgnition ?? null,
    }

    return NextResponse.json({
      sensors: allSensors,
      grouped: sortedGroups,
      totalSensors: allSensors.length,
      sensorsWithValues: allSensors.filter(s => s.hasValue).length,
      lastSeenInfo,
      trackerFields: {
        lastLatitude: pos?.y != null ? Number(pos.y) : tracker.lastLatitude,
        lastLongitude: pos?.x != null ? Number(pos.x) : tracker.lastLongitude,
        lastSpeed: pos?.s != null ? Number(pos.s) : tracker.lastSpeed,
        lastCourse: pos?.c != null ? Number(pos.c) : tracker.lastCourse,
        lastAltitude: pos?.z != null ? Number(pos.z) : tracker.lastAltitude,
        lastAddress: tracker.lastAddress,
        lastIgnition: objectDetails?.isIgnition != null ? Boolean(objectDetails.isIgnition) : tracker.lastIgnition,
        lastFuelLevel: tracker.lastFuelLevel,
        lastMileage: tracker.lastMileage,
        lastEngineTemp: tracker.lastEngineTemp,
      }
    })
  } catch (error) {
    console.error('[GLONASS Sensors] Error:', error)
    return NextResponse.json({ error: 'Ошибка загрузки датчиков' }, { status: 500 })
  }
}
