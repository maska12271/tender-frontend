import { useTranslation } from 'react-i18next'
import { formatMoney } from '../utils/format'

// Dependency-free grouped SVG bar chart for the dashboard: monthly revenue (sales) next to spend
// (purchases). `data` is the backend `monthly` array: [{ month: 'YYYY-MM', revenue, spend }, ...].
// `showRevenue` / `showSpend` let the caller drop a series the user has no permission to see.
const W = 760
const H = 280
const PAD = { top: 16, right: 16, bottom: 36, left: 64 }

function formatMonth(ym) {
    const [y, m] = ym.split('-')
    const date = new Date(Number(y), Number(m) - 1, 1)
    return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

export default function RevenueSpendChart({ data = [], showRevenue = true, showSpend = true, bare = false }) {
    const { t } = useTranslation()
    const series = [
        showRevenue && { key: 'revenue', label: t('dashboard.chart.revenue'), bar: 'fill-teal-500', dot: 'bg-teal-500' },
        showSpend && { key: 'spend', label: t('dashboard.chart.spend'), bar: 'fill-amber-500', dot: 'bg-amber-500' },
    ].filter(Boolean)

    const values = data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))
    const max = Math.max(1, ...values)
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const slot = data.length > 0 ? plotW / data.length : plotW
    const groupW = Math.min(slot * 0.7, 48)
    const barW = series.length > 0 ? groupW / series.length : groupW
    const labelEvery = Math.ceil(data.length / 12) || 1
    const gridLines = [0, 0.25, 0.5, 0.75, 1]

    const hasData = data.length > 0 && series.length > 0

    return (
        <div className={bare ? 'flex h-full flex-col' : 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900'}>
            <div className={`flex flex-wrap items-center gap-3 ${bare ? 'mb-2 justify-end' : 'mb-4 justify-between'}`}>
                {!bare && <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('dashboard.chart.revenueVsSpend')}</h2>}
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    {series.map((s) => (
                        <span key={s.key} className="inline-flex items-center gap-1.5">
                            <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                            {s.label}
                        </span>
                    ))}
                </div>
            </div>

            {!hasData ? (
                <div className={`flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 ${bare ? 'min-h-0 flex-1' : 'h-56'}`}>
                    {t('dashboard.chart.noActivity')}
                </div>
            ) : (
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    preserveAspectRatio="xMidYMid meet"
                    className={bare ? 'min-h-0 w-full flex-1' : 'w-full'}
                    role="img"
                    aria-label="Revenue and spend per month"
                >
                    {gridLines.map((g) => {
                        const y = PAD.top + plotH * (1 - g)
                        return (
                            <g key={g}>
                                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
                                <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
                                    {formatMoney(max * g)}
                                </text>
                            </g>
                        )
                    })}

                    {data.map((d, i) => {
                        const groupX = PAD.left + slot * i + (slot - groupW) / 2
                        return (
                            <g key={d.month}>
                                {series.map((s, si) => {
                                    const v = Number(d[s.key]) || 0
                                    const barH = (v / max) * plotH
                                    const x = groupX + si * barW
                                    const y = PAD.top + plotH - barH
                                    return (
                                        <rect key={s.key} x={x} y={y} width={Math.max(2, barW - 2)} height={barH} rx="2" className={s.bar}>
                                            <title>{`${formatMonth(d.month)} · ${s.label} ${formatMoney(v)}`}</title>
                                        </rect>
                                    )
                                })}
                                {i % labelEvery === 0 && (
                                    <text
                                        x={PAD.left + slot * i + slot / 2}
                                        y={H - PAD.bottom + 18}
                                        textAnchor="middle"
                                        className="fill-slate-400 text-[10px]"
                                    >
                                        {formatMonth(d.month)}
                                    </text>
                                )}
                            </g>
                        )
                    })}
                </svg>
            )}
        </div>
    )
}
