import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, Plus, SlidersHorizontal, X } from 'lucide-react'
import { apiGet } from '../api/client'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import LoadingBlock from '../components/LoadingBlock'
import RevenueSpendChart from '../components/RevenueSpendChart'
import { ActivityFeed, RankList } from '../components/DashboardWidgets'
import DashboardGrid from '../components/DashboardGrid'
import { useDashboardLayout, resolveLayout, widgetMeta } from '../hooks/useDashboardLayout'
import { compact, bottom } from '../utils/gridLayout'
import { formatMoney } from '../utils/format'

// Month-over-month percentage change; treats "from nothing to something" as +100% and "all gone" as
// -100% so the trend pill stays meaningful at the edges.
function pctChange(now, prev) {
    const a = Number(now) || 0
    const b = Number(prev) || 0
    if (b === 0) return a > 0 ? 100 : 0
    return ((a - b) / b) * 100
}

export default function DashboardPage() {
    const { t } = useTranslation()
    const { user } = useAuth()
    const navigate = useNavigate()
    const { stored, save, reset } = useDashboardLayout(user?.id)

    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState([]) // working copy of items while editing

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        apiGet('/dashboard/stats')
            .then((res) => !cancelled && setStats(res))
            .catch(() => !cancelled && setStats(null))
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [])

    // Which widgets have data the user is allowed to see — drives rendering and the add menu.
    const availableKeys = useMemo(() => {
        const keys = new Set()
        if (!stats) return keys
        const hasSales = !!stats.sales
        const hasPurchases = !!stats.purchases
        if (hasSales || hasPurchases || stats.products || stats.tenders) keys.add('kpis')
        if (hasSales || hasPurchases) keys.add('revenueChart')
        if (hasSales || hasPurchases || stats.tenders) keys.add('activity')
        if (stats.products) keys.add('lowStock')
        if (stats.tenders) keys.add('tenders')
        if (hasSales) keys.add('topClients')
        if (hasSales) keys.add('topProducts')
        return keys
    }, [stats])

    const resolved = useMemo(() => resolveLayout(stored, availableKeys), [stored, availableKeys])

    const items = editing ? draft : resolved.items
    const hiddenKeys = editing
        ? [...availableKeys].filter((k) => !draft.some((i) => i.key === k))
        : []

    const enterEdit = () => {
        setDraft(resolved.items.map((i) => ({ ...i })))
        setEditing(true)
    }
    const cancelEdit = () => {
        setEditing(false)
        setDraft([])
    }
    const saveEdit = () => {
        const removed = [...availableKeys].filter((k) => !draft.some((i) => i.key === k))
        save({ items: draft, removed })
        setEditing(false)
        setDraft([])
    }
    const resetEdit = () => {
        reset()
        setEditing(false)
        setDraft([])
    }
    const addWidget = (key) => {
        const m = widgetMeta(key)
        setDraft((d) => compact([...d, { key, x: 0, y: bottom(d), w: m.w, h: m.h }]))
    }
    const removeWidget = (key) => setDraft((d) => compact(d.filter((i) => i.key !== key)))

    if (loading) return <LoadingBlock text={t('dashboard.loading')} />

    const titleOf = (key) => {
        switch (key) {
            case 'kpis':
                return t('dashboard.titles.kpis')
            case 'revenueChart':
                return t('dashboard.titles.revenueChart')
            case 'activity':
                return t('dashboard.titles.activity')
            case 'lowStock':
                return t('dashboard.titles.lowStock', { count: stats?.products?.lowStockCount ?? 0 })
            case 'tenders':
                return t('dashboard.titles.tenders')
            case 'topClients':
                return t('dashboard.titles.topClients')
            case 'topProducts':
                return t('dashboard.titles.topProducts')
            default:
                return t(`dashboard.widgets.${key}`, { defaultValue: widgetMeta(key)?.label || key })
        }
    }

    const renderContent = (key) => {
        switch (key) {
            case 'kpis':
                return <KpiCards stats={stats} />
            case 'revenueChart':
                return <RevenueSpendChart bare data={stats.monthly || []} showRevenue={!!stats.sales} showSpend={!!stats.purchases} />
            case 'activity':
                return <ActivityFeed items={stats.activity || []} onNavigate={navigate} />
            case 'lowStock':
                return (
                    <DataTable
                        bare
                        tableId="dashboard-low-stock"
                        columns={lowStockColumns(t)}
                        rows={stats.products?.lowStock || []}
                        getRowId={(r) => r.id}
                        onRowClick={editing ? undefined : (r) => navigate(`/products/${r.id}`)}
                        paginate={false}
                    />
                )
            case 'tenders':
                return (
                    <DataTable
                        bare
                        tableId="dashboard-latest-tenders"
                        columns={tenderColumns(t)}
                        rows={stats.tenders?.latest || []}
                        getRowId={(r) => r.id}
                        paginate={false}
                    />
                )
            case 'topClients':
                return <RankList rows={stats.topClients || []} emptyText={t('dashboard.rank.noSales')} />
            case 'topProducts':
                return <RankList rows={stats.topProducts || []} emptyText={t('dashboard.rank.noSales')} unit={t('dashboard.rank.units')} />
            default:
                return null
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('dashboard.title')}
                description={editing ? t('dashboard.descEdit') : t('dashboard.descIdle')}
                action={
                    editing ? (
                        <div className="flex flex-wrap items-center gap-2">
                            {hiddenKeys.length > 0 && <AddWidgetMenu hiddenKeys={hiddenKeys} onAdd={addWidget} />}
                            <button
                                onClick={resetEdit}
                                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                {t('dashboard.reset')}
                            </button>
                            <button
                                onClick={cancelEdit}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                <X className="h-4 w-4" /> {t('dashboard.cancel')}
                            </button>
                            <button
                                onClick={saveEdit}
                                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
                            >
                                <Check className="h-4 w-4" /> {t('dashboard.save')}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={enterEdit}
                            disabled={availableKeys.size === 0}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <SlidersHorizontal className="h-4 w-4" /> {t('dashboard.customize')}
                        </button>
                    )
                }
            />

            {!stats || availableKeys.size === 0 ? (
                <LoadingBlock text={t('dashboard.noData')} />
            ) : items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {t('dashboard.allHidden')}
                </div>
            ) : (
                <DashboardGrid
                    items={items}
                    editing={editing}
                    onChange={setDraft}
                    onRemove={removeWidget}
                    renderContent={renderContent}
                    titleOf={titleOf}
                />
            )}
        </div>
    )
}

