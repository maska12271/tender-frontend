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
    { header: 'Manufacturer', value: (r) => r.manufacturer?.name || '' },
    { header: 'Status', value: (r) => r.status },
    { header: 'Order date', value: (r) => r.orderDate },
    { header: 'Closing date', value: (r) => r.closingDate },
    { header: 'Expected delivery', value: (r) => r.expectedDeliveryDate },
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
    manufacturerId: '',
    orderNumber: '',
    status: 'NEW',
    orderDate: '',
    closingDate: '',
    expectedDeliveryDate: '',
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

export default function PurchaseOrdersPage() {
    const { t } = useTranslation()
    const { canCreate, canEdit, canDelete } = usePermissions('PURCHASE_ORDERS')
    const navigate = useNavigate()
    const toast = useToast()
    const { quickCreate, openQuickCreate, closeQuickCreate, handleQuickCreated } = useQuickCreate()
    const formModal = useModal()
    const deleteModal = useModal()
    const bulkDeleteModal = useModal()

    const [rows, setRows] = useState([])
    const [manufacturers, setManufacturers] = useState([])
    const [products, setProducts] = useState([])
    const [form, setForm] = useState(emptyForm)
    const [editingId, setEditingId] = useState(null)
    const [deletingItem, setDeletingItem] = useState(null)
    const [selectedIds, setSelectedIds] = useState([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState([])
    const [manufacturerFilter, setManufacturerFilter] = useState([])
    const [loading, setLoading] = useState(false)
    const [statusLoading, setStatusLoading] = useState({})

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const [ordersRes, manufacturersRes, productsRes] = await Promise.all([
            apiGet('/purchase-orders?page=0&size=500&sortBy=id&sortDir=desc'),
            apiGet('/manufacturers?page=0&size=500&sortBy=id&sortDir=asc'),
            apiGet('/products?page=0&size=500&sortBy=id&sortDir=asc'),
        ])

        setRows(safeArray(ordersRes))
        setManufacturers(safeArray(manufacturersRes))
        setProducts(safeArray(productsRes))
    }

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const q = search.toLowerCase()
            const matchesSearch =
                !search ||
                row.orderNumber?.toLowerCase().includes(q) ||
                row.manufacturer?.name?.toLowerCase().includes(q) ||
                row.status?.toLowerCase().includes(q)

            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(row.status)
            const matchesManufacturer = manufacturerFilter.length === 0 || manufacturerFilter.includes(String(row.manufacturer?.id))

            return matchesSearch && matchesStatus && matchesManufacturer
        })
    }, [rows, search, statusFilter, manufacturerFilter])

    const openCreate = () => {
        setEditingId(null)
        setForm(emptyForm)
        formModal.open()
    }

    const openEdit = (item) => {
        setEditingId(item.id)
        setForm({
            manufacturerId: item.manufacturer?.id || '',
            orderNumber: item.orderNumber || '',
            status: item.status || 'NEW',
            orderDate: item.orderDate || '',
            closingDate: item.closingDate || '',
            expectedDeliveryDate: item.expectedDeliveryDate || '',
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
            manufacturerId: Number(form.manufacturerId),
            orderNumber: form.orderNumber || null,
            status: form.status,
            orderDate: form.orderDate || null,
            closingDate: form.closingDate || null,
            expectedDeliveryDate: form.expectedDeliveryDate || null,
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
                await apiPut(`/purchase-orders/${editingId}`, payload)
            } else {
                await apiPost('/purchase-orders', payload)
            }
            toast.success(editingId ? t('purchaseOrders.updated') : t('purchaseOrders.created'))
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
            await apiDelete(`/purchase-orders/${deletingItem.id}`)
            toast.success(t('purchaseOrders.deleted'))
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
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: newStatus } : r)))
        try {
            await apiPatch(`/purchase-orders/${row.id}/status`, { status: newStatus })
            toast.success(t('toast.statusUpdated'))
        } catch {
            setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: row.status } : r)))
        } finally {
            setStatusLoading((prev) => ({ ...prev, [row.id]: false }))
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return
        setLoading(true)
        try {
            await Promise.all(selectedIds.map((id) => apiDelete(`/purchase-orders/${id}`)))
            toast.success(t('purchaseOrders.bulkDeleted', { count: selectedIds.length }))
            bulkDeleteModal.close()
            setSelectedIds([])
            await loadData()
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        { key: 'orderNumber', label: t('purchaseOrders.cols.orderNo') },
        { key: 'manufacturer', label: t('purchaseOrders.cols.manufacturer'), render: (row) => row.manufacturer?.name || '-' },
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
        { key: 'orderDate', label: t('purchaseOrders.cols.orderDate'), render: (row) => formatDate(row.orderDate) },
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
                title={t('purchaseOrders.title')}
                description={t('purchaseOrders.description')}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <DataToolbar
                            entityLabel="purchase-orders"
                            exportColumns={exportColumns}
                            rows={filteredRows}
                        />
                        {canCreate && (
                            <button onClick={openCreate} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
                                {t('purchaseOrders.add')}
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
                        key: 'manufacturer',
                        value: manufacturerFilter,
                        onChange: setManufacturerFilter,
                        placeholder: t('common.allManufacturers'),
                        options: manufacturers.map((m) => ({ value: String(m.id), label: m.name })),
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
                tableId="purchase-orders"
                columns={columns}
                rows={filteredRows}
                onRowClick={(row) => navigate(`/purchase-orders/${row.id}`)}
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
                title={editingId ? t('purchaseOrders.editTitle') : t('purchaseOrders.addTitle')}
                onClose={formModal.close}
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                        <FormSelect
                            id="purchase-order-manufacturer"
                            label={t('purchaseOrders.form.manufacturer')}
                            name="manufacturerId"
                            value={form.manufacturerId}
                            onChange={handleChange}
                            required
                            searchable
                            placeholder={t('purchaseOrders.form.selectManufacturer')}
                            options={manufacturers.map((item) => ({ value: String(item.id), label: item.name }))}
                            onQuickCreate={(name) => openQuickCreate('manufacturer', name, (item) => {
                                setManufacturers((prev) => [...prev, item.raw])
                                handleChange({ target: { name: 'manufacturerId', value: item.value } })
                            })}
                        />

                        <FormField
                            id="purchase-order-number"
                            label={t('purchaseOrders.form.orderNumber')}
                            name="orderNumber"
                            value={form.orderNumber}
                            onChange={handleChange}
                            placeholder={t('purchaseOrders.form.orderNumber')}
                        />

                        <FormSelect
                            id="purchase-order-status"
                            label={t('common.status')}
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            placeholder={t('purchaseOrders.form.selectStatus')}
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
                            id="purchase-order-date"
                            label={t('purchaseOrders.form.orderDate')}
                            type="date"
                            name="orderDate"
                            value={form.orderDate}
                            onChange={handleChange}
                        />

                        <FormField
                            id="purchase-order-closing-date"
                            label={t('purchaseOrders.form.closingDate')}
                            type="date"
                            name="closingDate"
                            value={form.closingDate}
                            onChange={handleChange}
                        />

                        <FormField
                            id="purchase-order-expected-delivery"
                            label={t('purchaseOrders.form.expectedDelivery')}
                            type="date"
                            name="expectedDeliveryDate"
                            value={form.expectedDeliveryDate}
                            onChange={handleChange}
                        />

                        <FormField
                            id="purchase-order-delivery-price"
                            label={t('purchaseOrders.form.deliveryPrice')}
                            type="number"
                            step="0.01"
                            name="deliveryPrice"
                            value={form.deliveryPrice}
                            onChange={handleChange}
                            placeholder={t('purchaseOrders.form.deliveryPrice')}
                        />

                        <FormField
                            id="purchase-order-delivery-address"
                            label={t('purchaseOrders.form.deliveryAddress')}
                            name="deliveryAddress"
                            value={form.deliveryAddress}
                            onChange={handleChange}
                            placeholder={t('purchaseOrders.form.deliveryAddress')}
                        />
                    </div>

                    <TextareaField
                        id="purchase-order-notes"
                        label={t('common.notes')}
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder={t('common.notes')}
                        rows={3}
                    />

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">{t('purchaseOrders.form.orderItems')}</h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white dark:bg-slate-700"
                            >
                                {t('purchaseOrders.form.addItem')}
                            </button>
                        </div>

                        {form.items.map((item, index) => (
                            <div
                                key={index}
                                className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[2fr_1fr_1fr_auto] dark:border-slate-800"
                            >
                                <FormSelect
                                    id={`purchase-order-item-product-${index}`}
                                    label={t('purchaseOrders.form.product')}
                                    name={`productId-${index}`}
                                    value={item.productId}
                                    onChange={(e) => handleItemChange(index, "productId", e.target.value)}
                                    required
                                    searchable
                                    placeholder={t('purchaseOrders.form.selectProduct')}
                                    options={products.map((product) => ({ value: String(product.id), label: product.name }))}
                                    onQuickCreate={(name) => openQuickCreate('product', name, (created) => {
                                        setProducts((prev) => [...prev, created.raw])
                                        handleItemChange(index, 'productId', created.value)
                                    })}
                                />

                                <FormField
                                    id={`purchase-order-item-quantity-${index}`}
                                    label={t('common.quantity')}
                                    type="number"
                                    name={`quantity-${index}`}
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                    placeholder={t('common.qty')}
                                />

                                <FormField
                                    id={`purchase-order-item-unit-price-${index}`}
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
                            {loading ? t('common.saving') : editingId ? t('common.saveChanges') : t('purchaseOrders.createBtn')}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title={t('purchaseOrders.deleteTitle')}
                message={t('purchaseOrders.deleteConfirm', { name: deletingItem?.orderNumber || '' })}
                onClose={deleteModal.close}
                onConfirm={handleDelete}
                loading={loading}
            />

            <ConfirmModal
                isOpen={bulkDeleteModal.isOpen}
                title={t('purchaseOrders.bulkDeleteTitle')}
                message={t('purchaseOrders.bulkDeleteConfirm', { count: selectedIds.length })}
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