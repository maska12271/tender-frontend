import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UploadCloud, X, Loader2 } from 'lucide-react'
import { apiUpload } from '../api/client'

const BACKEND_BASE = 'http://localhost:8080'
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB — keep in sync with backend multipart limit
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ACCEPTED_LABEL = 'JPG, PNG, GIF or WebP'

export function resolveImageUrl(url) {
    if (!url) return null
    if (url.startsWith('http') || url.startsWith('data:')) return url
    return BACKEND_BASE + url
}

export default function ImageUploadField({ value = [], onChange, className = '' }) {
    const { t } = useTranslation()
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    const [dragOver, setDragOver] = useState(false)
    const fileRef = useRef(null)

    const uploadFiles = async (fileList) => {
        const files = Array.from(fileList)
        if (files.length === 0) return
        setError('')

        const valid = []
        for (const file of files) {
            if (!ACCEPTED_TYPES.includes(file.type)) {
                setError(t('imageUpload.notSupported', { name: file.name, types: ACCEPTED_LABEL }))
                continue
            }
            if (file.size > MAX_SIZE) {
                setError(t('imageUpload.tooLarge', { name: file.name }))
                continue
            }
            valid.push(file)
        }
        if (valid.length === 0) return

        setUploading(true)
        try {
            const results = await Promise.all(
                valid.map((file) => {
                    const formData = new FormData()
                    formData.append('file', file)
                    return apiUpload('/upload/image', formData)
                }),
            )
            onChange([...value, ...results.map((r) => r.url)])
        } finally {
            setUploading(false)
        }
    }

    const handleInputChange = (e) => {
        uploadFiles(e.target.files)
        e.target.value = ''
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        uploadFiles(e.dataTransfer.files)
    }

    const removeAt = (index) => {
        onChange(value.filter((_, i) => i !== index))
    }

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t('imageUpload.label')}</label>

            <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
                    dragOver
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                        : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50'
                }`}
            >
                {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                ) : (
                    <UploadCloud className="h-6 w-6 text-slate-400" />
                )}
                <div className="text-sm text-slate-600 dark:text-slate-300">
                    <span className="font-medium text-teal-600 dark:text-teal-400">{t('imageUpload.clickToUpload')}</span> {t('imageUpload.orDragDrop')}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t('imageUpload.hint', { types: ACCEPTED_LABEL })}
                </p>
            </div>

            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleInputChange}
            />

            {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

            {value.length > 0 && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                    {value.map((url, index) => (
                        <div
                            key={`${url}-${index}`}
                            className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                        >
                            <img src={resolveImageUrl(url)} alt={`${t('imageUpload.label')} ${index + 1}`} className="h-full w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removeAt(index)}
                                aria-label={t('imageUpload.removeImage')}
                                className="absolute right-1 top-1 rounded-full bg-slate-900/60 p-1 text-white opacity-0 transition hover:bg-rose-600 group-hover:opacity-100"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
