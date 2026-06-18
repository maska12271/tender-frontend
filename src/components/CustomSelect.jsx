import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Search } from 'lucide-react'

/**
 * Reusable select with two modes:
 *  - single (default): pick one value; optional `searchable` filter box (e.g. picking a customer).
 *  - multiple: toggle several values; used by page filters (e.g. several statuses at once).
 *
 * The dropdown is rendered in a portal with fixed positioning so it is never clipped by a
 * scrolling modal body or filter bar.
 *
 * onChange receives the new value: a string (single) or an array of strings (multiple).
 */
export default function CustomSelect({
    options = [],
    value,
    onChange,
    multiple = false,
    searchable = false,
    placeholder,
    disabled = false,
    className = '',
    id,
    ariaLabel,
    onQuickCreate,
}) {
    const { t } = useTranslation()
    const resolvedPlaceholder = placeholder ?? t('select.placeholder')
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [coords, setCoords] = useState(null)
    const triggerRef = useRef(null)
    const panelRef = useRef(null)
    const searchRef = useRef(null)

    const selectedValues = multiple ? (Array.isArray(value) ? value.map(String) : []) : []
    const isSelected = (v) =>
        multiple ? selectedValues.includes(String(v)) : String(value ?? '') === String(v)

    const filtered = useMemo(() => {
        if (!searchable || !query.trim()) return options
        const q = query.toLowerCase()
        return options.filter((o) => String(o.label).toLowerCase().includes(q))
    }, [options, query, searchable])

    const updateCoords = () => {
        const el = triggerRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const gap = 4
        const margin = 8 // keep a little breathing room from the viewport edge
        const preferred = 320 // ideal dropdown height before we start constraining
        const spaceBelow = window.innerHeight - r.bottom - margin
        const spaceAbove = r.top - margin

        // Open downward unless there isn't enough room and there's more space above.
        const openUp = spaceBelow < preferred && spaceAbove > spaceBelow
        const maxHeight = Math.max(160, Math.min(preferred, openUp ? spaceAbove : spaceBelow))

        if (openUp) {
            setCoords({ left: r.left, bottom: window.innerHeight - r.top + gap, width: r.width, maxHeight, openUp })
        } else {
            setCoords({ left: r.left, top: r.bottom + gap, width: r.width, maxHeight, openUp })
        }
    }

    useLayoutEffect(() => {
        if (open) updateCoords()
    }, [open])

    useEffect(() => {
        if (!open) return
        const reposition = () => updateCoords()
        window.addEventListener('scroll', reposition, true)
        window.addEventListener('resize', reposition)
        return () => {
            window.removeEventListener('scroll', reposition, true)
            window.removeEventListener('resize', reposition)
        }
    }, [open])

    useEffect(() => {
        if (!open) return
        const onDown = (e) => {
            if (triggerRef.current?.contains(e.target)) return
            if (panelRef.current?.contains(e.target)) return
            setOpen(false)
        }
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    useEffect(() => {
        if (open && searchable) {
            setQuery('')
            const t = setTimeout(() => searchRef.current?.focus(), 0)
            return () => clearTimeout(t)
        }
    }, [open, searchable])

    const handleSelect = (opt) => {
        if (multiple) {
            const set = new Set(selectedValues)
            const key = String(opt.value)
            if (set.has(key)) set.delete(key)
            else set.add(key)
            onChange(Array.from(set))
        } else {
            onChange(opt.value)
            setOpen(false)
        }
    }

    let triggerLabel = resolvedPlaceholder
    let isPlaceholder = true
    if (multiple) {
        if (selectedValues.length === 1) {
            const o = options.find((opt) => String(opt.value) === selectedValues[0])
            triggerLabel = o ? o.label : t('select.selectedCount', { count: 1 })
            isPlaceholder = false
        } else if (selectedValues.length > 1) {
            triggerLabel = t('select.selectedCount', { count: selectedValues.length })
            isPlaceholder = false
        }
    } else {
        const o = options.find((opt) => String(opt.value) === String(value ?? ''))
        if (o) {
            triggerLabel = o.label
            isPlaceholder = false
        }
    }

    return (
        <>
            <button
                type="button"
                id={id}
                ref={triggerRef}
                onClick={() => !disabled && setOpen((o) => !o)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-left outline-none focus:border-teal-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 ${className}`}
            >
                <span className={`truncate ${isPlaceholder ? 'text-slate-400 dark:text-slate-500' : ''}`}>
                    {triggerLabel}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && coords &&
                createPortal(
                    <div
                        ref={panelRef}
                        style={{
                            position: 'fixed',
                            left: coords.left,
                            width: coords.width,
                            maxHeight: coords.maxHeight,
                            ...(coords.openUp ? { bottom: coords.bottom } : { top: coords.top }),
                        }}
                        className="z-[200] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                    >
                        {searchable && (
                            <div className="shrink-0 border-b border-slate-200 p-2 dark:border-slate-800">
                                <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">
                                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                                    <input
                                        ref={searchRef}
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={t('common.search')}
                                        className="w-full bg-transparent text-sm outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        <ul role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1">
                            {filtered.length === 0 && (
                                <li className="px-3 py-2 text-sm text-slate-400">{t('select.noMatches')}</li>
                            )}
                            {filtered.map((opt) => {
                                const selected = isSelected(opt.value)
                                return (
                                    <li
                                        key={String(opt.value)}
                                        role="option"
                                        aria-selected={selected}
                                        onClick={() => handleSelect(opt)}
                                        className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                                            selected
                                                ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        {multiple && (
                                            <span
                                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                                    selected
                                                        ? 'border-teal-600 bg-teal-600 text-white'
                                                        : 'border-slate-300 dark:border-slate-600'
                                                }`}
                                            >
                                                {selected && <Check className="h-3 w-3" />}
                                            </span>
                                        )}
                                        <span className="flex-1 truncate">{opt.label}</span>
                                        {!multiple && selected && <Check className="h-4 w-4 shrink-0 text-teal-600" />}
                                    </li>
                                )
                            })}
                        </ul>

                        {multiple && selectedValues.length > 0 && (
                            <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-3 py-2 dark:border-slate-800">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('select.selectedCount', { count: selectedValues.length })}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onChange([])}
                                    className="text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
                                >
                                    {t('select.clear')}
                                </button>
                            </div>
                        )}

                        {onQuickCreate && !multiple && (
                            <div className="shrink-0 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        setOpen(false)
                                        onQuickCreate(query.trim())
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20"
                                >
                                    <span className="text-base leading-none font-semibold">+</span>
                                    {query.trim() ? t('select.createNamed', { name: query.trim() }) : t('select.createNew')}
                                </button>
                            </div>
                        )}
                    </div>,
                    document.body,
                )}
        </>
    )
}
