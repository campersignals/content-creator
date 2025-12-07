'use server'

import { prisma } from '../lib/prisma'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI } from '@google/generative-ai'
import * as cheerio from 'cheerio'

export async function getAuthors() {
    try {
        return await prisma.author.findMany({
            orderBy: { createdAt: 'desc' },
        })
    } catch (error) {
        console.error('Failed to fetch authors:', error)
        return []
    }
}

export async function deleteAuthor(id: string) {
    await prisma.author.delete({ where: { id } })
    revalidatePath('/authors')
}

export async function createAuthor(prevState: any, formData: FormData) {
    console.log('--- createAuthor PARTIAL RESTORE (NO GEMINI) ---')
    try {
        const name = formData.get('name') as string
        const url = formData.get('url') as string
        console.log('Inputs:', { name, url })

        if (!name) {
            console.log('Error: No name provided')
            return { success: false, message: 'Name ist erforderlich' }
        }

        let style = ''

        if (url) {
            console.log('Starting URL analysis...')
            try {
                // 1. Fetch website content SAFELY (Max 40k chars, 5s timeout)
                console.log('Fetching', url)
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
                        if (html.length > 40000) {
                            console.log('Page too large, truncating at 40k chars')
                            html = html.slice(0, 40000)
                            await reader.cancel()
                            break
                        }
                    }
                } else {
                    html = await response.text()
                    html = html.slice(0, 40000)
                }

                console.log('Fetched HTML length (truncated):', html.length)
                console.log('DEBUG: RAW HTML START:', html.substring(0, 500))

                // Use Cheerio to parse and extract useful text
                const $ = cheerio.load(html)

                // Extract SEO Data (safest bet)
                const pageTitle = $('title').text().trim()
                const metaDescription = $('meta[name="description"]').attr('content')?.trim() || ''
                const ogDescription = $('meta[property="og:description"]').attr('content')?.trim() || ''

                // console.log('DEBUG: Title:', pageTitle)
                // console.log('DEBUG: Meta Description:', metaDescription)

                // Remove clutter - LESS AGRESSIVE
                $('script, style, svg, noscript').remove()

                // Try to find main content
                // Select common content containers
                const contentSelectors = ['main', 'article', '#content', '.content', '.post', '.entry-content', 'body']
                let text = ''

                for (const selector of contentSelectors) {
                    const el = $(selector)
                    if (el.length > 0) {
                        const extracted = el.text().replace(/\s+/g, ' ').trim()
                        if (extracted.length > 200) {
                            console.log(`Extracted content from selector: ${selector}`)
                            text = extracted
                            break
                        }
                    }
                }

                if (!text) {
                    // Fallback: just take whatever is in body
                    const bodyText = $('body').text().replace(/\s+/g, ' ').trim()
                    if (bodyText) {
                        text = bodyText
                    } else {
                        console.log('DEBUG: Body text is empty!')
                    }
                }

                if (!text || text.length < 50 || text.includes('function(') || text.includes('var ')) {
                    console.log('Cheerio extraction suspicious. Falling back to Regex stripping.')
                    // Fallback: Regex stripping on the raw HTML
                    text = html
                        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, "")
                        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, "")
                        .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gim, "")
                        .replace(/<!--[\s\S]*?-->/g, "")
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                }

                // Final cleanup of code artifacts (in case regex missed something or it was inline)
                if (text.includes('ShopifyAnalytics') || text.includes('function(') || text.includes('window.')) {
                    console.warn('WARNING: Still seeing code artifacts. Using SEO data primarily.')
                    text = '' // Reset if it's just code
                }

                // Combine SEO data with extracted text (giving SEO data priority if text is short)
                const combinedText = `
                Titel der Seite: ${pageTitle}
                Beschreibung: ${metaDescription} ${ogDescription}
                
                Webseiten-Inhalt:
                ${text.substring(0, 15000)}
                `.trim()

                text = combinedText
                console.log('Final text for analysis length:', text.length)

                if (text.length < 50) {
                    console.warn('WARNING: Extracted text is dangerously short!')
                }

                // 2. Analyze with Gemini
                if (process.env.GOOGLE_API_KEY) {
                    console.log('Calling Gemini...')
                    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
                    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

                    const prompt = `
                    Führe eine detaillierte und tiefgehende Analyse des Schreibstils und der Persona basierend auf dem folgenden Website-Text durch.
                    Ich brauche keine Zusammenfassung des Inhalts, sondern ein "Psychogramm" des Autors/der Autoren für die Content-Erstellung.

                    Analysiere bitte folgende Dimensionen ausführlich:
                    1. **Persona & Charakter**: Wie wirken die Autoren? (z.B. wie die beste Freundin, der strenge Experte, der lustige Kumpel, spiritueller Guide...)
                    2. **Tonalität & Stimmung**: Beschreibe die Atmosphäre der Texte (z.B. herzlich, sarkastisch, motivierend, melancholisch, laut, leise).
                    3. **Sprache & Vokabular**:
                       - Werden Dialekte oder Mundart verwendet? (z.B. Bairisch, Berlinerisch...)
                       - Gibt es spezifische "Lieblingswörter" oder Catchphrases?
                       - Nutzung von Anglizismen oder Fachsprache?
                    4. **Satzbau & Struktur**: Kurze, knackige Sätze oder verschachtelte, poetische Sätze? Viele Fragen an den Leser?
                    5. **Formatierung & Emojis**: Werden Emojis genutzt? Wenn ja, welche Art und wie viele? Gibt es Besonderheiten bei der Groß-/Kleinschreibung?
                    6. **Anrede & Abschied**: Wie werden die Leser begrüßt und verabschiedet?

                    Text Ausschnitt:
                    ${text}
                    
                    Formuliere das Ergebnis als ausführliche Anweisung für einen KI-Texter, der diesen Stil exakt imitieren soll. Beginne direkt mit der Analyse.
                    `

                    const result = await model.generateContent(prompt)
                    style = result.response.text()
                    console.log('Gemini Analysis complete. Style length:', style.length)
                } else {
                    console.log('Skipping author style analysis: GOOGLE_API_KEY is missing.')
                }
            } catch (error) {
                console.error('Error analyzing website:', error)
                // Continue without style if analysis fails
            }
        }

        console.log('Saving to Prisma...', { name, hasStyle: !!style })
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
