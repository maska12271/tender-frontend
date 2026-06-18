import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Moon, Sun, Languages, Check } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { SUPPORTED_LANGUAGES } from '../i18n'

function LanguageSwitcher() {
    const { t, i18n } = useTranslation()
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        if (!open) return
        const onClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onClick)
        return () => document.removeEventListener('mousedown', onClick)
    }, [open])

    const current = SUPPORTED_LANGUAGES.find((l) => i18n.resolvedLanguage === l.code) || SUPPORTED_LANGUAGES[0]

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                aria-label={t('header.language')}
                aria-haspopup="menu"
                aria-expanded={open}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
                <Languages className="h-5 w-5" />
                <span>{current.short}</span>
            </button>
            {open && (
                <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
                >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                i18n.changeLanguage(lang.code)
                                setOpen(false)
                            }}
                            className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm font-medium transition ${
                                current.code === lang.code
                                    ? 'text-teal-600 dark:text-teal-300'
                                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'
                            }`}
                        >
                            <span>{lang.label}</span>
                            {current.code === lang.code && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function Header() {
    const { t } = useTranslation()
    const { theme, toggleTheme } = useTheme()

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 md:px-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {t('header.procurementPanel')}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">{t('header.systemTitle')}</h2>
                </div>

                <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                    <button
                        onClick={toggleTheme}
                        aria-label={theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
                        className="rounded-xl border border-slate-300 p-2.5 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                </div>
            </div>
        </header>
    )
}
