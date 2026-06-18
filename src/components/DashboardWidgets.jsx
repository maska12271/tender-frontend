import { useTranslation } from 'react-i18next'
import { FileText, Package, ShoppingCart } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatMoney, formatDate } from '../utils/format'

const ACTIVITY_META = {
    SALE: { icon: ShoppingCart, tone: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300', verbKey: 'sale', route: '/sales-orders' },
    PURCHASE: { icon: Package, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300', verbKey: 'purchase', route: '/purchase-orders' },
    TENDER: { icon: FileText, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300', verbKey: 'tender', route: '/tenders' },
}

// Unified recent-activity stream across sales, purchases and tenders. Rows link to the matching
// list page (there is no per-record detail route for orders/tenders).
export function ActivityFeed({ items = [], onNavigate }) {
    const { t } = useTranslation()
    if (items.length === 0) {
        return <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">{t('dashboard.activity.none')}</p>
    }
    return (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => {
                const meta = ACTIVITY_META[item.type] || ACTIVITY_META.SALE
                const Icon = meta.icon
                const verb = t(`dashboard.activity.${meta.verbKey}`)
                return (
                    <li key={`${item.type}-${item.id}`}>
                        <button
                            type="button"
                            onClick={() => onNavigate?.(meta.route)}
                            className="flex w-full items-center gap-3 py-2.5 text-left transition hover:opacity-80"
                        >
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}>
                                <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{item.label || `${verb} #${item.id}`}</span>
                                <span className="block text-xs text-slate-400 dark:text-slate-500">{verb} · {formatDate(item.date)}</span>
                            </span>
                            <span className="shrink-0 text-right">
                                <span className="block text-sm font-semibold tabular-nums">{formatMoney(item.amount)}</span>
                                <span className="mt-0.5 block"><StatusBadge status={item.status} /></span>
                            </span>
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}

// Top-N ranking list with a proportional bar. `unit` (e.g. "units") shows the secondary quantity.
export function RankList({ rows = [], emptyText, unit }) {
    if (rows.length === 0) {
        return <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">{emptyText}</p>
    }
    const max = Math.max(1, ...rows.map((r) => Number(r.amount) || 0))
    return (
        <ul className="space-y-3">
            {rows.map((row, i) => {
                const amount = Number(row.amount) || 0
                const pct = Math.round((amount / max) * 100)
                return (
                    <li key={row.id ?? i}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">
                                <span className="mr-2 text-slate-400">{i + 1}.</span>
                                {row.name || '—'}
                            </span>
                            <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">
                                {formatMoney(amount)}
                                {unit ? <span className="ml-1 text-xs text-slate-400">· {row.quantity} {unit}</span> : null}
                            </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500" style={{ width: `${pct}%` }} />
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
