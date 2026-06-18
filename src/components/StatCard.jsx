import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

// Optional month-over-month trend pill. `good` flags whether an increase is a good thing (revenue up
// is good, spend up is not), so the colour reflects business meaning rather than just direction.
function Trend({ pct, good = true }) {
    if (pct == null || !Number.isFinite(pct)) return null
    const up = pct >= 0
    const positive = up === good
    const color = positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
    const Arrow = up ? ArrowUpRight : ArrowDownRight
    return (
        <span className={`inline-flex shrink-0 items-center gap-0.5 font-medium ${color}`}>
            <Arrow className="h-3.5 w-3.5" />
            {Math.abs(pct).toFixed(0)}%
        </span>
    )
}

export default function StatCard({ title, value, hint, color = 'teal', trend, compact = false }) {
    const map = {
        teal: 'from-teal-500 to-cyan-500',
        blue: 'from-blue-500 to-indigo-500',
        amber: 'from-amber-500 to-orange-500',
        rose: 'from-rose-500 to-pink-500',
    }

    return (
        <div className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${compact ? 'p-4' : 'p-5'}`}>
            <div className={`rounded-full bg-gradient-to-r ${map[color]} ${compact ? 'mb-2 h-1.5 w-14' : 'mb-4 h-2 w-20'}`} />
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <p className={`mt-1 truncate font-bold ${compact ? 'text-2xl' : 'text-3xl'}`}>{value}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {trend ? <Trend pct={trend.pct} good={trend.good} /> : null}
                {hint ? <span className="truncate">{hint}</span> : null}
            </p>
        </div>
    )
}