function AddWidgetMenu({ hiddenKeys, onAdd }) {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        if (!open) return
        const onDocClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [open])

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
                <Plus className="h-4 w-4" /> {t('dashboard.addWidget')}
            </button>
            {open && (
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    {hiddenKeys.map((key) => (
                        <button
                            key={key}
                            onClick={() => {
                                onAdd(key)
                                setOpen(false)
                            }}
                            className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            {t(`dashboard.widgets.${key}`, { defaultValue: widgetMeta(key)?.label || key })}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function KpiCards({ stats }) {
    const { t } = useTranslation()
    const cards = []
    if (stats.sales) {
        cards.push(
            <StatCard
                key="revenue"
                compact
                title={t('dashboard.kpi.revenueThisMonth')}
                value={formatMoney(stats.sales.thisMonth)}
                hint={t('dashboard.kpi.vsLastMonth')}
                color="teal"
                trend={{ pct: pctChange(stats.sales.thisMonth, stats.sales.lastMonth), good: true }}
            />,
        )
    }
    if (stats.purchases) {
        cards.push(
            <StatCard
                key="spend"
                compact
                title={t('dashboard.kpi.spendThisMonth')}
                value={formatMoney(stats.purchases.thisMonth)}
                hint={t('dashboard.kpi.vsLastMonth')}
                color="amber"
                trend={{ pct: pctChange(stats.purchases.thisMonth, stats.purchases.lastMonth), good: false }}
            />,
        )
    }
    if (stats.sales) {
        cards.push(<StatCard key="active-sales" compact title={t('dashboard.kpi.activeSales')} value={stats.sales.activeCount} hint={t('dashboard.kpi.inProgress')} color="teal" />)
    }
    if (stats.purchases) {
        cards.push(<StatCard key="active-purchases" compact title={t('dashboard.kpi.activePurchases')} value={stats.purchases.activeCount} hint={t('dashboard.kpi.inProgress')} color="blue" />)
    }
    if (stats.tenders) {
        cards.push(<StatCard key="tenders" compact title={t('dashboard.kpi.activeTenders')} value={stats.tenders.activeCount} hint={t('dashboard.kpi.openOrInProgress')} color="blue" />)
    }
    if (stats.products) {
        cards.push(<StatCard key="low-stock" compact title={t('dashboard.kpi.lowStockItems')} value={stats.products.lowStockCount} hint={t('dashboard.kpi.belowMinimum')} color="rose" />)
    }

    // auto-fit columns adapt to the widget's actual width (not the viewport), so cards stay readable
    // whether the widget is full-width or narrow.
    return <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>{cards}</div>
}

const lowStockColumns = (t) => [
    { key: 'name', label: t('dashboard.cols.product') },
    { key: 'manufacturerName', label: t('dashboard.cols.manufacturer'), render: (row) => row.manufacturerName || '-' },
    { key: 'stockQuantity', label: t('dashboard.cols.stock'), render: (row) => <span className="font-semibold text-rose-600 dark:text-rose-400">{row.stockQuantity}</span> },
    { key: 'minimumStock', label: t('dashboard.cols.minStock') },
]

const tenderColumns = (t) => [
    { key: 'title', label: t('dashboard.cols.title') },
    { key: 'status', label: t('dashboard.cols.status'), render: (row) => <StatusBadge status={row.status} /> },
    { key: 'customerName', label: t('dashboard.cols.customer'), render: (row) => row.customerName || '-' },
    { key: 'estimatedValue', label: t('dashboard.cols.value'), render: (row) => formatMoney(row.estimatedValue) },
]
