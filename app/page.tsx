import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getContents } from './actions'
import ContentCard from './components/ContentCard'

export const dynamic = 'force-dynamic'

export default async function Home() {
    const contents = await getContents()

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-black p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Content Generator</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Verwalte deine Multi-Plattform-Inhalte.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href="/authors"
                            className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                            Autoren
                        </Link>
                        <Link
                            href="/create"
                            className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                            <Plus size={18} />
                            Neu erstellen
                        </Link>
                    </div>
                </div>

                {contents.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
                        <p className="text-zinc-500">Noch keine Inhalte generiert.</p>
                        <Link href="/create" className="text-blue-600 hover:underline mt-2 inline-block">
                            Loslegen
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {contents.map((item) => (
                            <ContentCard key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}
