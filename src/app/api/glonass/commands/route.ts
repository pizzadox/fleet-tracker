import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════
// GET  /api/glonass/commands?trackerId=xxx  — list available commands
// POST /api/glonass/commands                — send a command to tracker
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

// GET — list available commands for a tracker + check tracker online status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackerId = searchParams.get('trackerId')

    if (!trackerId) {
      return NextResponse.json({ error: 'Не указан trackerId' }, { status: 400 })
    }

    const tracker = await db.glonassTracker.findUnique({ where: { id: trackerId } })
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

    // Fetch available commands and tracker details in parallel
    const [commandsRes, detailRes] = await Promise.all([
      fetch(`${settings.apiUrl}/api/objects/${axentaId}/commands/`, {
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
      }).catch(() => null),
      fetch(`${settings.apiUrl}/api/objects/${axentaId}/?card=true`, {
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
      }).catch(() => null),
    ])

    let deviceCanSendCommands = false
    let connectedStatus = false
    let lastSeenAt: string | null = null
    let lastPositionAt: string | null = null

    if (detailRes?.ok) {
      const detailData = await detailRes.json()
      deviceCanSendCommands = Boolean(detailData.deviceCanSendCommands)
      connectedStatus = Boolean(detailData.connectedStatus)
      const lastMsg = detailData.lastMessage as Record<string, unknown> | undefined
      if (lastMsg?.tpos) lastPositionAt = String(lastMsg.tpos)
      if (lastMsg?.t) lastSeenAt = String(lastMsg.t)
    }

    // Normalize commands
    let commands: Array<{ id: number | string; name: string; type: string; params: string | null; isVisible: boolean }> = []
    if (commandsRes?.ok) {
      const commandsData = await commandsRes.json()
      const raw = Array.isArray(commandsData)
        ? commandsData
        : (commandsData?.commands || [])

      commands = raw.map((c: Record<string, unknown>) => ({
        id: c.id,
        name: c.name || 'Команда',
        type: c.type || 'custom_msg',
        params: c.params || null,
        isVisible: c.isVisible !== false,
      }))
    }

    // Get recent command history from equipment_history
    const recentCommands = await db.equipmentHistory.findMany({
      where: {
        equipmentId: tracker.equipmentId,
        event: 'glonass_command',
      },
      orderBy: { date: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      commands,
      deviceCanSendCommands,
      connectedStatus,
      lastSeenAt,
      lastPositionAt,
      trackerName: tracker.trackerName || tracker.trackerId,
      axentaId: tracker.axentaCloudId,
      recentCommands: recentCommands.map(c => ({
        id: c.id,
        description: c.description,
        date: c.date.toISOString(),
        performedBy: c.performedBy,
      })),
    })
  } catch (error) {
    console.error('[GLONASS Commands GET] Error:', error)
    return NextResponse.json({ error: 'Ошибка получения команд' }, { status: 500 })
  }
}

// POST — send a command to tracker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trackerId, commandId, params, customParams } = body

    if (!trackerId) {
      return NextResponse.json({ error: 'Не указан trackerId' }, { status: 400 })
    }

    const tracker = await db.glonassTracker.findUnique({ where: { id: trackerId } })
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

    const commandText = customParams || params || 'custom_msg'
    const sentAt = new Date().toISOString()

    // Send command via Axenta API
    const sendUrl = `${settings.apiUrl}/api/objects/${axentaId}/send_command/`
    const sendBody: Record<string, unknown> = {
      type: 'custom_msg',
    }

    if (customParams) {
      sendBody.params = customParams
    } else if (params) {
      sendBody.params = params
    }

    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendBody),
      signal: AbortSignal.timeout(15000),
    })

    if (!sendResponse.ok) {
      const errorText = await sendResponse.text().catch(() => `HTTP ${sendResponse.status}`)
      return NextResponse.json({
        success: false,
        status: 'error',
        error: `Ошибка отправки команды: ${errorText}`,
      }, { status: sendResponse.status >= 500 ? 502 : 400 })
    }

    // After sending, check tracker status to see if it responded
    let trackerOnline = false
    let newLastSeenAt: string | null = null

    // Wait a moment then check if tracker responded
    await new Promise(r => setTimeout(r, 2000))

    try {
      const checkRes = await fetch(`${settings.apiUrl}/api/objects/${axentaId}/?card=true`, {
        headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      if (checkRes.ok) {
        const checkData = await checkRes.json()
        const lastMsg = checkData.lastMessage as Record<string, unknown> | undefined
        if (lastMsg?.t) newLastSeenAt = String(lastMsg.t)

        // If the tracker was seen AFTER we sent the command, it's confirmed
        if (newLastSeenAt && new Date(newLastSeenAt) > new Date(sentAt)) {
          trackerOnline = true
        }
        // Also check connectedStatus
        if (checkData.connectedStatus) {
          trackerOnline = true
        }
      }
    } catch { /* ignore */ }

    // Determine status
    let status: string
    if (trackerOnline) {
      status = 'delivered'
    } else if (sendResponse.status === 204) {
      status = 'sent'  // Sent to Axenta server, but tracker hasn't confirmed yet
    } else {
      status = 'queued'
    }

    // Log the command to equipment history
    await db.equipmentHistory.create({
      data: {
        equipmentId: tracker.equipmentId,
        event: 'glonass_command',
        description: `Команда "${commandText}" отправлена трекеру ${tracker.trackerName || tracker.trackerId}`,
        date: new Date(),
        performedBy: status,
      }
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      status,
      message: `Команда отправлена трекеру ${tracker.trackerName || tracker.trackerId}`,
      command: commandText,
      sentAt,
      trackerOnline,
      newLastSeenAt,
    })
  } catch (error) {
    console.error('[GLONASS Commands POST] Error:', error)
    return NextResponse.json({ error: 'Ошибка отправки команды', status: 'error' }, { status: 500 })
  }
}
