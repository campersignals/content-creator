'use server'

import { prisma } from './lib/prisma'
import OpenAI from 'openai'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function getContents() {
    try {
        return await prisma.generatedContent.findMany({
            orderBy: { createdAt: 'desc' },
        })
    } catch (error) {
        console.error('Failed to fetch contents:', error)
        return []
    }
}

export async function deleteContent(id: string) {
    await prisma.generatedContent.delete({
        where: { id },
    })
    revalidatePath('/')
}

export type State = {
    success: boolean
    message?: string | null
}

import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export async function generateContent(prevState: State, formData: FormData): Promise<State> {
    const keywords = formData.get('keywords') as string
    const tonality = formData.get('tonality') as string
    const length = formData.get('length') as string
    const style = formData.get('style') as string
    const provider = formData.get('provider') as string
    const authorId = formData.get('authorId') as string

    let authorStyle = ''
    if (authorId) {
        const author = await prisma.author.findUnique({ where: { id: authorId } })
        if (author && author.style) {
            authorStyle = `
            WICHTIG: Schreibe im Stil von "${author.name}".
            Stil-Analyse: ${author.style}
            `
        }
    }

    if (!keywords) {
        return { success: false, message: 'Schlüsselwörter sind erforderlich' }
    }

    const prompt = `
    Du bist ein professioneller Content Creator. Erstelle Inhalte für Blog, Instagram, TikTok und YouTube Community basierend auf folgenden Schlüsselwörtern: "${keywords}".
    
    ${authorStyle}

    Berücksichtige dabei folgende Einstellungen:
    - Tonalität (1=sachlich, 5=poetisch/ausschweifend): ${tonality}/5
    - Länge (1=kurz, 5=lang): ${length}/5
    - Stil (1=nüchtern, 5=humorvoll): ${style}/5
    
    Antworte im validen JSON-Format mit folgender Struktur:
    {
        "blogText": "Ein vollständiger, ansprechender Blogpost (Markdown-Format) mit Titel, Einleitung, Hauptteil und Fazit. Sprache: Deutsch.",
        "instaText": "Eine ansprechende Instagram-Bildunterschrift mit Emojis und einer Frage zur Steigerung der Interaktion. Sprache: Deutsch.",
        "tiktokText": "Ein Skript für ein TikTok-Video, inklusive visueller Hinweise in Klammern [] und gesprochenem Text. Sprache: Deutsch.",
        "youtubeCommunityText": "Ein Text für den YouTube Community Tab, ähnlich wie ein Blogpost aber kürzer und prägnanter. Sprache: Deutsch.",
        "teaser": "Eine kurze, neugierig machende Zusammenfassung des Artikels (1-2 Sätze) für die Vorschau. Sprache: Deutsch.",
        "hashtags": "Ein String aus 10-15 relevanten Hashtags, getrennt durch Leerzeichen."
    }
    `

    try {
        let content: any = {}

        if (provider === 'gemini') {
            if (!process.env.GOOGLE_API_KEY) {
                return { success: false, message: 'Google API Key fehlt. Bitte füge GOOGLE_API_KEY zur .env Datei hinzu.' }
            }
            console.log('DEBUG: API Key ends with:', process.env.GOOGLE_API_KEY?.trim().slice(-4));
            const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', generationConfig: { responseMimeType: 'application/json' } })

            const result = await model.generateContent(prompt)
            const response = await result.response
            let text = response.text()

            // Clean up markdown formatting if present
            text = text.replace(/```json/g, '').replace(/```/g, '').trim()

            try {
                content = JSON.parse(text)
            } catch (jsonError) {
                console.error('JSON Parse Error:', jsonError)
                console.error('Raw content:', text)
                // Attempt to repair common JSON issues (basic attempt)
                const repairedText = text.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')
                try {
                    content = JSON.parse(repairedText)
                } catch (retryError) {
                    throw new Error('Empfangenes Format war kein gültiges JSON. Bitte versuche es erneut.')
                }
            }
        } else {
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            })

            const completion = await openai.chat.completions.create({
                messages: [{ role: 'system', content: 'Du bist ein hilfreicher Assistent, der Social Media Inhalte im JSON-Format generiert.' }, { role: 'user', content: prompt }],
                model: 'gpt-4o',
                response_format: { type: 'json_object' },
            })

            let openAiContent = completion.choices[0].message.content || '{}'
            // Clean up potential markdown formatting from OpenAI as well
            openAiContent = openAiContent.replace(/```json/g, '').replace(/```/g, '').trim()
            content = JSON.parse(openAiContent)
        }

        // Image Generation
        let imageUrl = null
        const generateImage = formData.get('generateImage') === 'on'

        if (generateImage) {
            if (!process.env.GOOGLE_API_KEY) {
                console.warn('Skipping image generation: GOOGLE_API_KEY is missing.')
            } else {
                try {
                    const imagePrompt = `High quality, photorealistic image for social media about: ${keywords}. Style: ${Number(style) > 3 ? 'creative, artistic' : 'professional, clean'}.`

                    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${process.env.GOOGLE_API_KEY}`

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            instances: [{ prompt: imagePrompt }],
                            parameters: { sampleCount: 1, aspectRatio: '1:1' }
                        })
                    })

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        console.error('Imagen API Error Data:', JSON.stringify(errorData, null, 2));
                        throw new Error(`Imagen API Error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
                    }

                    const data = await response.json()

                    if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
                        const base64Data = data.predictions[0].bytesBase64Encoded

                        // Ensure directory exists
                        // Store as Data URL directly in DB (Vercel filesystem is ephemeral)
                        // This handles small-medium images. For production large scale, use Vercel Blob.
                        imageUrl = `data:image/png;base64,${base64Data}`
                    } else {
                        console.error('Image generation response invalid:', JSON.stringify(data, null, 2))
                    }
                } catch (error) {
                    console.error('Image generation failed for this request:', error)
                }
            }
        }

        await prisma.generatedContent.create({
            data: {
                keywords,
                blogText: content.blogText || 'Fehler beim Generieren des Blog-Inhalts.',
                instaText: content.instaText || 'Fehler beim Generieren des Instagram-Inhalts.',
                tiktokText: content.tiktokText || 'Fehler beim Generieren des TikTok-Inhalts.',
                youtubeCommunityText: content.youtubeCommunityText || 'Fehler beim Generieren des YouTube Community-Inhalts.',
                teaser: content.teaser || '',
                hashtags: content.hashtags || '#fehler',
                imageUrl,
            },
        })

        revalidatePath('/')
        return { success: true, message: 'Inhalte erfolgreich generiert!' }
    } catch (error: any) {
        console.error('Error generating content:', error)
        if (provider === 'gemini') {
            console.error('Gemini Error Details:', JSON.stringify(error, null, 2))
            if (error.message) console.error('Gemini Error Message:', error.message)
            console.log('Google Key present:', !!process.env.GOOGLE_API_KEY)
        }
        return { success: false, message: `Fehler beim Generieren der Inhalte: ${error.message || 'Unbekannter Fehler'}` }
    }
}

export async function updateContent(id: string, data: { blogText?: string; instaText?: string; tiktokText?: string; youtubeCommunityText?: string; teaser?: string }) {
    try {
        await prisma.generatedContent.update({
            where: { id },
            data,
        })
        revalidatePath('/')
        return { success: true, message: 'Inhalte erfolgreich aktualisiert!' }
    } catch (error) {
        console.error('Error updating content:', error)
        return { success: false, message: 'Fehler beim Aktualisieren der Inhalte.' }
    }
}
