import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../api/client'
import PageHeader from '../components/PageHeader'
import SearchFilters from '../components/SearchFilters'
import DataTable from '../components/DataTable'
import DataToolbar from '../components/DataToolbar'
import StatusBadge from '../components/StatusBadge'
import StatusPicker from '../components/StatusPicker'
import ActionMenu from '../components/ActionMenu'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { useModal } from '../hooks/useModal'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { usePermissions } from '../context/AuthContext'
import QuickCreateModal from '../components/QuickCreateModal'
import { useToast } from '../context/ToastContext'
import { formatDate, formatMoney, safeArray } from '../utils/format'
import {FormField, FormSelect, TextareaField} from "../components/FormField.jsx";
import { Pencil, Trash2 } from 'lucide-react'

const exportColumns = [
    { header: 'ID', value: (r) => r.id },
    { header: 'Order no.', value: (r) => r.orderNumber },
    { header: 'Client', value: (r) => r.client?.name || '' },
    { header: 'Status', value: (r) => r.status },
    { header: 'Order date', value: (r) => r.orderDate },
    { header: 'Closing date', value: (r) => r.closingDate },
    { header: 'Delivery address', value: (r) => r.deliveryAddress },
    { header: 'Delivery price', value: (r) => r.deliveryPrice },
    { header: 'Total', value: (r) => r.totalAmount },
    {
        header: 'Items',
        value: (r) => (r.items || []).map((it) => `${it.product?.name || '?'} x${it.quantity} @ ${it.unitPrice}`).join('; '),
    },
    { header: 'Notes', value: (r) => r.notes },
]

const emptyForm = {
    clientId: '',
    tenderId: '',
    orderNumber: '',
    status: 'NEW',
    orderDate: '',
    closingDate: '',
    deliveryAddress: '',
    notes: '',
    deliveryPrice: 0,
    items: [
        {
            productId: '',
            quantity: 1,
            unitPrice: 0,
        },
    ],
}

