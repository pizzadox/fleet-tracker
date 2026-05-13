import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string | null
    const category = formData.get('category') as string || 'general'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Save file to public/uploads
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = `/uploads/${fileName}`

    const { writeFileSync } = await import('fs')
    writeFileSync(`./public${filePath}`, buffer)

    const photo = await db.equipmentPhoto.create({
      data: {
        equipmentId: id,
        url: filePath,
        description: description || null,
        category,
      }
    })

    // Add to history
    await db.equipmentHistory.create({
      data: {
        equipmentId: id,
        event: 'photo_added',
        description: `Добавлено фото: ${description || category}`,
        date: new Date(),
      }
    })

    return NextResponse.json(photo, { status: 201 })
  } catch (error) {
    console.error('Error uploading photo:', error)
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 })
    }

    const photo = await db.equipmentPhoto.findUnique({ where: { id: photoId } })
    if (photo) {
      // Try to delete file from filesystem
      try {
        const { unlinkSync } = await import('fs')
        unlinkSync(`./public${photo.url}`)
      } catch {
        // File might not exist, continue with DB delete
      }
      await db.equipmentPhoto.delete({ where: { id: photoId } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
