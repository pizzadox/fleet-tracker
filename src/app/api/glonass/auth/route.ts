import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Authenticate with Axenta.cloud API and get a token
// POST /api/glonass/auth — login and get token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const apiUrl = body.apiUrl
    const username = body.username
    const password = body.password

    if (!apiUrl || !username || !password) {
      return NextResponse.json(
        { error: 'API URL, логин и пароль обязательны' },
        { status: 400 }
      )
    }

    // Normalize API URL: strip trailing slashes and /api suffix
    // Users may enter "https://axenta.cloud/api" but code adds "/api/..." itself
    let normalizedUrl = apiUrl.replace(/\/+$/, '')
    if (normalizedUrl.endsWith('/api')) {
      normalizedUrl = normalizedUrl.slice(0, -4)
      console.log(`[GLONASS Auth] Stripped /api from URL: ${apiUrl} -> ${normalizedUrl}`)
    }

    // Call Axenta.cloud login API
    const loginUrl = `${normalizedUrl}/api/auth/login/`
    console.log(`[GLONASS Auth] Attempting login to: ${loginUrl}`)

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`
      try {
        const errorData = await response.json()
        if (errorData.nonFieldErrors) {
          errorDetail = errorData.nonFieldErrors.join(', ')
        } else if (errorData.detail) {
          errorDetail = errorData.detail
        } else if (errorData.message) {
          errorDetail = errorData.message
        } else {
          errorDetail = JSON.stringify(errorData)
        }
      } catch {
        errorDetail = await response.text().catch(() => `HTTP ${response.status}`)
      }

      console.error(`[GLONASS Auth] Login failed: ${errorDetail} (URL: ${loginUrl})`)
      return NextResponse.json(
        { error: `Ошибка авторизации: ${errorDetail}`, debugUrl: loginUrl, status: response.status },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[GLONASS Auth] Login successful, token received')

    // Save/update settings with the received token
    await db.axentaSettings.deleteMany()

    const settings = await db.axentaSettings.create({
      data: {
        apiUrl: normalizedUrl,
        apiKey: data.token || data.key || data.auth_token || data.access || '',
        username,
        password,
        syncInterval: body.syncInterval || 300,
        isActive: true,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Авторизация успешна, токен получен и сохранён',
      tokenPreview: settings.apiKey
        ? `${settings.apiKey.substring(0, 8)}...`
        : 'пустой',
      settings: {
        id: settings.id,
        apiUrl: settings.apiUrl,
        isActive: settings.isActive,
        syncInterval: settings.syncInterval,
      }
    })
  } catch (error) {
    console.error('[GLONASS Auth] Error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Ошибка подключения: ${msg}` },
      { status: 500 }
    )
  }
}

// GET /api/glonass/auth — check current auth status
export async function GET() {
  try {
    const settings = await db.axentaSettings.findFirst()

    if (!settings) {
      return NextResponse.json({
        authenticated: false,
        message: 'Настройки Axenta не заданы'
      })
    }

    // Try to verify the token by making a test request
    if (settings.apiKey) {
      try {
        const testUrl = `${settings.apiUrl}/api/objects/`
        const testResponse = await fetch(testUrl, {
          headers: {
            'Authorization': `Token ${settings.apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        })

        if (testResponse.ok) {
          return NextResponse.json({
            authenticated: true,
            message: 'Токен действителен',
            apiUrl: settings.apiUrl,
            isActive: settings.isActive,
            lastSyncAt: settings.lastSyncAt,
            syncInterval: settings.syncInterval,
          })
        } else if (testResponse.status === 401 || testResponse.status === 403) {
          // Token expired, try to re-login
          if (settings.username && settings.password) {
            const loginUrl = `${settings.apiUrl}/api/auth/login/`
            const loginResponse = await fetch(loginUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: settings.username,
                password: settings.password,
              }),
              signal: AbortSignal.timeout(10000),
            })

            if (loginResponse.ok) {
              const loginData = await loginResponse.json()
              const newToken = loginData.token || loginData.key || loginData.auth_token || loginData.access || ''

              await db.axentaSettings.update({
                where: { id: settings.id },
                data: { apiKey: newToken }
              })

              return NextResponse.json({
                authenticated: true,
                message: 'Токен обновлён',
                apiUrl: settings.apiUrl,
                isActive: settings.isActive,
                lastSyncAt: settings.lastSyncAt,
                syncInterval: settings.syncInterval,
              })
            }
          }

          return NextResponse.json({
            authenticated: false,
            message: 'Токен истёк, требуется повторная авторизация',
            apiUrl: settings.apiUrl,
          })
        }

        return NextResponse.json({
          authenticated: false,
          message: `Сервер вернул статус ${testResponse.status}`,
          apiUrl: settings.apiUrl,
          isActive: settings.isActive,
        })
      } catch {
        return NextResponse.json({
          authenticated: false,
          message: 'Не удалось подключиться к серверу Axenta',
          apiUrl: settings.apiUrl,
          isActive: settings.isActive,
        })
      }
    }

    return NextResponse.json({
      authenticated: false,
      message: 'API-ключ не задан',
      apiUrl: settings.apiUrl,
      isActive: settings.isActive,
    })
  } catch (error) {
    console.error('[GLONASS Auth] Error checking auth:', error)
    return NextResponse.json(
      { error: 'Ошибка проверки авторизации' },
      { status: 500 }
    )
  }
}

// DELETE /api/glonass/auth — logout / clear settings
export async function DELETE() {
  try {
    await db.axentaSettings.deleteMany()
    return NextResponse.json({ success: true, message: 'Настройки Axenta удалены' })
  } catch (error) {
    console.error('[GLONASS Auth] Error deleting settings:', error)
    return NextResponse.json({ error: 'Ошибка удаления настроек' }, { status: 500 })
  }
}
