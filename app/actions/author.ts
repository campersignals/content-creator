'use server'

import { prisma } from '../lib/prisma'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as cheerio from 'cheerio'

export async function getAuthors() {
    return await prisma.author.findMany({
        orderBy: { createdAt: 'desc' },
    })
}

export async function deleteAuthor(id: string) {
    await prisma.author.delete({ where: { id } })
    revalidatePath('/authors')
}

export async function createAuthor(prevState: any, formData: FormData) {
    console.log('--- createAuthor FULL RESTORE ---')
    try {
        const name = formData.get('name') as string
        const url = formData.get('url') as string
        console.log('Inputs:', { name, url })

        if (!name) {
            return { success: false, message: 'Name ist erforderlich' }
        }

        let style = ''

        if (url) {
            console.log('Starting URL analysis for:', url)
            try {
                // 1. Fetch website content SAFELY (Max 40k chars, 5s timeout)
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 8000) // 8s timeout

                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
                    }
                })

                if (!response.ok) throw new Error(`HTTP ${response.status}`)

                // Check content type to avoid downloading binaries
                const contentType = response.headers.get('content-type') || ''
                if (!contentType.includes('text/') && !contentType.includes('json') && !contentType.includes('xml')) {
                    console.log('Skipping analysis: Invalid content-type', contentType)
                    throw new Error('Invalid content type for analysis')
                }

                // Read stream manually to limit memory usage
                const reader = response.body?.getReader()
                let html = ''

                if (reader) {
                    const decoder = new TextDecoder()
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break

                        html += decoder.decode(value, { stream: true })
                        // REDUCED LIMIT FOR VPS STABILITY (40k -> 15k)
                        if (html.length > 15000) {
                            console.log('Page too large, truncating at 15k chars to save memory')
                            html = html.slice(0, 15000)
                            await reader.cancel()
                            break
                        }
                    }
                } else {
                    html = await response.text()
                    html = html.slice(0, 15000)
                }

                // Use Cheerio to parse and extract useful text
                // Check if html is valid before loading
                if (!html) throw new Error("Empty HTML")

                const $ = cheerio.load(html)
                const pageTitle = $('title').text().trim().substring(0, 200)
                const metaDescription = $('meta[name="description"]').attr('content')?.trim().substring(0, 500) || ''

                // Remove clutter - memory intensive selectors removed
                $('script, style, svg, noscript, iframe, img').remove()
                const bodyText = $('body').text().replace(/\s+/g, ' ').trim()

                // Combine relevant text
                const text = `
                Titel: ${pageTitle}
                Beschreibung: ${metaDescription}
                Inhalt: ${bodyText.substring(0, 5000)} 
                `.trim()

                if (text.length < 50) {
                    console.warn('WARNING: Extracted text is dangerously short!')
                }

                // 2. Analyze with Gemini
                if (process.env.GOOGLE_API_KEY) {
                    console.log('Calling Gemini for analysis...')
                    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
                    // Use a slightly faster/cheaper model if desired, but 2.0-flash is good
                    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

                    const prompt = `
                    Führe eine detaillierte Stil-Analyse basierend auf diesem Webseiten-Text durch.
                    Ich brauche ein "Psychogramm" des Autors für die Content-Erstellung (Persona, Tonalität, Sprache, Satzbau).
                    
                    Text Ausschnitt:
                    ${text}
                    `

                    const result = await model.generateContent(prompt)
                    style = result.response.text()
                } else {
                    console.log('Skipping analysis: No API Key')
                }

            } catch (error) {
                console.error('Error analyzing website:', error)
                // Continue without style, do not fail the whole request
            }
        }

        await prisma.author.create({
            data: {
                name,
                url,
                style,
            },
        })
        console.log('Prisma create successful')

        revalidatePath('/authors')
        return { success: true, message: 'Autor erfolgreich angelegt!' }
    } catch (e: any) {
        console.error('CRITICAL ERROR in createAuthor:', e)
        return { success: false, message: 'Server Fehler: ' + (e.message || 'Unknown') }
    }
}

export async function updateAuthor(prevState: any, formData: FormData) {
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const url = formData.get('url') as string
    const style = formData.get('style') as string

    if (!id || !name) {
        return { success: false, message: 'ID und Name sind erforderlich' }
    }

    // If URL changed and style is empty, re-analyze? 
    // For now, we trust the manual style input if provided, or keep existing if not re-analyzed.
    // Actually, the form will send the current style text. If user changed URL but kept style text, it saves that.
    // If user wants re-analysis, they might need to clear style? 
    // Let's keep it simple: We save what is sent.

    await prisma.author.update({
        where: { id },
        data: {
            name,
            url,
            style,
        },
    })

    revalidatePath('/authors')
    return { success: true, message: 'Autor erfolgreich aktualisiert!' }
}
