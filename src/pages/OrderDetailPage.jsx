import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Clock } from 'lucide-react'
import { apiGet } from '../api/client'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import DataTable from '../components/DataTable'
import LoadingBlock from '../components/LoadingBlock'
import { usePermissions } from '../context/AuthContext'
import { formatMoney, formatDate } from '../utils/format'

// Sales vs purchase differ only in labels, the endpoint, and which money cards make sense.
const CONFIG = {
    sales: { base: 'sales-orders', module: 'SALES_ORDERS', titleKey: 'orderDetail.salesTitle', backKey: 'orderDetail.backToSales', listPath: '/sales-orders' },
    purchase: { base: 'purchase-orders', module: 'PURCHASE_ORDERS', titleKey: 'orderDetail.purchaseTitle', backKey: 'orderDetail.backToPurchases', listPath: '/purchase-orders' },
}

function formatDateTime(value) {
    if (!value) return '-'
    return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export default function OrderDetailPage({ type = 'sales' }) {
    const { t } = useTranslation()
    const cfg = CONFIG[type]
    const { id } = useParams()
    const navigate = useNavigate()
    usePermissions(cfg.module) // ensures the page is gated consistently with the rest of the app

    const [details, setDetails] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(false)
        apiGet(`/${cfg.base}/${id}/details`)
            .then((res) => !cancelled && setDetails(res))
            .catch(() => !cancelled && setError(true))
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [cfg.base, id])

    if (loading) return <LoadingBlock text={t('orderDetail.loading')} />
    if (error || !details) {
        return (
            <div className="space-y-4">
                <BackButton label={t(cfg.backKey)} onClick={() => navigate(cfg.listPath)} />
                <LoadingBlock text={t('orderDetail.notFound')} />
            </div>
        )
    }

    const isSales = type === 'sales'
    const tot = details.totals || {}
    const audit = details.audit

    const counterpartyPath = details.counterpartyId
        ? isSales
            ? `/clients/${details.counterpartyId}`
            : `/manufacturers/${details.counterpartyId}`
        : null

    const itemColumns = [
        { key: 'productName', label: t('orderDetail.cols.product'), render: (r) => r.productName || '-' },
        { key: 'sku', label: t('common.sku'), render: (r) => r.sku || '—' },
        { key: 'quantity', label: t('common.qty') },
        { key: 'unitPrice', label: t('orderDetail.cols.unitPrice'), render: (r) => formatMoney(r.unitPrice) },
        { key: 'lineTotal', label: t('orderDetail.cols.lineTotal'), render: (r) => formatMoney(r.lineTotal) },
        ...(isSales
            ? [{ key: 'estUnitCost', label: t('orderDetail.cols.avgCostPerUnit'), render: (r) => (r.estUnitCost != null ? formatMoney(r.estUnitCost) : '—') }]
            : []),
    ]
    const itemRows = (details.items || []).map((it, i) => ({ ...it, _rid: `${it.productId}-${i}` }))

    return (
        <div className="space-y-6">
            <BackButton label={t(cfg.backKey)} onClick={() => navigate(-1)} />

            {/* Header */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-start">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{details.orderNumber || `#${details.id}`}</h1>
                        <StatusBadge status={details.status} />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t(cfg.titleKey)} · {isSales ? t('orderDetail.client') : t('orderDetail.manufacturer')}:{' '}
                        {counterpartyPath ? (
                            <button onClick={() => navigate(counterpartyPath)} className="font-medium text-teal-600 hover:underline dark:text-teal-400">
                                {details.counterpartyName || '—'}
                            </button>
                        ) : (
                            details.counterpartyName || '—'
                        )}
                    </p>
                </div>
            </div>

            {/* Money / quantity summary */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    title={isSales ? t('orderDetail.stats.totalEarned') : t('orderDetail.stats.totalSpend')}
                    value={formatMoney(tot.total)}
                    hint={t('orderDetail.stats.inclDelivery')}
                    color={isSales ? 'teal' : 'amber'}
                />
                <StatCard title={t('orderDetail.stats.subtotal')} value={formatMoney(tot.subtotal)} hint={t('orderDetail.stats.itemsOnly')} color="blue" />
                <StatCard title={t('orderDetail.stats.deliveryPrice')} value={formatMoney(tot.deliveryPrice)} hint={t('orderDetail.stats.perUnit', { value: formatMoney(tot.deliveryPerUnit) })} color="slate" />
                <StatCard title={t('orderDetail.stats.units')} value={tot.totalUnits ?? 0} hint={t('orderDetail.stats.productsCount', { count: tot.productCount ?? 0 })} color="blue" />
                {isSales ? (
                    <>
                        <StatCard title={t('orderDetail.stats.estCost')} value={formatMoney(tot.estCost)} hint={t('orderDetail.stats.avgPurchaseCost')} color="amber" />
                        <StatCard title={t('orderDetail.stats.estProfit')} value={formatMoney(tot.estProfit)} hint={t('orderDetail.stats.estProfitHint')} color="teal" />
                    </>
                ) : (
                    <StatCard title={t('orderDetail.stats.items')} value={itemRows.length} hint={t('orderDetail.stats.lineItems')} color="slate" />
                )}
            </div>

            {/* Line items */}
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">{t('orderDetail.items', { count: itemRows.length })}</h2>
                <DataTable
                    tableId={`${cfg.base}-detail-items`}
                    columns={itemColumns}
                    rows={itemRows}
                    getRowId={(r) => r._rid}
                    onRowClick={(r) => r.productId && navigate(`/products/${r.productId}`)}
                    paginate={false}
                />
            </section>

            {/* Facts + timeline */}
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="mb-4 text-lg font-semibold">{t('orderDetail.details')}</h2>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
                        <Fact label={t('orderDetail.facts.orderDate')} value={formatDate(details.orderDate)} />
                        <Fact label={t('orderDetail.facts.closingDate')} value={formatDate(details.closingDate)} />
                        {!isSales && <Fact label={t('orderDetail.facts.expectedDelivery')} value={formatDate(details.expectedDeliveryDate)} />}
                        <Fact label={t('orderDetail.facts.deliveryAddress')} value={details.deliveryAddress || '—'} />
                    </dl>
                    {details.notes && (
                        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{t('common.notes')}</dt>
                            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{details.notes}</dd>
                        </div>
                    )}
                    <div className="mt-5 flex flex-col gap-1 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        <span>
                            {t('orderDetail.createdBy')} <span className="font-medium text-slate-700 dark:text-slate-200">{audit?.createdBy?.name || '—'}</span>
                            {audit?.createdAt ? ` · ${formatDateTime(audit.createdAt)}` : ''}
                        </span>
                        <span>
                            {t('orderDetail.lastEditedBy')} <span className="font-medium text-slate-700 dark:text-slate-200">{audit?.updatedBy?.name || '—'}</span>
                            {audit?.updatedAt ? ` · ${formatDateTime(audit.updatedAt)}` : ''}
                        </span>
                    </div>
                </div>

                <StatusTimeline events={details.statusHistory || []} />
            </div>
        </div>
    )
}

function StatusTimeline({ events }) {
    const { t } = useTranslation()
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Clock className="h-4 w-4 text-slate-400" /> {t('orderDetail.statusHistory')}
            </h2>
            {events.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">{t('orderDetail.noStatusChanges')}</p>
            ) : (
                <ol className="space-y-4">
                    {events.map((e, i) => (
                        <li key={i} className="relative flex gap-3 pl-1">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                                    {e.fromStatus ? (
                                        <>
                                            <StatusBadge status={e.fromStatus} />
                                            <span className="text-slate-400">→</span>
                                            <StatusBadge status={e.toStatus} />
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-slate-500 dark:text-slate-400">{t('orderDetail.createdAs')}</span>
                                            <StatusBadge status={e.toStatus} />
                                        </>
                                    )}
                                </div>
                                <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                    {formatDateTime(e.changedAt)}
                                    {e.changedBy?.name ? ` · ${e.changedBy.name}` : ''}
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    )
}

function BackButton({ label, onClick }) {
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
