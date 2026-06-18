import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatMoney } from '../utils/format'

// Dependency-free SVG bar chart for the detail pages. Plots one of the configured monthly metrics,
// switchable via the toggle. `data` is a `monthly` array whose objects carry a key per metric, e.g.
//   [{ month: 'YYYY-MM', unitsSold, revenue, unitsPurchased }, ...]
// The product page uses the default metrics below; manufacturer/client pages pass their own via the
// `metrics` prop (keys must match the data objects) and an `initialMetric`.
const W = 760
const H = 260
const PAD = { top: 16, right: 16, bottom: 36, left: 56 }

function formatMonth(ym) {
    const [y, m] = ym.split('-')
    const date = new Date(Number(y), Number(m) - 1, 1)
    return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

export default function TrendChart({ data = [], metrics, initialMetric }) {
    const { t } = useTranslation()
    const defaultMetrics = {
        unitsSold: { label: t('clientDetail.chart.unitsSold'), bar: 'fill-teal-500', accent: 'text-teal-600 dark:text-teal-400', money: false },
        revenue: { label: t('clientDetail.chart.revenue'), bar: 'fill-indigo-500', accent: 'text-indigo-600 dark:text-indigo-400', money: true },
        unitsPurchased: { label: t('manufacturerDetail.chart.unitsPurchased'), bar: 'fill-amber-500', accent: 'text-amber-600 dark:text-amber-400', money: false },
    }
    metrics = metrics || defaultMetrics
    const metricKeys = Object.keys(metrics)
    const [metric, setMetric] = useState(initialMetric || metricKeys[0])
    const activeMetric = metrics[metric] ? metric : metricKeys[0]
    const cfg = metrics[activeMetric]

    const values = data.map((d) => Number(d[activeMetric]) || 0)
    const max = Math.max(1, ...values)
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const slot = data.length > 0 ? plotW / data.length : plotW
    const barW = Math.max(2, Math.min(40, slot * 0.62))
    const labelEvery = Math.ceil(data.length / 12) || 1

    const formatValue = (v) => (cfg.money ? formatMoney(v) : String(v))
    const gridLines = [0, 0.25, 0.5, 0.75, 1]

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('dashboard.chart.activityOverTime')}</h2>
                <div className="inline-flex rounded-xl border border-slate-200 p-0.5 dark:border-slate-700">
                    {Object.entries(metrics).map(([key, m]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setMetric(key)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                activeMetric === key
                                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {data.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
                    {t('dashboard.chart.noOrderActivity')}
                </div>
            ) : (
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${cfg.label} per month`}>
                    {gridLines.map((g) => {
                        const y = PAD.top + plotH * (1 - g)
                        return (
                            <g key={g}>
                                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
                                <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
                                    {cfg.money ? formatMoney(max * g) : Math.round(max * g)}
                                </text>
                            </g>
                        )
                    })}

                    {data.map((d, i) => {
                        const v = Number(d[activeMetric]) || 0
                        const barH = (v / max) * plotH
                        const x = PAD.left + slot * i + (slot - barW) / 2
                        const y = PAD.top + plotH - barH
                        return (
                            <g key={d.month}>
                                <rect x={x} y={y} width={barW} height={barH} rx="2" className={cfg.bar}>
                                    <title>{`${formatMonth(d.month)} · ${formatValue(v)}`}</title>
                                </rect>
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
