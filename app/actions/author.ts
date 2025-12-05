'use server'

import { prisma } from '../lib/prisma'
import { revalidatePath } from 'next/cache'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
    const name = formData.get('name') as string
    const url = formData.get('url') as string

    if (!name) {
        return { success: false, message: 'Name ist erforderlich' }
    }

    let style = ''

    if (url) {
        try {
            // 1. Fetch website content
            const response = await fetch(url)
            const html = await response.text()

            // Better text extraction
            let text = html
                .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "") // Remove scripts
                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "")   // Remove styles
                .replace(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gm, "") // Remove noscript
                .replace(/<[^>]*>?/gm, ' ') // Remove remaining tags
                .replace(/\s+/g, ' ') // Collapse whitespace
                .trim()
                .slice(0, 15000) // Limit to 15k chars

            // 2. Analyze with Gemini
            if (process.env.GOOGLE_API_KEY) {
                const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

                const prompt = `
                Analysiere den folgenden Website-Text und erstelle eine prägnante Beschreibung des Schreibstils, der Tonalität und der Persona der Autoren.
                
                Fokussiere dich auf:
                - Bevorzugte Anreden/Begrüßungen (z.B. "Servus", "Hallo ihr Lieben")
                - Tonalität (z.B. herzlich, professionell, humorvoll, bayerisch)
                - Typische Phrasen oder Wörter
                - Themenfokus
                
                Text:
                ${text}
                
                Antworte nur mit der Beschreibung, ohne Einleitung.
                `

                const result = await model.generateContent(prompt)
                style = result.response.text()
            }
        } catch (error) {
            console.error('Error analyzing website:', error)
            // Continue without style if analysis fails
        }
    }

    await prisma.author.create({
        data: {
            name,
            url,
            style,
        },
    })

    revalidatePath('/authors')
    return { success: true, message: 'Autor erfolgreich angelegt!' }
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
