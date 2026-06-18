import { useCallback, useEffect, useState } from 'react'
import { COLS, clamp, compact } from '../utils/gridLayout'

export { COLS }

// Catalogue of dashboard widgets: label, default position (x,y) and size (w,h) in grid units, and
// minimum size. Order here is only a fallback; the real arrangement comes from the x/y of each item.
// Grid is COLS (24) wide and rows are 40px, so widths snap to 1/24 and heights to ~half a card row
// — fine enough to size widgets precisely without leaving gaps.
export const DASHBOARD_WIDGETS = [
    { key: 'kpis', label: 'Summary cards', x: 0, y: 0, w: 24, h: 4, minW: 8, minH: 3 },
    { key: 'revenueChart', label: 'Revenue vs spend', x: 0, y: 4, w: 16, h: 8, minW: 8, minH: 5 },
    { key: 'activity', label: 'Recent activity', x: 16, y: 4, w: 8, h: 11, minW: 6, minH: 6 },
    { key: 'lowStock', label: 'Low stock products', x: 0, y: 11, w: 16, h: 8, minW: 8, minH: 5 },
    { key: 'tenders', label: 'Latest tenders', x: 16, y: 15, w: 8, h: 6, minW: 6, minH: 4 },
    { key: 'topClients', label: 'Top clients', x: 0, y: 19, w: 8, h: 6, minW: 6, minH: 4 },
    { key: 'topProducts', label: 'Top products', x: 8, y: 19, w: 8, h: 6, minW: 6, minH: 4 },
]

const STORAGE_PREFIX = 'dashboard-grid-v5'

export const widgetMeta = (key) => DASHBOARD_WIDGETS.find((w) => w.key === key)

const defaultItem = (key) => {
    const m = widgetMeta(key)
    return { key, x: m.x, y: m.y, w: m.w, h: m.h }
}

/**
 * Reconcile a persisted layout with what the user may actually see: keep saved position/size for
 * known+available widgets, drop unknown/forbidden ones, append newly-available widgets that were
 * never placed (and not explicitly removed), then compact so there are no overlaps or gaps. Also
 * reports which available widgets are currently hidden so they can be re-added.
 */
export function resolveLayout(stored, availableKeys) {
    const items = []
    const seen = new Set()
    const removed = new Set(Array.isArray(stored?.removed) ? stored.removed : [])

    for (const it of Array.isArray(stored?.items) ? stored.items : []) {
        const meta = it && widgetMeta(it.key)
        if (!meta || seen.has(it.key) || !availableKeys.has(it.key) || removed.has(it.key)) continue
        const w = clamp(Math.round(it.w) || meta.w, meta.minW, COLS)
        items.push({
            key: it.key,
            x: clamp(Math.round(it.x) || 0, 0, COLS - w),
            y: Math.max(0, Math.round(it.y) || 0),
            w,
            h: Math.max(meta.minH, Math.round(it.h) || meta.h),
        })
        seen.add(it.key)
    }

    for (const meta of DASHBOARD_WIDGETS) {
        if (availableKeys.has(meta.key) && !seen.has(meta.key) && !removed.has(meta.key)) {
            items.push(defaultItem(meta.key))
            seen.add(meta.key)
        }
    }

    const hidden = DASHBOARD_WIDGETS
        .filter((meta) => availableKeys.has(meta.key) && !seen.has(meta.key))
        .map((meta) => meta.key)

    return { items: compact(items), hidden }
}

function readStored(storageKey) {
    try {
        const raw = localStorage.getItem(storageKey)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

/**
 * Per-user dashboard grid layout (widget positions, sizes and which are removed), persisted to
 * localStorage and keyed by user id so each account keeps its own arrangement on a shared machine.
 */
export function useDashboardLayout(userId) {
    const storageKey = `${STORAGE_PREFIX}:${userId ?? 'anon'}`
    const [stored, setStored] = useState(() => readStored(storageKey))

    useEffect(() => {
        setStored(readStored(storageKey))
    }, [storageKey])

    const save = useCallback((next) => {
        setStored(next)
        try {
            localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
            /* storage unavailable — layout simply won't persist */
        }
    }, [storageKey])

    const reset = useCallback(() => {
        try {
            localStorage.removeItem(storageKey)
        } catch {
            /* ignore */
        }
        setStored(null)
    }, [storageKey])

    return { stored, save, reset }
}
