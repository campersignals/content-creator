'use client'

import { useFormStatus, useFormState } from 'react-dom'
import { generateContent, State } from '../actions'
import { getAuthors } from '../actions/author'
import { ArrowLeft, Sparkles, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {pending ? (
                <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Magie wird gewirkt...
                </>
            ) : (
                <>
                    <Sparkles size={20} />
                    Inhalte generieren
                </>
            )}
        </button>
    )
}

export default function CreateForm() {
    const initialState: State = { success: false, message: null }
    const [state, formAction] = useFormState(generateContent, initialState)
    const [provider, setProvider] = useState('openai')
    const [authors, setAuthors] = useState<any[]>([])
    const router = useRouter()

    useEffect(() => {
        getAuthors().then(setAuthors)
    }, [])

    useEffect(() => {
        if (state.success) {
            router.push('/')
        }
    }, [state.success, router])
    return (
        <div className="max-w-xl mx-auto">
            <div className="mb-8">
                <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-2 mb-4 transition-colors">
                    <ArrowLeft size={18} /> Zurück zum Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Neue Generierung</h1>
                <p className="text-zinc-500 mt-2">Gib deine Keywords ein, um Inhalte für alle Plattformen zu generieren.</p>
            </div>

            <form action={formAction} className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <div>
                    <label htmlFor="keywords" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Schlüsselwörter
                    </label>
                    <textarea
                        id="keywords"
                        name="keywords"
                        required
                        placeholder="z.B. Nachhaltige Mode, Sommertrends, Umweltfreundlich"
                        className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border-transparent focus:border-blue-500 focus:ring-0 rounded-xl resize-none h-32 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-all"
                    />
                    <p className="text-xs text-zinc-400 mt-2">Trenne Schlüsselwörter mit Kommas für die besten Ergebnisse.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="tonality" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Tonalität
                        </label>
                        <input
                            type="range"
                            id="tonality"
                            name="tonality"
                            min="1"
                            max="5"
                            defaultValue="3"
                            className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                        />
                        <div className="flex justify-between text-xs text-zinc-500 mt-1">
                            <span>Sachlich</span>
                            <span>Poetisch</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="length" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Länge
                        </label>
                        <input
                            type="range"
                            id="length"
                            name="length"
                            min="1"
                            max="5"
                            defaultValue="3"
                            className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                        />
                        <div className="flex justify-between text-xs text-zinc-500 mt-1">
                            <span>Kurz</span>
                            <span>Lang</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="style" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Stil
                        </label>
                        <input
                            type="range"
                            id="style"
                            name="style"
                            min="1"
                            max="5"
                            defaultValue="3"
                            className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                        />
                        <div className="flex justify-between text-xs text-zinc-500 mt-1">
                            <span>Nüchtern</span>
                            <span>Humorvoll</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        KI-Modell
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                        <label
                            className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all ${provider === 'openai'
                                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-zinc-900'
                                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                                }`}
                        >
                            <input
                                type="radio"
                                name="provider"
                                value="openai"
                                checked={provider === 'openai'}
                                onChange={() => setProvider('openai')}
                                className="sr-only"
                            />
                            <span className="flex flex-1">
                                <span className="flex flex-col">
                                    <span className={`block text-sm font-medium ${provider === 'openai' ? 'text-blue-900 dark:text-blue-100' : 'text-zinc-900 dark:text-zinc-100'}`}>OpenAI</span>
                                    <span className={`mt-1 flex items-center text-xs ${provider === 'openai' ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-500'}`}>GPT-4o</span>
                                </span>
                            </span>
                        </label>
                        <label
                            className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none transition-all ${provider === 'gemini'
                                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-zinc-900'
                                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                                }`}
                        >
                            <input
                                type="radio"
                                name="provider"
                                value="gemini"
                                checked={provider === 'gemini'}
                                onChange={() => setProvider('gemini')}
                                className="sr-only"
                            />
                            <span className="flex flex-1">
                                <span className="flex flex-col">
                                    <span className={`block text-sm font-medium ${provider === 'gemini' ? 'text-blue-900 dark:text-blue-100' : 'text-zinc-900 dark:text-zinc-100'}`}>Google</span>
                                    <span className={`mt-1 flex items-center text-xs ${provider === 'gemini' ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-500'}`}>Gemini 1.5 Pro</span>
                                </span>
                            </span>
                        </label>
                    </div>
                </div>


                <div>
                    <label htmlFor="author" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Autor (Optional)
                    </label>
                    <select
                        id="author"
                        name="authorId"
                        className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border-transparent focus:border-blue-500 focus:ring-0 rounded-xl text-zinc-900 dark:text-zinc-100 appearance-none"
                    >
                        <option value="">Kein Autor ausgewählt</option>
                        {authors.map((author) => (
                            <option key={author.id} value={author.id}>
                                {author.name}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-zinc-400 mt-2">Wähle einen Autor, um dessen Schreibstil zu übernehmen.</p>
                </div>

                <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <input
                        type="checkbox"
                        id="generateImage"
                        name="generateImage"
                        defaultChecked
                        className="w-5 h-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="generateImage" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                        Passendes KI-Bild generieren (Imagen 4.0)
                    </label>
                </div>

                <SubmitButton />
                {
                    state.message && !state.success && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-4 rounded-xl">
                            <AlertCircle size={20} />
                            <p>{state.message}</p>
                        </div>
                    )
                }
            </form >
        </div >
    )
}
