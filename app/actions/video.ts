'use server'

import { prisma } from '../lib/prisma'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import path from 'path'

export async function startVideoGeneration(contentId: string, prompt: string) {
    console.log('Starting video generation for:', contentId)

    if (!process.env.GOOGLE_API_KEY) {
        return { success: false, message: 'Google API Key fehlt.' }
    }

    try {
        // 1. Call Google Veo API (Long Running)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${process.env.GOOGLE_API_KEY}`

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{ prompt: prompt }],
                parameters: { sampleCount: 1, aspectRatio: '9:16' } // 9:16 for TikTok
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Veo API Start Error:', errorText)
            throw new Error(`Veo API Start Failed: ${errorText}`)
        }

        const data = await response.json()
        const operationName = data.name // e.g., "operations/12345..."

        console.log('Video Operation started:', operationName)

        // 2. Update DB
        await prisma.generatedContent.update({
            where: { id: contentId },
            data: {
                videoStatus: 'GENERATING',
                videoOperationName: operationName,
                videoUrl: null // clear old if any
            }
        })

        revalidatePath('/')
        return { success: true, message: 'Video-Generierung gestartet!' }

    } catch (error: any) {
        console.error('Error starting video gen:', error)
        // Set status to failed
        await prisma.generatedContent.update({
            where: { id: contentId },
            data: { videoStatus: 'FAILED' }
        })
        return { success: false, message: 'Fehler beim Starten: ' + error.message }
    }
}

export async function checkVideoStatus(contentId: string) {
    try {
        const content = await prisma.generatedContent.findUnique({
            where: { id: contentId },
            select: { videoOperationName: true, videoStatus: true }
        })

        if (!content || !content.videoOperationName) {
            return { success: false, status: 'FAILED', message: 'Keine aktive Operation gefunden.' }
        }

        // 1. Check Operation Status
        const url = `https://generativelanguage.googleapis.com/v1beta/${content.videoOperationName}?key=${process.env.GOOGLE_API_KEY}`
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`Status Check Failed: ${response.status}`)
        }

        const data = await response.json()

        // 2. Handle Completion (done: true)
        if (data.done) {

            if (data.error) {
                console.error('Video Generation Google Error:', data.error)
                await prisma.generatedContent.update({
                    where: { id: contentId },
                    data: { videoStatus: 'FAILED' }
                })
                return { success: false, status: 'FAILED', message: 'Generierung gescheitert (Google Error).' }
            }

            // Success! Extract video URI
            // Correct structure for Veo: response.generateVideoResponse.generatedSamples[0].video.uri
            const samples = data.response?.generateVideoResponse?.generatedSamples

            if (samples && samples[0]?.video?.uri) {
                const videoUri = samples[0].video.uri
                console.log('Video URI found:', videoUri)

                // Download the video
                // The URI usually needs the API key appended if not present
                const downloadUrl = `${videoUri}&key=${process.env.GOOGLE_API_KEY}`

                const videoRes = await fetch(downloadUrl)
                if (!videoRes.ok) {
                    throw new Error(`Failed to download video from URI: ${videoRes.status}`)
                }

                const arrayBuffer = await videoRes.arrayBuffer()
                const buffer = Buffer.from(arrayBuffer)

                const fileName = `video-${contentId}-${Date.now()}.mp4`
                const publicDir = path.join(process.cwd(), 'public', 'videos')
                const filePath = path.join(publicDir, fileName)

                fs.writeFileSync(filePath, buffer)

                const publicUrl = `/videos/${fileName}`

                await prisma.generatedContent.update({
                    where: { id: contentId },
                    data: {
                        videoStatus: 'COMPLETED',
                        videoUrl: publicUrl
                    }
                })

                console.log('Video saved to:', filePath)
                revalidatePath('/')
                return { success: true, status: 'COMPLETED', videoUrl: publicUrl }
            } else {
                console.error('Unexpected Response Structure:', JSON.stringify(data, null, 2))
                return { success: false, status: 'FAILED', message: 'Format-Fehler: Video URI nicht gefunden.' }
            }
        }

        // Still running
        return { success: true, status: 'GENERATING' }

    } catch (error: any) {
        console.error('Check Status Error:', error)
        return { success: false, status: 'FAILED', message: error.message }
    }
}