export default function SalesOrdersPage() {
    const { t } = useTranslation()
    const { canCreate, canEdit, canDelete } = usePermissions('SALES_ORDERS')
    const navigate = useNavigate()
    const toast = useToast()
    const { quickCreate, openQuickCreate, closeQuickCreate, handleQuickCreated } = useQuickCreate()
    const formModal = useModal()
    const deleteModal = useModal()
    const bulkDeleteModal = useModal()

    const [rows, setRows] = useState([])
    const [clients, setClients] = useState([])
    const [products, setProducts] = useState([])
    const [tenders, setTenders] = useState([])
    const [form, setForm] = useState(emptyForm)
    const [editingId, setEditingId] = useState(null)
    const [deletingItem, setDeletingItem] = useState(null)
    const [selectedIds, setSelectedIds] = useState([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState([])
    const [clientFilter, setClientFilter] = useState([])
    const [loading, setLoading] = useState(false)
    const [statusLoading, setStatusLoading] = useState({})

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const [ordersRes, clientsRes, productsRes, tendersRes] = await Promise.all([
            apiGet('/sales-orders?page=0&size=500&sortBy=id&sortDir=desc'),
            apiGet('/clients?page=0&size=500&sortBy=id&sortDir=asc'),
            apiGet('/products?page=0&size=500&sortBy=id&sortDir=asc'),
            apiGet('/tenders?page=0&size=500&sortBy=id&sortDir=asc'),
        ])

        setRows(safeArray(ordersRes))
        setClients(safeArray(clientsRes))
        setProducts(safeArray(productsRes))
        setTenders(safeArray(tendersRes))
    }

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const q = search.toLowerCase()
            const matchesSearch =
                !search ||
                row.orderNumber?.toLowerCase().includes(q) ||
                row.client?.name?.toLowerCase().includes(q) ||
                row.status?.toLowerCase().includes(q)

            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(row.status)
            const matchesClient = clientFilter.length === 0 || clientFilter.includes(String(row.client?.id))

            return matchesSearch && matchesStatus && matchesClient
        })
    }, [rows, search, statusFilter, clientFilter])

    const openCreate = () => {
        setEditingId(null)
        setForm(emptyForm)
        formModal.open()
    }

    const openEdit = (item) => {
        setEditingId(item.id)
        setForm({
            clientId: item.client?.id || '',
            tenderId: item.tender?.id || '',
            orderNumber: item.orderNumber || '',
            status: item.status || 'NEW',
            orderDate: item.orderDate || '',
            closingDate: item.closingDate || '',
            deliveryAddress: item.deliveryAddress || '',
            notes: item.notes || '',
            deliveryPrice: item.deliveryPrice ?? 0,
            items: item.items?.length
                ? item.items.map((it) => ({
                    productId: it.product?.id || '',
                    quantity: it.quantity ?? 1,
                    unitPrice: it.unitPrice ?? 0,
                }))
                : [{ productId: '', quantity: 1, unitPrice: 0 }],
        })
        formModal.open()
    }

    const openDelete = (item) => {
        setDeletingItem(item)
        deleteModal.open()
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleItemChange = (index, field, value) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
        }))
    }

    const addItem = () => {
        setForm((prev) => ({
            ...prev,
            items: [...prev.items, { productId: '', quantity: 1, unitPrice: 0 }],
        }))
    }

    const removeItem = (index) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const payload = {
            clientId: Number(form.clientId),
            tenderId: form.tenderId ? Number(form.tenderId) : null,
            orderNumber: form.orderNumber || null,
            status: form.status,
            orderDate: form.orderDate || null,
            closingDate: form.closingDate || null,
            deliveryAddress: form.deliveryAddress,
            notes: form.notes,
            deliveryPrice: Number(form.deliveryPrice || 0),
            items: form.items.map((item) => ({
                productId: Number(item.productId),
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
            })),
        }

        try {
            if (editingId) {
                await apiPut(`/sales-orders/${editingId}`, payload)
            } else {
                await apiPost('/sales-orders', payload)
            }
            toast.success(editingId ? t('salesOrders.updated') : t('salesOrders.created'))
            formModal.close()
            setEditingId(null)
            setForm(emptyForm)
            await loadData()
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingItem) return
        setLoading(true)
        try {
            await apiDelete(`/sales-orders/${deletingItem.id}`)
            toast.success(t('salesOrders.deleted'))
            deleteModal.close()
            setDeletingItem(null)
            setSelectedIds((prev) => prev.filter((id) => id !== deletingItem.id))
            await loadData()
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (row, newStatus) => {
        setStatusLoading((prev) => ({ ...prev, [row.id]: true }))
        // Optimistic update
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: newStatus } : r)))
        try {
            await apiPatch(`/sales-orders/${row.id}/status`, { status: newStatus })
            toast.success(t('toast.statusUpdated'))
        } catch {
            // Revert on failure
            setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)))
        } finally {
            setStatusLoading((prev) => ({ ...prev, [row.id]: false }))
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return
        setLoading(true)
        try {
            await Promise.all(selectedIds.map((id) => apiDelete(`/sales-orders/${id}`)))
            toast.success(t('salesOrders.bulkDeleted', { count: selectedIds.length }))
            bulkDeleteModal.close()
            setSelectedIds([])
            await loadData()
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        { key: 'orderNumber', label: t('salesOrders.cols.orderNo') },
        { key: 'client', label: t('salesOrders.cols.client'), render: (row) => row.client?.name || '-' },
        {
            key: 'status',
            label: t('common.status'),
            render: (row) => (
                <span onClick={(e) => e.stopPropagation()}>
                    <StatusPicker
                        status={row.status}
                        onSelect={canEdit ? (s) => handleStatusChange(row, s) : undefined}
                        loading={!!statusLoading[row.id]}
                    />
                </span>
            ),
        },
        { key: 'orderDate', label: t('salesOrders.cols.orderDate'), render: (row) => formatDate(row.orderDate) },
        { key: 'totalAmount', label: t('common.total'), render: (row) => formatMoney(row.totalAmount) },
        ...((canEdit || canDelete) ? [{
            key: 'actions',
            label: '',
            render: (row) => (
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                        actions={[
                            ...(canEdit ? [{ key: 'edit', label: t('common.edit'), icon: Pencil, onClick: () => openEdit(row) }] : []),
                            ...(canDelete ? [{ key: 'delete', label: t('common.delete'), icon: Trash2, danger: true, onClick: () => openDelete(row) }] : []),
                        ]}
                    />
                </div>
            ),
        }] : []),
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('salesOrders.title')}
                description={t('salesOrders.description')}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <DataToolbar
                            entityLabel="sales-orders"
                            exportColumns={exportColumns}
                            rows={filteredRows}
                        />
                        {canCreate && (
                            <button onClick={openCreate} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
                                {t('salesOrders.add')}
                            </button>
                        )}
                    </div>
                }
            />

            <SearchFilters
                search={search}
                onSearchChange={setSearch}
                filters={[
                    {
                        key: 'client',
                        value: clientFilter,
                        onChange: setClientFilter,
                        placeholder: t('common.allClients'),
                        options: clients.map((c) => ({ value: String(c.id), label: c.name })),
                    },
                    {
                        key: 'status',
                        value: statusFilter,
                        onChange: setStatusFilter,
                        placeholder: t('common.allStatuses'),
                        options: [
                            { value: 'NEW', label: t('statuses.NEW') },
                            { value: 'IN_PROGRESS', label: t('statuses.IN_PROGRESS') },
                            { value: 'CONFIRMED', label: t('statuses.CONFIRMED') },
                            { value: 'SHIPPED', label: t('statuses.SHIPPED') },
                            { value: 'CLOSED', label: t('statuses.CLOSED') },
                            { value: 'CANCELLED', label: t('statuses.CANCELLED') },
                        ],
                    },
                ]}
            />

            <DataTable
                tableId="sales-orders"
                columns={columns}
                rows={filteredRows}
                onRowClick={(row) => navigate(`/sales-orders/${row.id}`)}
                selectable={canDelete}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                bulkActions={
                    canDelete ? (
                        <button
                            onClick={bulkDeleteModal.open}
                            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                        >
                            <Trash2 className="h-4 w-4" /> {t('common.deleteSelected')}
                        </button>
                    ) : null
                }
            />

            <Modal
                isOpen={formModal.isOpen}
                title={editingId ? t('salesOrders.editTitle') : t('salesOrders.addTitle')}
                onClose={formModal.close}
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <FormSelect
                            id="sales-order-client"
                            label={t('salesOrders.form.client')}
                            name="clientId"
                            value={form.clientId}
                            onChange={handleChange}
                            required
                            searchable
                            placeholder={t('salesOrders.form.selectClient')}
                            options={clients.map((item) => ({ value: String(item.id), label: item.name }))}
                            onQuickCreate={(name) => openQuickCreate('client', name, (item) => {
                                setClients((prev) => [...prev, item.raw])
                                handleChange({ target: { name: 'clientId', value: item.value } })
                            })}
                        />

                        <FormSelect
                            id="sales-order-tender"
                            label={t('salesOrders.form.tender')}
                            name="tenderId"
                            value={form.tenderId}
                            onChange={handleChange}
                            searchable
                            placeholder={t('salesOrders.form.noTender')}
                            options={tenders.map((item) => ({ value: String(item.id), label: item.title }))}
                        />

                        <FormField
                            id="sales-order-number"
                            label={t('salesOrders.form.orderNumber')}
                            name="orderNumber"
                            value={form.orderNumber}
                            onChange={handleChange}
                            placeholder={t('salesOrders.form.orderNumber')}
                        />

                        <FormSelect
                            id="sales-order-status"
                            label={t('common.status')}
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            placeholder={t('salesOrders.form.selectStatus')}
                            options={[
                                { value: 'NEW', label: t('statuses.NEW') },
                                { value: 'IN_PROGRESS', label: t('statuses.IN_PROGRESS') },
                                { value: 'CONFIRMED', label: t('statuses.CONFIRMED') },
                                { value: 'SHIPPED', label: t('statuses.SHIPPED') },
                                { value: 'CLOSED', label: t('statuses.CLOSED') },
                                { value: 'CANCELLED', label: t('statuses.CANCELLED') },
                            ]}
                        />

                        <FormField
                            id="sales-order-date"
                            label={t('salesOrders.form.orderDate')}
                            type="date"
                            name="orderDate"
                            value={form.orderDate}
                            onChange={handleChange}
                        />

                        <FormField
                            id="sales-order-closing-date"
                            label={t('salesOrders.form.closingDate')}
                            type="date"
                            name="closingDate"
                            value={form.closingDate}
                            onChange={handleChange}
                        />

                        <FormField
                            id="sales-order-delivery-price"
                            label={t('salesOrders.form.deliveryPrice')}
                            type="number"
                            step="0.01"
                            name="deliveryPrice"
                            value={form.deliveryPrice}
                            onChange={handleChange}
                            placeholder={t('salesOrders.form.deliveryPrice')}
                        />

                        <FormField
                            id="sales-order-delivery-address"
                            label={t('salesOrders.form.deliveryAddress')}
                            name="deliveryAddress"
                            value={form.deliveryAddress}
                            onChange={handleChange}
                            placeholder={t('salesOrders.form.deliveryAddress')}
                        />
                    </div>

                    <TextareaField
                        id="sales-order-notes"
                        label={t('common.notes')}
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder={t('common.notes')}
                        rows={3}
                    />

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">{t('salesOrders.form.orderItems')}</h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white dark:bg-slate-700"
                            >
                                {t('salesOrders.form.addItem')}
                            </button>
                        </div>

                        {form.items.map((item, index) => (
                            <div
                                key={index}
                                className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[2fr_1fr_1fr_auto] dark:border-slate-800"
                            >
                                <FormSelect
                                    id={`sales-order-item-product-${index}`}
                                    label={t('salesOrders.form.product')}
                                    name={`productId-${index}`}
                                    value={item.productId}
                                    onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                                    required
                                    searchable
                                    placeholder={t('salesOrders.form.selectProduct')}
                                    options={products.map((product) => ({ value: String(product.id), label: product.name }))}
                                    onQuickCreate={(name) => openQuickCreate('product', name, (created) => {
                                        setProducts((prev) => [...prev, created.raw])
                                        handleItemChange(index, 'productId', created.value)
                                    })}
                                />

                                <FormField
                                    id={`sales-order-item-quantity-${index}`}
                                    label={t('common.quantity')}
                                    type="number"
                                    name={`quantity-${index}`}
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                    placeholder={t('common.qty')}
                                />

                                <FormField
                                    id={`sales-order-item-unit-price-${index}`}
                                    label={t('orderDetail.cols.unitPrice')}
                                    type="number"
                                    step="0.01"
                                    name={`unitPrice-${index}`}
                                    value={item.unitPrice}
                                    onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                                    placeholder={t('orderDetail.cols.unitPrice')}
                                />

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 opacity-0 dark:text-slate-200">
                                        {t('common.remove')}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        disabled={form.items.length === 1}
                                        className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                                    >
                                        {t('common.remove')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={formModal.close}
                            className="rounded-xl border border-slate-300 px-4 py-2.5 dark:border-slate-700"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-xl bg-teal-600 px-4 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                        >
                            {loading ? t('common.saving') : editingId ? t('common.saveChanges') : t('salesOrders.createBtn')}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title={t('salesOrders.deleteTitle')}
                message={t('salesOrders.deleteConfirm', { name: deletingItem?.orderNumber || '' })}
                onClose={deleteModal.close}
                onConfirm={handleDelete}
                loading={loading}
            />

            <ConfirmModal
                isOpen={bulkDeleteModal.isOpen}
                title={t('salesOrders.bulkDeleteTitle')}
                message={t('salesOrders.bulkDeleteConfirm', { count: selectedIds.length })}
                onClose={bulkDeleteModal.close}
                onConfirm={handleBulkDelete}
                loading={loading}
            />

            <QuickCreateModal
                type={quickCreate?.type}
                initialName={quickCreate?.name ?? ''}
                isOpen={!!quickCreate}
                onClose={closeQuickCreate}
                onCreated={handleQuickCreated}
            />
        </div>
    )
}