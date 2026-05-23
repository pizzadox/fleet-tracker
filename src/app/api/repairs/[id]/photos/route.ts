import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string | null
    const category = formData.get('category') as string || 'during'
    const stageId = formData.get('stageId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9а-яА-ЯёЁ.-]/g, '_')}`
    const filePath = `/uploads/${fileName}`

    const { writeFileSync, mkdirSync } = await import('fs')
    const { join } = await import('path')
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    mkdirSync(uploadDir, { recursive: true })
    writeFileSync(join(uploadDir, fileName), buffer)

    const photo = await db.repairPhoto.create({
      data: {
        repairId: id,
        url: filePath,
        description: description || null,
        category,
        stageId: stageId || null,
      }
    })

    return NextResponse.json(photo, { status: 201 })
  } catch (error) {
    console.error('Error uploading repair photo:', error)
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 })
    }

    const photo = await db.repairPhoto.findUnique({ where: { id: photoId } })
    if (photo) {
      try {
        const { unlinkSync } = await import('fs')
        unlinkSync(`./public${photo.url}`)
      } catch {
        // File might not exist
      }
      await db.repairPhoto.delete({ where: { id: photoId } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting repair photo:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
