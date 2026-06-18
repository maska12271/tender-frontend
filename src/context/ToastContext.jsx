import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { setErrorHandler } from '../api/client'

const ToastContext = createContext(null)

// How long each kind of toast stays before auto-dismissing (ms). Errors linger longer.
const DEFAULT_DURATION = { success: 4000, info: 5000, error: 7000 }

let nextId = 1

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const remove = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const push = useCallback((type, message, duration) => {
        if (!message) return
        const id = nextId++
        setToasts((prev) => [
            ...prev,
            { id, type, message: String(message), duration: duration ?? DEFAULT_DURATION[type] ?? 5000 },
        ])
        return id
    }, [])

    const toast = useMemo(() => ({
        success: (message, duration) => push('success', message, duration),
        error: (message, duration) => push('error', message, duration),
        info: (message, duration) => push('info', message, duration),
        dismiss: remove,
    }), [push, remove])

    // Surface any failed API request as an error toast, app-wide.
    useEffect(() => {
        setErrorHandler((message) => push('error', message))
        return () => setErrorHandler(null)
    }, [push])

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastViewport toasts={toasts} onClose={remove} />
        </ToastContext.Provider>
    )
}

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return ctx
}

const TYPE_STYLES = {
    success: {
        icon: CheckCircle2,
        wrap: 'border-emerald-200 bg-white dark:border-emerald-900/60 dark:bg-slate-900',
        accent: 'text-emerald-600 dark:text-emerald-400',
    },
    error: {
        icon: AlertCircle,
        wrap: 'border-rose-200 bg-white dark:border-rose-900/60 dark:bg-slate-900',
        accent: 'text-rose-600 dark:text-rose-400',
    },
    info: {
        icon: Info,
        wrap: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
        accent: 'text-teal-600 dark:text-teal-400',
    },
}

function ToastViewport({ toasts, onClose }) {
    return (
        <div className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-3">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </div>
    )
}

function ToastItem({ toast, onClose }) {
    const { id, type, message, duration } = toast
    const style = TYPE_STYLES[type] || TYPE_STYLES.info
    const Icon = style.icon

    const timerRef = useRef(null)
    const remainingRef = useRef(duration)
    const startedRef = useRef(0)

    const startTimer = useCallback(() => {
        startedRef.current = Date.now()
        timerRef.current = setTimeout(() => onClose(id), remainingRef.current)
    }, [id, onClose])

    // Pause on hover by clearing the timer and banking the time left, so the toast never disappears
    // while the user is reading or interacting with it.
    const pauseTimer = useCallback(() => {
        clearTimeout(timerRef.current)
        remainingRef.current -= Date.now() - startedRef.current
    }, [])

    useEffect(() => {
        startTimer()
        return () => clearTimeout(timerRef.current)
    }, [startTimer])

    return (
        <div
            role="status"
            aria-live="polite"
            onMouseEnter={pauseTimer}
            onMouseLeave={startTimer}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-slate-900/5 toast-enter ${style.wrap}`}
        >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${style.accent}`} />
            <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">{message}</p>
            <button
                type="button"
                onClick={() => onClose(id)}
                aria-label="Dismiss"
                className="shrink-0 rounded-md p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}
