import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

function getFocusableElements(container) {
    if (!container) return []
    return Array.from(
        container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
    ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))
}

export default function Modal({ isOpen, title, children, onClose, width = 'max-w-3xl' }) {
    const { t } = useTranslation()
    const dialogRef = useRef(null)
    const lastActiveElementRef = useRef(null)

    useEffect(() => {
        if (!isOpen) return

        lastActiveElementRef.current = document.activeElement

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'

        const dialog = dialogRef.current

        const focusFirst = () => {
            const focusable = getFocusableElements(dialog)
            if (focusable.length > 0) {
                focusable[0].focus()
            } else {
                dialog?.focus()
            }
        }

        const timer = setTimeout(focusFirst, 0)

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
                return
            }

            if (event.key === 'Tab') {
                const focusable = getFocusableElements(dialog)
                if (focusable.length === 0) {
                    event.preventDefault()
                    dialog?.focus()
                    return
                }

                const first = focusable[0]
                const last = focusable[focusable.length - 1]

                if (event.shiftKey) {
                    if (document.activeElement === first || document.activeElement === dialog) {
                        event.preventDefault()
                        last.focus()
                    }
                } else {
                    if (document.activeElement === last) {
                        event.preventDefault()
                        first.focus()
                    }
                }
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            clearTimeout(timer)
            document.body.style.overflow = previousOverflow
            document.removeEventListener('keydown', handleKeyDown)
            lastActiveElementRef.current?.focus?.()
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div
                className={`w-full ${width} rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                ref={dialogRef}
                tabIndex={-1}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                    <h2 id="modal-title" className="text-xl font-semibold">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        {t('common.close')}
                    </button>
                </div>

                <div className="max-h-[80vh] overflow-y-auto p-6">
                    {children}
                </div>
            </div>
        </div>
    )
}