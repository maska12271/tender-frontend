import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Pencil, ImageOff } from 'lucide-react'
import { apiGet } from '../api/client'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import DataTable from '../components/DataTable'
import LoadingBlock from '../components/LoadingBlock'
import TrendChart from '../components/TrendChart'
import { resolveImageUrl } from '../components/ImageUploadField.jsx'
import { usePermissions } from '../context/AuthContext'
import { formatMoney, formatDate } from '../utils/format'
import { stockStatusOf } from '../utils/stock'

const STOCK_COLOR = { out: 'rose', low: 'amber', ok: 'teal' }

// Statistics period preset keys. Order dates are "YYYY-MM-DD" strings, so ranges are compared
// lexicographically (no timezone math). `all` means no bounds. Labels come from the i18n period.*.
const PERIOD_KEYS = ['all', 'thisMonth', 'lastMonth', 'last12', 'thisYear', 'lastYear']

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function periodRange(key, now = new Date()) {
    const y = now.getFullYear()
    const m = now.getMonth()
    switch (key) {
        case 'thisMonth':
            return { start: ymd(new Date(y, m, 1)), end: ymd(new Date(y, m + 1, 0)) }
        case 'lastMonth':
            return { start: ymd(new Date(y, m - 1, 1)), end: ymd(new Date(y, m, 0)) }
        case 'last12':
            return { start: ymd(new Date(y, m - 11, 1)), end: ymd(new Date(y, m + 1, 0)) }
        case 'thisYear':
            return { start: `${y}-01-01`, end: `${y}-12-31` }
        case 'lastYear':
            return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` }
        default:
            return null
    }
}

// Cancelled orders are still listed in the tables, but never counted toward revenue/cost/profit.
const isCancelled = (line) => String(line.status || '').toUpperCase() === 'CANCELLED'

// Recompute the summary stats from a set of order lines. When the period has no purchases,
// fall back to the all-time weighted-average cost so profit isn't distorted to ~100% margin.
function summarize(salesLines, purchaseLines, allTimeAvgCost) {
    let totalUnitsSold = 0
    let totalRevenue = 0
    const salesIds = new Set()
    for (const l of salesLines) {
        if (isCancelled(l)) continue
        totalUnitsSold += l.quantity || 0
        totalRevenue += Number(l.lineTotal) || 0
        if (l.orderId != null) salesIds.add(l.orderId)
    }
    let totalUnitsPurchased = 0
    let totalPurchaseCost = 0
    const purchaseIds = new Set()
    for (const l of purchaseLines) {
        if (isCancelled(l)) continue
        totalUnitsPurchased += l.quantity || 0
        totalPurchaseCost += Number(l.lineTotal) || 0
        if (l.orderId != null) purchaseIds.add(l.orderId)
    }
    const weightedAvgPurchaseCost = totalUnitsPurchased > 0 ? totalPurchaseCost / totalUnitsPurchased : allTimeAvgCost
    return {
        totalUnitsSold,
        totalRevenue,
        salesOrderCount: salesIds.size,
        totalUnitsPurchased,
        totalPurchaseCost,
        purchaseOrderCount: purchaseIds.size,
        weightedAvgPurchaseCost,
        grossProfit: totalRevenue - weightedAvgPurchaseCost * totalUnitsSold,
        usedFallbackCost: totalUnitsPurchased === 0 && totalUnitsSold > 0,
    }
}

export default function ProductDetailPage() {
    const { t } = useTranslation()
    const { id } = useParams()
    const navigate = useNavigate()
    const { canEdit } = usePermissions('PRODUCTS')

    const [product, setProduct] = useState(null)
    const [details, setDetails] = useState(null)
    const [activeImage, setActiveImage] = useState(0)
    const [period, setPeriod] = useState('all')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(false)
        Promise.all([apiGet(`/products/${id}`), apiGet(`/products/${id}/details`)])
            .then(([productRes, detailsRes]) => {
                if (cancelled) return
                setProduct(productRes)
                setDetails(detailsRes)
                setActiveImage(0)
            })
            .catch(() => !cancelled && setError(true))
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [id])

    if (loading) return <LoadingBlock text={t('productDetail.loading')} />
    if (error || !product) {
        return (
            <div className="space-y-4">
                <BackButton onClick={() => navigate('/products')} label={t('productDetail.back')} />
                <LoadingBlock text={t('productDetail.notFound')} />
            </div>
        )
    }

    const images = product.imageUrls || []
    const stock = stockStatusOf(product)
    const audit = details?.audit

    // Period filtering (client-side, from the order lines the endpoint already returned).
    const range = periodRange(period)
    const inRange = (dateStr) => !range || (dateStr && dateStr >= range.start && dateStr <= range.end)
    const rangeCaption = range ? `${formatDate(range.start)} – ${formatDate(range.end)}` : t('common.allTime')

    const allSales = details?.salesOrders || []
    const allPurchases = details?.purchaseOrders || []
    const allTimeAvgCost = (() => {
        let u = 0
        let c = 0
        for (const l of allPurchases) {
            if (isCancelled(l)) continue
            u += l.quantity || 0
            c += Number(l.lineTotal) || 0
        }
        return u > 0 ? c / u : 0
    })()

    const filteredSales = allSales.filter((o) => inRange(o.orderDate))
    const filteredPurchases = allPurchases.filter((o) => inRange(o.orderDate))
    const summary = details ? summarize(filteredSales, filteredPurchases, allTimeAvgCost) : null
    const monthlyView = (details?.monthly || []).filter(
        (pt) => !range || (pt.month >= range.start.slice(0, 7) && pt.month <= range.end.slice(0, 7)),
    )

    const salesRows = filteredSales.map((o, i) => ({ ...o, _rid: `s-${o.orderId}-${i}` }))
    const purchaseRows = filteredPurchases.map((o, i) => ({ ...o, _rid: `p-${o.orderId}-${i}` }))

    const orderColumns = (counterpartyLabel) => [
        { key: 'orderNumber', label: t('productDetail.orderCols.orderNumber'), render: (r) => r.orderNumber || `#${r.orderId}` },
        { key: 'orderDate', label: t('common.date'), render: (r) => formatDate(r.orderDate) },
        { key: 'status', label: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
        { key: 'counterpartyName', label: counterpartyLabel, render: (r) => r.counterpartyName || '-' },
        { key: 'quantity', label: t('common.qty') },
        { key: 'unitPrice', label: t('productDetail.orderCols.unitPrice'), render: (r) => formatMoney(r.unitPrice) },
        { key: 'lineTotal', label: t('productDetail.orderCols.lineTotal'), render: (r) => formatMoney(r.lineTotal) },
    ]

    return (
        <div className="space-y-6">
            <BackButton onClick={() => navigate(-1)} label={t('productDetail.back')} />

            {/* Header */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-start">
                <div className="space-y-3">
                    <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {product.sku ? `${t('common.sku')} ${product.sku}` : t('productDetail.noSku')}
                        {product.manufacturer?.name ? ` · ${product.manufacturer.name}` : ''}
                        {product.category?.name ? ` · ${product.category.name}` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={product.active ? 'ACTIVE' : 'INACTIVE'} />
                        {stock === 'out' && <StatusBadge status="OUT_OF_STOCK" />}
                        {stock === 'low' && <StatusBadge status="LOW_STOCK" />}
                    </div>
                </div>
                {canEdit && (
                    <button
                        onClick={() => navigate(`/products?edit=${product.id}`)}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
                    >
                        <Pencil className="h-4 w-4" /> {t('productDetail.edit')}
                    </button>
                )}
            </div>

            {/* Gallery + facts */}
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    {images.length > 0 ? (
                        <div className="space-y-3">
                            <div className="aspect-video overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                <img src={resolveImageUrl(images[activeImage])} alt={product.name} className="h-full w-full object-contain" />
                            </div>
                            {images.length > 1 && (
                                <div className="flex flex-wrap gap-2">
                                    {images.map((url, i) => (
                                        <button
                                            key={`${url}-${i}`}
                                            type="button"
                                            onClick={() => setActiveImage(i)}
                                            className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition ${
                                                i === activeImage ? 'border-teal-500' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                        >
                                            <img src={resolveImageUrl(url)} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                            <ImageOff className="h-8 w-8" />
                            <span className="text-sm">{t('productDetail.noImages')}</span>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
                        <Fact label={t('productDetail.facts.price')} value={formatMoney(product.price)} />
                        <Fact label={t('productDetail.facts.unit')} value={product.unit || '—'} />
                        <Fact label={t('productDetail.facts.size')} value={product.size || '—'} />
                        <Fact
                            label={t('productDetail.facts.inStock')}
                            value={
                                <span className={stock === 'out' ? 'text-rose-600 dark:text-rose-400' : stock === 'low' ? 'text-amber-600 dark:text-amber-400' : ''}>
                                    {product.stockQuantity}
                                </span>
                            }
                        />
                        <Fact label={t('productDetail.facts.minimumStock')} value={product.minimumStock} />
                    </dl>
                    {product.description && (
                        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('productDetail.facts.description')}</dt>
                            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{product.description}</dd>
                        </div>
                    )}
                </div>
            </div>

            {/* Analytics */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">{t('productDetail.performance')}</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{rangeCaption}</p>
                </div>
                <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 p-0.5 dark:border-slate-700">
                    {PERIOD_KEYS.map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setPeriod(key)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                                period === key
                                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            {t(`period.${key}`)}
                        </button>
                    ))}
                </div>
            </div>

            {summary && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard title={t('productDetail.stats.totalRevenue')} value={formatMoney(summary.totalRevenue)} hint={t('productDetail.stats.salesOrdersHint', { count: summary.salesOrderCount })} color="teal" />
                    <StatCard title={t('productDetail.stats.unitsSold')} value={summary.totalUnitsSold} hint={t('common.inSelectedPeriod')} color="teal" />
                    <StatCard
                        title={t('productDetail.stats.grossProfit')}
                        value={formatMoney(summary.grossProfit)}
                        hint={summary.usedFallbackCost
                            ? t('productDetail.stats.avgCostAllTime', { cost: formatMoney(summary.weightedAvgPurchaseCost) })
                            : t('productDetail.stats.avgCostHint', { cost: formatMoney(summary.weightedAvgPurchaseCost) })}
                        color="blue"
                    />
                    <StatCard title={t('productDetail.stats.totalPurchaseCost')} value={formatMoney(summary.totalPurchaseCost)} hint={t('productDetail.stats.purchaseOrdersHint', { count: summary.purchaseOrderCount })} color="amber" />
                    <StatCard title={t('productDetail.stats.unitsPurchased')} value={summary.totalUnitsPurchased} hint={t('common.inSelectedPeriod')} color="amber" />
                    <StatCard title={t('productDetail.stats.inStock')} value={product.stockQuantity} hint={t('productDetail.stats.inStockHint', { min: product.minimumStock })} color={STOCK_COLOR[stock]} />
                </div>
            )}

            <TrendChart data={monthlyView} />

            {/* Sales orders */}
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">{t('productDetail.salesOrders', { count: salesRows.length })}</h2>
                <DataTable tableId="product-sales-orders" columns={orderColumns(t('productDetail.orderCols.client'))} rows={salesRows} getRowId={(r) => r._rid} initialPageSize={10} />
            </section>

            {/* Purchase orders */}
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">{t('productDetail.purchaseOrders', { count: purchaseRows.length })}</h2>
                <DataTable tableId="product-purchase-orders" columns={orderColumns(t('productDetail.orderCols.manufacturer'))} rows={purchaseRows} getRowId={(r) => r._rid} initialPageSize={10} />
            </section>

            {/* Audit */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-8">
                    <span>
                        {t('productDetail.audit.createdBy')} <span className="font-medium text-slate-700 dark:text-slate-200">{audit?.createdBy?.name || '—'}</span>
                        {audit?.createdAt ? ` · ${formatDate(audit.createdAt)}` : ''}
                    </span>
                    <span>
                        {t('productDetail.audit.lastEditedBy')} <span className="font-medium text-slate-700 dark:text-slate-200">{audit?.updatedBy?.name || '—'}</span>
                        {audit?.updatedAt ? ` · ${formatDate(audit.updatedAt)}` : ''}
                    </span>
                </div>
            </div>
        </div>
    )
}

function BackButton({ onClick, label }) {
    return (
        <button
            onClick={onClick}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
            <ChevronLeft className="h-4 w-4" /> {label}
        </button>
    )
}

function Fact({ label, value }) {
    return (
        <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">{value}</dd>
        </div>
    )
}
