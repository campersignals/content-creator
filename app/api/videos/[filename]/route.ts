import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET(
    request: NextRequest,
    { params }: { params: { filename: string } }
) {
    const filename = params.filename

    // Security: Prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return new NextResponse('Invalid filename', { status: 400 })
    }

    const videoPath = path.join(process.cwd(), 'public', 'videos', filename)

    if (!fs.existsSync(videoPath)) {
        return new NextResponse('Video not found', { status: 404 })
    }

    const fileBuffer = fs.readFileSync(videoPath)

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': fileBuffer.length.toString(),
            'Content-Disposition': `inline; filename="${filename}"`,
        },
    })
}
