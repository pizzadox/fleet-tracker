import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const settings = await db.axentaSettings.findFirst()
    return NextResponse.json(settings || { apiUrl: '', apiKey: '', username: '', password: '', syncInterval: 300, isActive: false })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Delete existing settings and create new ones
    await db.axentaSettings.deleteMany()

    const settings = await db.axentaSettings.create({
      data: {
        apiUrl: body.apiUrl,
        apiKey: body.apiKey,
        username: body.username || null,
        password: body.password || null,
        syncInterval: body.syncInterval || 300,
        isActive: body.isActive !== undefined ? body.isActive : true,
      }
    })

    return NextResponse.json(settings, { status: 201 })
  } catch (error) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const existing = await db.axentaSettings.findFirst()

    let settings
    if (existing) {
      settings = await db.axentaSettings.update({
        where: { id: existing.id },
        data: {
          apiUrl: body.apiUrl,
          apiKey: body.apiKey,
          username: body.username || null,
          password: body.password || null,
          syncInterval: body.syncInterval || 300,
          isActive: body.isActive !== undefined ? body.isActive : true,
        }
      })
    } else {
      settings = await db.axentaSettings.create({
        data: {
          apiUrl: body.apiUrl,
          apiKey: body.apiKey,
          username: body.username || null,
          password: body.password || null,
          syncInterval: body.syncInterval || 300,
          isActive: body.isActive !== undefined ? body.isActive : true,
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
