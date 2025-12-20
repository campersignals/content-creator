'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900 rounded-2xl p-6 shadow-lg">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>

                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        Es ist ein Fehler aufgetreten!
                    </h2>

                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Das System konnte die Inhalte nicht laden. Dies liegt häufig daran, dass die Verbindung zur Datenbank fehlgeschlagen ist.
                    </p>

                    <div className="w-full bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg text-left overflow-x-auto">
                        <p className="text-xs font-mono text-red-600 dark:text-red-400 break-words">
                            {error.message}
                        </p>
                    </div>

                    <button
                        onClick={
                            // Attempt to recover by trying to re-render the segment
                            () => reset()
                        }
                        className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        <RefreshCcw size={16} />
                        Erneut versuchen
                    </button>
                </div>
            </div>
        </div>
    )
}
