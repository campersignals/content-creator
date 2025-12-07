'use client'

import { Trash2, Copy, Instagram, Video, FileText, Hash, Check, Pencil, X, Save, Youtube, Loader2, Play } from 'lucide-react'
import { deleteContent, updateContent } from '../actions'
import { startVideoGeneration, checkVideoStatus } from '../actions/video'
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

interface ContentCardProps {
    item: {
        id: string
        keywords: string
        blogText: string
        instaText: string
        tiktokText: string
        youtubeCommunityText: string
        teaser: string
        hashtags: string
        imageUrl?: string | null
        videoUrl?: string | null
        videoStatus?: string | null
        createdAt: Date
    }
}

export default function ContentCard({ item }: ContentCardProps) {
    const [activeTab, setActiveTab] = useState<'blog' | 'insta' | 'tiktok' | 'blog-cs' | 'youtube-community'>('blog')
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editedContent, setEditedContent] = useState({
        blogText: item.blogText,
        instaText: item.instaText,
        tiktokText: item.tiktokText,
        youtubeCommunityText: item.youtubeCommunityText || '',
        teaser: item.teaser,
    })

    // Video State
    const [videoStatus, setVideoStatus] = useState(item.videoStatus || 'IDLE')
    const [videoUrl, setVideoUrl] = useState(item.videoUrl)
    const [videoError, setVideoError] = useState('')
    const [showDirectorMode, setShowDirectorMode] = useState(false)
    const [directorPrompt, setDirectorPrompt] = useState('')

    // Auto-resume polling if status was GENERATING on load
    useEffect(() => {
        if (videoStatus === 'GENERATING') {
            pollVideoStatus()
        }
    }, [])

    const pollVideoStatus = () => {
        const intervalId = setInterval(async () => {
            const result = await checkVideoStatus(item.id)

            if (result.status === 'COMPLETED' && result.videoUrl) {
                setVideoStatus('COMPLETED')
                setVideoUrl(result.videoUrl)
                clearInterval(intervalId)
            } else if (result.status === 'FAILED') {
                setVideoStatus('FAILED')
                setVideoError(result.message || 'Generierung fehlgeschlagen')
                clearInterval(intervalId)
            }
            // If GENERATING, continue polling
        }, 5000) // Poll every 5s

        // Safety: Stop polling after 5 minutes
        setTimeout(() => clearInterval(intervalId), 300000)
    }

    const openDirectorMode = () => {
        // Try to find first scene in brackets [...]
        const sceneMatch = editedContent.tiktokText.match(/\[(.*?)\]/)
        let initialPrompt = ''

        if (sceneMatch && sceneMatch[1]) {
            // Keep it english or translate? Veo understands both but English is safer for "cinematic" prompts.
            // But user is German. Let's provide the raw German text first, users can edit.
            // Add style modifier.
            initialPrompt = `${sceneMatch[1]}. Cinematic, photorealistic 9:16 video, high quality.`
        } else {
            initialPrompt = `Cinematic, photorealistic 9:16 video for TikTok about: ${item.keywords}. High quality, trending style.`
        }

        setDirectorPrompt(initialPrompt)
        setShowDirectorMode(true)
    }

    const handleGenerateVideo = async () => {
        setVideoStatus('GENERATING')
        setVideoError('')
        setShowDirectorMode(false)

        const result = await startVideoGeneration(item.id, directorPrompt)

        if (result.success) {
            pollVideoStatus()
        } else {
            setVideoStatus('FAILED')
            setVideoError(result.message || 'Start fehlgeschlagen')
        }
    }

    const formatBlogCS = () => {
        const slug = item.keywords.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const date = new Date(item.createdAt).toISOString().split('T')[0]

        // Extract title (first line starting with #) or use keywords
        const titleMatch = editedContent.blogText.match(/^#\s+(.+)$/m)
        const title = titleMatch ? titleMatch[1] : item.keywords

        const frontmatter = `---
slug: ${slug}
badge: Blog
title: ${title}
teaser: ${editedContent.teaser || 'Kein Teaser verfügbar.'}
date: ${date}
---`

        const footer = `
- Freemium ohne Login auf <https://campersignals.com>
- Echtzeit-Signale & Pushs mit Entry/Pro – direkt in der App
- Kostenlose 📢 Markt-Updates & Insights jetzt auch auf https://t.me/campersignals_app`

        return `${frontmatter}\n\n${editedContent.blogText}\n\n${footer}`
    }

    const handleCopy = async () => {
        let textToCopy = ''
        switch (activeTab) {
            case 'blog':
                textToCopy = editedContent.blogText
                break
            case 'blog-cs':
                textToCopy = formatBlogCS()
                break
            case 'insta':
                textToCopy = editedContent.instaText
                break
            case 'tiktok':
                textToCopy = editedContent.tiktokText
                break
            case 'youtube-community':
                textToCopy = editedContent.youtubeCommunityText
                break
        }

        try {
            await navigator.clipboard.writeText(textToCopy)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy text: ', err)
        }
    }

    const handleSave = async () => {
        const result = await updateContent(item.id, editedContent)
        if (result.success) {
            setIsEditing(false)
        } else {
            alert(result.message)
        }
    }

    const handleCancel = () => {
        setEditedContent({
            blogText: item.blogText,
            instaText: item.instaText,
            tiktokText: item.tiktokText,
            youtubeCommunityText: item.youtubeCommunityText || '',
            teaser: item.teaser,
        })
        setIsEditing(false)
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {item.imageUrl && (
                <div className="relative h-64 w-full bg-zinc-100 dark:bg-zinc-800">
                    <img
                        src={item.imageUrl}
                        alt={item.keywords}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                <div>
                    <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">{item.keywords}</h3>
                    <p className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSave}
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                title="Speichern"
                            >
                                <Save size={18} />
                            </button>
                            <button
                                onClick={handleCancel}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Abbrechen"
                            >
                                <X size={18} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 text-zinc-400 hover:text-blue-500 transition-colors"
                                title="Bearbeiten"
                            >
                                <Pencil size={18} />
                            </button>
                            <button
                                onClick={handleCopy}
                                className="p-2 text-zinc-400 hover:text-blue-500 transition-colors"
                                title="In die Zwischenablage kopieren"
                            >
                                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                            </button>
                            <button
                                onClick={() => deleteContent(item.id)}
                                className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                                title="Löschen"
                            >
                                <Trash2 size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('blog')}
                    className={`flex-1 min-w-[80px] p-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'blog'
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10'
                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                >
                    <FileText size={16} /> Blog
                </button>
                <button
                    onClick={() => setActiveTab('blog-cs')}
                    className={`flex-1 min-w-[80px] p-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'blog-cs'
                        ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50 dark:bg-purple-900/10'
                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                >
                    <FileText size={16} /> Blog CS
                </button>
                <button
                    onClick={() => setActiveTab('insta')}
                    className={`flex-1 min-w-[80px] p-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'insta'
                        ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50 dark:bg-pink-900/10'
                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                >
                    <Instagram size={16} /> Insta
                </button>
                <button
                    onClick={() => setActiveTab('tiktok')}
                    className={`flex-1 min-w-[80px] p-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'tiktok'
                        ? 'text-black dark:text-white border-b-2 border-black dark:border-white bg-zinc-50/50 dark:bg-zinc-800/50'
                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                >
                    <Video size={16} /> TikTok
                </button>
                <button
                    onClick={() => setActiveTab('youtube-community')}
                    className={`flex-1 min-w-[80px] p-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'youtube-community'
                        ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50 dark:bg-red-900/10'
                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                >
                    <Youtube size={16} /> Community
                </button>
            </div>

            <div className="p-4">
                {isEditing ? (
                    <div className="space-y-4">
                        {activeTab === 'blog' && (
                            <textarea
                                value={editedContent.blogText}
                                onChange={(e) => setEditedContent({ ...editedContent, blogText: e.target.value })}
                                className="w-full h-96 p-4 bg-zinc-50 dark:bg-zinc-800 border-transparent focus:border-blue-500 focus:ring-0 rounded-xl resize-none text-sm font-mono"
                            />
                        )}
                        {activeTab === 'blog-cs' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Teaser</label>
                                    <textarea
                                        value={editedContent.teaser}
                                        onChange={(e) => setEditedContent({ ...editedContent, teaser: e.target.value })}
                                        className="w-full h-24 p-4 bg-zinc-50 dark:bg-zinc-800 border-transparent focus:border-purple-500 focus:ring-0 rounded-xl resize-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-500 mb-1">Blog Text</label>
                                    <textarea
                                        value={editedContent.blogText}
                                        onChange={(e) => setEditedContent({ ...editedContent, blogText: e.target.value })}
                                        className="w-full h-96 p-4 bg-zinc-50 dark:bg-zinc-800 border-transparent focus:border-purple-500 focus:ring-0 rounded-xl resize-none text-sm font-mono"
                                    />
                                </div>
                            </div>
                        )}
                        {activeTab === 'insta' && (
                            <textarea
                                value={editedContent.instaText}
                                onChange={(e) => setEditedContent({ ...editedContent, instaText: e.target.value })}
                                className="w-full h-64 p-4 bg-zinc-50 dark:bg-zinc-800 border-transparent focus:border-pink-500 focus:ring-0 rounded-xl resize-none text-sm"
                            />
                        )}
                        {activeTab === 'tiktok' && (
                            <textarea
                                value={editedContent.tiktokText}
                                onChange={(e) => setEditedContent({ ...editedContent, tiktokText: e.target.value })}
                                className="w-full h-64 p-4 bg-zinc-50 dark:bg-zinc-800 border-transparent focus:border-zinc-500 focus:ring-0 rounded-xl resize-none text-sm"
                            />
                        )}
                        {activeTab === 'youtube-community' && (
                            <textarea
                                value={editedContent.youtubeCommunityText}
                                onChange={(e) => setEditedContent({ ...editedContent, youtubeCommunityText: e.target.value })}
                                className="w-full h-64 p-4 bg-zinc-50 dark:bg-zinc-800 border-transparent focus:border-red-500 focus:ring-0 rounded-xl resize-none text-sm"
                            />
                        )}
                    </div>
                ) : (
                    <div className="min-h-[150px] space-y-4">
                        {/* Video Section for TikTok */}
                        {activeTab === 'tiktok' && (
                            <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-sm flex items-center gap-2">
                                        <Video size={16} />
                                        KI Video (Veo)
                                    </h4>
                                    {videoStatus === 'COMPLETED' && videoUrl && (
                                        <a href={videoUrl} download className="text-xs text-blue-500 hover:underline">
                                            Video herunterladen
                                        </a>
                                    )}
                                </div>

                                {showDirectorMode ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-500 mb-1">
                                                Regie-Anweisung (Prompt)
                                            </label>
                                            <textarea
                                                value={directorPrompt}
                                                onChange={(e) => setDirectorPrompt(e.target.value)}
                                                className="w-full h-24 p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                placeholder="Beschreibe die Szene..."
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setShowDirectorMode(false)}
                                                className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                                            >
                                                Abbrechen
                                            </button>
                                            <button
                                                onClick={handleGenerateVideo}
                                                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                                            >
                                                <Play size={12} fill="currentColor" />
                                                Action!
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {videoStatus === 'IDLE' || videoStatus === 'FAILED' ? (
                                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                                <button
                                                    onClick={openDirectorMode}
                                                    className="bg-black dark:bg-white text-white dark:text-black hover:opacity-90 px-4 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition-all"
                                                >
                                                    <Play size={16} fill="currentColor" />
                                                    Video Generieren
                                                </button>
                                                {videoStatus === 'FAILED' && (
                                                    <p className="text-red-500 text-xs mt-2">{videoError || 'Generierung fehlgeschlagen.'}</p>
                                                )}
                                                <p className="text-zinc-500 text-xs mt-2 max-w-xs">
                                                    Öffnet den Regie-Modus für KI-Videos.
                                                </p>
                                            </div>
                                        ) : videoStatus === 'GENERATING' ? (
                                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                                <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
                                                <p className="font-medium text-sm">Video wird generiert...</p>
                                                <p className="text-zinc-400 text-xs mt-1">Das kann 1-2 Minuten dauern. Du kannst weiterarbeiten.</p>
                                            </div>
                                        ) : videoStatus === 'COMPLETED' && videoUrl ? (
                                            <div className="space-y-3">
                                                <div className="relative aspect-[9/16] max-w-[200px] mx-auto bg-black rounded-lg overflow-hidden shadow-lg">
                                                    <video
                                                        src={videoUrl}
                                                        controls
                                                        className="w-full h-full object-cover"
                                                        playsInline
                                                    />
                                                </div>
                                                <div className="text-center">
                                                    <button
                                                        onClick={openDirectorMode}
                                                        className="text-xs text-zinc-400 hover:text-blue-500 flex items-center justify-center gap-1 mx-auto"
                                                    >
                                                        <Video size={12} />
                                                        Neues Video generieren
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        )}

                        <div className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap prose dark:prose-invert max-w-none">
                            {activeTab === 'blog' && <ReactMarkdown>{editedContent.blogText}</ReactMarkdown>}
                            {activeTab === 'blog-cs' && <div className="font-mono text-xs bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg overflow-x-auto">{formatBlogCS()}</div>}
                            {activeTab === 'insta' && editedContent.instaText}
                            {activeTab === 'tiktok' && editedContent.tiktokText}
                            {activeTab === 'youtube-community' && editedContent.youtubeCommunityText}
                        </div>
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-start gap-2">
                        <Hash size={16} className="text-zinc-400 mt-1 shrink-0" />
                        <p className="text-xs text-blue-500 font-medium leading-relaxed">
                            {item.hashtags}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
