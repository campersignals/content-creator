'use client'

import { useFormState, useFormStatus } from 'react-dom'

import { createAuthor, getAuthors, deleteAuthor, updateAuthor } from '../actions/author'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Trash2, UserPlus, Globe, Sparkles, Pencil, Save } from 'lucide-react'

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 ${isEditing
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                }`}
        >
            {pending ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
                isEditing ? <Save size={18} /> : <UserPlus size={18} />
            )}
            {isEditing ? 'Speichern' : 'Autor anlegen'}
        </button>
    )
}

export default function AuthorsPage() {
    const [authors, setAuthors] = useState<any[]>([])
    const [editingAuthor, setEditingAuthor] = useState<any | null>(null)

    // We need separate form actions for create and update
    const [createState, createAction] = useFormState(createAuthor, { success: false, message: '' })
    const [updateState, updateAction] = useFormState(updateAuthor, { success: false, message: '' })

    const formRef = useRef<HTMLFormElement>(null)

    // Combined state for display
    const state = editingAuthor ? updateState : createState

    useEffect(() => {
        getAuthors().then(setAuthors)
        if (state.success) {
            // Clear form and edit state on success
            if (editingAuthor) setEditingAuthor(null)
            formRef.current?.reset()
        }
    }, [createState, updateState]) // Re-fetch on any success

    const handleDelete = async (id: string) => {
        if (confirm('Autor wirklich löschen?')) {
            await deleteAuthor(id)
            getAuthors().then(setAuthors)
        }
    }

    const handleEdit = (author: any) => {
        setEditingAuthor(author)
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleCancelEdit = () => {
        setEditingAuthor(null)
        formRef.current?.reset()
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-2 mb-4 transition-colors">
                    <ArrowLeft size={18} /> Zurück zum Dashboard
                </Link>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Autoren verwalten</h1>
                <p className="text-zinc-500 mt-2">Lege Autorenprofile an, um den Schreibstil für die Generierung zu personalisieren.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 h-fit sticky top-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        {editingAuthor ? <Pencil size={20} className="text-blue-600" /> : <UserPlus size={20} />}
                        {editingAuthor ? 'Autor bearbeiten' : 'Neuen Autor anlegen'}
                    </h2>

                    <form ref={formRef} action={editingAuthor ? updateAction : createAction} className="space-y-4">
                        {editingAuthor && <input type="hidden" name="id" value={editingAuthor.id} />}

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                required
                                defaultValue={editingAuthor?.name}
                                placeholder="z.B. Rosa & Ralph"
                                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                            />
                        </div>
                        <div>
                            <label htmlFor="url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Website URL (optional)</label>
                            <input
                                type="url"
                                name="url"
                                id="url"
                                defaultValue={editingAuthor?.url || ''}
                                placeholder="https://www.talkwome.de"
                                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                            />
                            <p className="text-xs text-zinc-500 mt-1">Die URL wird analysiert, um den Schreibstil zu erfassen.</p>
                        </div>

                        {/* Style Field - Always visible if editing, or if we want to allow manual entry from start */}
                        <div>
                            <label htmlFor="style" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Schreibstil & Persona (KI-Analyse)
                            </label>
                            <textarea
                                name="style"
                                id="style"
                                rows={6}
                                defaultValue={editingAuthor?.style}
                                placeholder="Hier erscheint die KI-Analyse. Du kannst sie auch manuell eingeben oder bearbeiten."
                                className="w-full p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm resize-y"
                            />
                        </div>

                        <div className="flex gap-2">
                            {editingAuthor && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 rounded-lg font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                >
                                    Abbrechen
                                </button>
                            )}
                            <SubmitButton isEditing={!!editingAuthor} />
                        </div>

                        {state.message && (
                            <p className={`text-sm ${state.success ? 'text-green-600' : 'text-red-600'}`}>{state.message}</p>
                        )}
                    </form>
                </div>

                {/* List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold mb-4">Vorhandene Autoren</h2>
                    {authors.length === 0 && <p className="text-zinc-500 italic">Noch keine Autoren angelegt.</p>}
                    {authors.map((author) => (
                        <div key={author.id} className={`bg-white dark:bg-zinc-900 p-4 rounded-xl border transition-all relative group ${editingAuthor?.id === author.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-zinc-200 dark:border-zinc-800'}`}>
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button
                                    onClick={() => handleEdit(author)}
                                    className="text-zinc-400 hover:text-blue-500 transition-colors p-1"
                                    title="Bearbeiten"
                                >
                                    <Pencil size={18} />
                                </button>
                                <button
                                    onClick={() => handleDelete(author.id)}
                                    className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                                    title="Löschen"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            <h3 className="font-bold text-lg pr-16">{author.name}</h3>
                            {author.url && (
                                <a href={author.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                    <Globe size={14} /> {author.url}
                                </a>
                            )}
                            {author.style && (
                                <div className="mt-3 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg text-sm text-zinc-600 dark:text-zinc-400">
                                    <div className="flex items-center gap-1 mb-1 text-purple-600 font-medium text-xs uppercase tracking-wider">
                                        <Sparkles size={12} /> KI-Analyse / Stil
                                    </div>
                                    <p className="line-clamp-3">{author.style}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
