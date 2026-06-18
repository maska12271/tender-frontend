import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client'
import PageHeader from '../components/PageHeader'
import SearchFilters from '../components/SearchFilters'
import DataTable from '../components/DataTable'
import DataToolbar from '../components/DataToolbar'
import StatusBadge from '../components/StatusBadge'
import ActionMenu from '../components/ActionMenu'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { useModal } from '../hooks/useModal'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { usePermissions } from '../context/AuthContext'
import QuickCreateModal from '../components/QuickCreateModal'
import { useToast } from '../context/ToastContext'
import { formatMoney, safeArray, parseBool, toNumber } from '../utils/format'
import {FormField, FormSelect, TextareaField} from "../components/FormField.jsx";
import { Eye, Pencil, Trash2 } from 'lucide-react'
import ImageUploadField, { resolveImageUrl } from '../components/ImageUploadField.jsx'
import { stockStatusOf } from '../utils/stock'

const exportColumns = [
    { header: 'ID', value: (r) => r.id },
    { header: 'Name', value: (r) => r.name },
    { header: 'SKU', value: (r) => r.sku },
    { header: 'Manufacturer', value: (r) => r.manufacturer?.name || '' },
    { header: 'Category', value: (r) => r.category?.name || '' },
    { header: 'Size', value: (r) => r.size },
    { header: 'Unit', value: (r) => r.unit },
    { header: 'Description', value: (r) => r.description },
    { header: 'Images', value: (r) => (r.imageUrls || []).join('; ') },
    { header: 'Price', value: (r) => r.price },
    { header: 'Stock', value: (r) => r.stockQuantity },
    { header: 'Min stock', value: (r) => r.minimumStock },
    { header: 'Active', value: (r) => (r.active ? 'Active' : 'Inactive') },
]

const importColumns = [
    { header: 'Name', required: true, example: 'A4 Paper 80g' },
    { header: 'SKU', example: 'PAP-A4-80' },
    { header: 'Manufacturer', required: true, example: 'Acme Industries' },
    { header: 'Category', required: true, example: 'Office Supplies' },
    { header: 'Size', example: 'A4' },
    { header: 'Unit', example: 'box' },
    { header: 'Description', example: '' },
    { header: 'Images', example: 'https://... ; https://...' },
    { header: 'Price', example: '4.50' },
    { header: 'Stock', example: '120' },
    { header: 'Min stock', example: '20' },
    { header: 'Active', example: 'Active' },
]

const emptyForm = {
    name: '',
    sku: '',
    manufacturerId: '',
    categoryId: '',
    size: '',
    unit: '',
    description: '',
    images: [],
    price: '',
    stockQuantity: 0,
    minimumStock: 0,
    active: true,
}

// Filters + pagination live in the URL query string so navigating to a product detail page
// and pressing Back restores the exact same view. Arrays are stored comma-joined.
const parseCsv = (value) => (value ? value.split(',').filter(Boolean) : [])

export default function ProductsPage() {
    const { t } = useTranslation()
    const { canCreate, canEdit, canDelete } = usePermissions('PRODUCTS')
    const toast = useToast()
    const { quickCreate, openQuickCreate, closeQuickCreate, handleQuickCreated } = useQuickCreate()
    const formModal = useModal()
    const deleteModal = useModal()
    const bulkDeleteModal = useModal()

    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const [rows, setRows] = useState([])
    const [manufacturers, setManufacturers] = useState([])
    const [categories, setCategories] = useState([])
    const [form, setForm] = useState(emptyForm)
    const [editingId, setEditingId] = useState(null)
    const [deletingItem, setDeletingItem] = useState(null)
    const [selectedIds, setSelectedIds] = useState([])
    const [loading, setLoading] = useState(false)

    // Derive filter + pagination state from the URL (source of truth).
    const search = searchParams.get('q') || ''
    const manufacturerFilter = parseCsv(searchParams.get('manufacturer'))
    const categoryFilter = parseCsv(searchParams.get('category'))
    const statusFilter = parseCsv(searchParams.get('status'))
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = Number(searchParams.get('size')) || 10

    // Writes a single query param (array values are comma-joined), dropping empties to keep the
    // URL tidy. Changing a filter resets pagination to page 1.
    const updateParam = (key, value, { resetPage = true } = {}) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            const serialized = Array.isArray(value) ? value.join(',') : value
            if (serialized) next.set(key, String(serialized))
            else next.delete(key)
            if (resetPage) next.delete('page')
            return next
        }, { replace: true })
    }

    const setSearch = (value) => updateParam('q', value)
    const setManufacturerFilter = (value) => updateParam('manufacturer', value)
    const setCategoryFilter = (value) => updateParam('category', value)
    const setStatusFilter = (value) => updateParam('status', value)
    const setPage = (value) => updateParam('page', value > 1 ? value : '', { resetPage: false })
    const setPageSize = (value) => updateParam('size', value)

    useEffect(() => {
        loadData()
    }, [])

    // Deep-link support: ?edit=<id> opens the edit modal once rows are loaded (used by the
    // detail page's Edit button), then clears the param so a refresh/back doesn't reopen it.
    const editId = searchParams.get('edit')
    useEffect(() => {
        if (!editId || rows.length === 0) return
        const item = rows.find((r) => String(r.id) === String(editId))
        if (item) {
            openEdit(item)
            updateParam('edit', '', { resetPage: false })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editId, rows])

    const loadData = async () => {
        const [productsRes, manufacturersRes, categoriesRes] = await Promise.all([
            apiGet('/products?page=0&size=500&sortBy=id&sortDir=desc'),
            apiGet('/manufacturers?page=0&size=500&sortBy=id&sortDir=asc'),
            apiGet('/categories?page=0&size=500&sortBy=id&sortDir=asc'),
        ])
        setRows(safeArray(productsRes))
        setManufacturers(safeArray(manufacturersRes))
        setCategories(safeArray(categoriesRes))
    }

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const matchesSearch =
                !search ||
                row.name?.toLowerCase().includes(search.toLowerCase()) ||
                row.sku?.toLowerCase().includes(search.toLowerCase()) ||
                row.manufacturer?.name?.toLowerCase().includes(search.toLowerCase())

            const matchesManufacturer = manufacturerFilter.length === 0 || manufacturerFilter.includes(String(row.manufacturer?.id))
            const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(String(row.category?.id))
            // The status filter mixes activity (active/inactive) and stock level (ok/low/out).
            // Match each dimension independently: AND across dimensions, OR within a dimension.
            const activeSel = statusFilter.filter((v) => v === 'active' || v === 'inactive')
            const stockSel = statusFilter.filter((v) => v === 'ok' || v === 'low' || v === 'out')
            const matchesActive = activeSel.length === 0 || activeSel.includes(row.active ? 'active' : 'inactive')
            const matchesStock = stockSel.length === 0 || stockSel.includes(stockStatusOf(row))

            return matchesSearch && matchesManufacturer && matchesCategory && matchesActive && matchesStock
        })
    }, [rows, search, manufacturerFilter, categoryFilter, statusFilter])

    // Resolve manufacturer/category by name against loaded lists, erroring out (rather than
    // silently dropping) when a referenced one does not exist yet.
    const parseImportRow = (r) => {
        const name = (r['Name'] || '').trim()
        if (!name) return { error: t('products.import.nameRequired') }

        const manufacturerName = (r['Manufacturer'] || '').trim()
        if (!manufacturerName) return { error: t('products.import.manufacturerRequired') }
        const manufacturer = manufacturers.find(
            (m) => (m.name || '').toLowerCase() === manufacturerName.toLowerCase(),
        )
        if (!manufacturer) return { error: t('products.import.manufacturerNotFound', { name: manufacturerName }) }

        const categoryName = (r['Category'] || '').trim()
        if (!categoryName) return { error: t('products.import.categoryRequired') }
        const category = categories.find(
            (c) => (c.name || '').toLowerCase() === categoryName.toLowerCase(),
        )
        if (!category) return { error: t('products.import.categoryNotFound', { name: categoryName }) }

        return {
            payload: {
                name,
                sku: r['SKU'] || '',
                manufacturer: { id: manufacturer.id },
                category: { id: category.id },
                size: r['Size'] || '',
                unit: r['Unit'] || '',
                description: r['Description'] || '',
                imageUrls: (r['Images'] || '')
                    .split(';')
                    .map((u) => u.trim())
                    .filter(Boolean),
                price: toNumber(r['Price']),
                stockQuantity: toNumber(r['Stock']),
                minimumStock: toNumber(r['Min stock']),
                active: parseBool(r['Active'], true),
            },
        }
    }

    const openCreate = () => {
        setEditingId(null)
        setForm(emptyForm)
        formModal.open()
    }

    const openEdit = (item) => {
        setEditingId(item.id)
        setForm({
            name: item.name || '',
            sku: item.sku || '',
            manufacturerId: item.manufacturer?.id || '',
            categoryId: item.category?.id || '',
            size: item.size || '',
            unit: item.unit || '',
            description: item.description || '',
            images: item.imageUrls || [],
            price: item.price || '',
            stockQuantity: item.stockQuantity ?? 0,
            minimumStock: item.minimumStock ?? 0,
            active: !!item.active,
        })
        formModal.open()
    }

    const openDelete = (item) => {
        setDeletingItem(item)
        deleteModal.open()
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const payload = {
            name: form.name,
            sku: form.sku,
            manufacturer: { id: Number(form.manufacturerId) },
            category: { id: Number(form.categoryId) },
            size: form.size,
            unit: form.unit,
            description: form.description,
            imageUrls: form.images,
            price: Number(form.price),
            stockQuantity: Number(form.stockQuantity),
            minimumStock: Number(form.minimumStock),
            active: form.active,
        }

        try {
            if (editingId) {
                await apiPut(`/products/${editingId}`, payload)
            } else {
                await apiPost('/products', payload)
            }
            toast.success(editingId ? t('products.updated') : t('products.created'))
            formModal.close()
            setForm(emptyForm)
            setEditingId(null)
            await loadData()
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingItem) return
        setLoading(true)
        try {
            await apiDelete(`/products/${deletingItem.id}`)
            toast.success(t('products.deleted'))
            deleteModal.close()
            setDeletingItem(null)
            setSelectedIds((prev) => prev.filter((id) => id !== deletingItem.id))
            await loadData()
        } finally {
            setLoading(false)
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return
        setLoading(true)
        try {
            await Promise.all(selectedIds.map((id) => apiDelete(`/products/${id}`)))
            toast.success(t('products.bulkDeleted', { count: selectedIds.length }))
            bulkDeleteModal.close()
            setSelectedIds([])
            await loadData()
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        {
            key: 'image',
            label: '',
            name: t('products.cols.image'),
            render: (row) => {
                const url = resolveImageUrl(row.imageUrls?.[0])
                return url ? (
                    <img src={url} alt="" className="h-8 w-8 rounded object-cover" />
                ) : (
                    <div className="h-8 w-8 rounded bg-slate-100 dark:bg-slate-800" />
                )
            },
        },
        { key: 'name', label: t('common.name') },
        { key: 'sku', label: t('common.sku') },
        { key: 'manufacturer', label: t('products.cols.manufacturer'), render: (row) => row.manufacturer?.name || '-' },
        { key: 'category', label: t('products.cols.category'), render: (row) => row.category?.name || '-' },
        { key: 'price', label: t('common.price'), render: (row) => formatMoney(row.price) },
        {
            key: 'stockQuantity',
            label: t('products.cols.stock'),
            render: (row) => {
                const status = stockStatusOf(row)
                return (
                    <span
                        className={
                            status === 'out'
                                ? 'font-semibold text-rose-600 dark:text-rose-400'
                                : status === 'low'
                                    ? 'font-semibold text-amber-600 dark:text-amber-400'
                                    : ''
                        }
                    >
                        {row.stockQuantity}
                    </span>
                )
            },
        },
        { key: 'minimumStock', label: t('products.cols.minStock') },
        {
            key: 'active',
            label: t('common.status'),
            render: (row) => {
                const stock = stockStatusOf(row)
                return (
                    <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={row.active ? 'ACTIVE' : 'INACTIVE'} />
                        {stock === 'out' && <StatusBadge status="OUT_OF_STOCK" />}
                        {stock === 'low' && <StatusBadge status="LOW_STOCK" />}
                    </div>
                )
            },
        },
        {
            key: 'actions',
            label: '',
            render: (row) => (
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                        actions={[
                            { key: 'view', label: t('common.viewDetails'), icon: Eye, onClick: () => navigate(`/products/${row.id}`) },
                            ...(canEdit ? [{ key: 'edit', label: t('common.edit'), icon: Pencil, onClick: () => openEdit(row) }] : []),
                            ...(canDelete ? [{ key: 'delete', label: t('common.delete'), icon: Trash2, danger: true, onClick: () => openDelete(row) }] : []),
                        ]}
                    />
                </div>
            ),
        },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title={t('products.title')}
                description={t('products.description')}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <DataToolbar
                            entityLabel="products"
                            exportColumns={exportColumns}
                            rows={filteredRows}
                            importConfig={{
                                canImport: canCreate,
                                endpoint: '/products',
                                templateColumns: importColumns,
                                parseRow: parseImportRow,
                            }}
                            onImported={loadData}
                        />
                        {canCreate && (
                            <button onClick={openCreate} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
                                {t('products.add')}
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
                        key: 'category',
                        value: categoryFilter,
                        onChange: setCategoryFilter,
                        placeholder: t('common.allCategories'),
                        options: categories.map((c) => ({ value: String(c.id), label: c.name })),
                    },
                    {
                        key: 'status',
                        value: statusFilter,
                        onChange: setStatusFilter,
                        placeholder: t('common.allStatuses'),
                        options: [
                            { value: 'active', label: t('common.active') },
                            { value: 'inactive', label: t('common.inactive') },
                            { value: 'ok', label: t('products.filters.inStock') },
                            { value: 'low', label: t('products.filters.lowStock') },
                            { value: 'out', label: t('products.filters.outOfStock') },
                        ],
                    },
                ]}
            />

            <DataTable
                tableId="products"
                columns={columns}
                rows={filteredRows}
                selectable={canDelete}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onRowClick={(row) => navigate(`/products/${row.id}`)}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
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

            <Modal isOpen={formModal.isOpen} title={editingId ? t('products.editTitle') : t('products.addTitle')} onClose={formModal.close}>
                <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">
                    <FormField
                        id="product-name"
                        label={t('common.name')}
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder={t('common.name')}
                        className="md:col-span-2"
                    />

                    <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
                        <FormField
                            id="product-sku"
                            label={
                                <span className="inline-flex items-center gap-2">
                        {t('common.sku')}
                        <span className="group relative inline-flex">
                            <button
                                type="button"
                                tabIndex={0}
                                aria-label={t('products.form.skuTooltipAria')}
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                ?
                            </button>
                            <span
                                role="tooltip"
                                className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-56 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-normal text-white shadow-lg group-hover:block group-focus-within:block dark:bg-slate-700"
                            >
                                {t('products.form.skuTooltip')}
                            </span>
                        </span>
                    </span>
                            }
                            name="sku"
                            value={form.sku}
                            onChange={handleChange}
                            placeholder={t('common.sku')}
                        />

                        <FormField
                            id="product-unit"
                            label={t('common.unit')}
                            name="unit"
                            value={form.unit}
                            onChange={handleChange}
                            placeholder={t('products.form.unitPlaceholder')}
                        />
                    </div>

                    <FormSelect
                        id="product-manufacturer-id"
                        label={t('products.cols.manufacturer')}
                        name="manufacturerId"
                        value={form.manufacturerId}
                        onChange={handleChange}
                        required
                        searchable
                        placeholder={t('products.form.selectManufacturer')}
                        className="md:col-span-2"
                        options={manufacturers.map((item) => ({ value: String(item.id), label: item.name }))}
                        onQuickCreate={(name) => openQuickCreate('manufacturer', name, (item) => {
                            setManufacturers((prev) => [...prev, item.raw])
                            handleChange({ target: { name: 'manufacturerId', value: item.value } })
                        })}
                    />

                    <FormSelect
                        id="product-category-id"
                        label={t('products.cols.category')}
                        name="categoryId"
                        value={form.categoryId}
                        onChange={handleChange}
                        required
                        searchable
                        placeholder={t('products.form.selectCategory')}
                        className="md:col-span-2"
                        options={categories.map((item) => ({ value: String(item.id), label: item.name }))}
                        onQuickCreate={(name) => openQuickCreate('category', name, (item) => {
                            setCategories((prev) => [...prev, item.raw])
                            handleChange({ target: { name: 'categoryId', value: item.value } })
                        })}
                    />

                    <FormField
                        id="product-size"
                        label={t('common.size')}
                        name="size"
                        value={form.size}
                        onChange={handleChange}
                        placeholder={t('common.size')}
                        className="md:col-span-2"
                    />

                    <FormField
                        id="product-price"
                        label={t('common.price')}
                        type="number"
                        step="0.01"
                        name="price"
                        value={form.price}
                        onChange={handleChange}
                        placeholder={t('common.price')}
                        className="md:col-span-2"
                    />

                    <ImageUploadField
                        value={form.images}
                        onChange={(images) => setForm((prev) => ({ ...prev, images }))}
                        className="md:col-span-4"
                    />

                    <FormField
                        id="product-stock-quantity"
                        label={t('products.cols.stock')}
                        type="number"
                        name="stockQuantity"
                        value={form.stockQuantity}
                        onChange={handleChange}
                        placeholder="0"
                        className="md:col-span-2"
                    />

                    <FormField
                        id="product-minimum-stock"
                        label={
                            <span className="inline-flex items-center gap-2">
                                {t('products.cols.minStock')}
                            <span className="group relative inline-flex">
                        <button
                            type="button"
                            tabIndex={0}
                            aria-label={t('products.form.minStockTooltipAria')}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            ?
                        </button>
                        <span
                            role="tooltip"
                            className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-56 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-normal text-white shadow-lg group-hover:block group-focus-within:block dark:bg-slate-700"
                        >
                            {t('products.form.minStockTooltip')}
                        </span>
                    </span>
                </span>
                        }
                        type="number"
                        name="minimumStock"
                        value={form.minimumStock}
                        onChange={handleChange}
                        placeholder="0"
                        className="md:col-span-2"
                    />

                    <TextareaField
                        id="product-description"
                        label={t('common.description')}
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder={t('common.description')}
                        className="md:col-span-4"
                    />

                    <label className="md:col-span-4 inline-flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
                        <input
                            type="checkbox"
                            name="active"
                            checked={form.active}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-700"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{t('common.active')}</span>
                    </label>

                    <div className="md:col-span-4 flex justify-end gap-3">
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
                            {loading ? t('common.saving') : editingId ? t('common.saveChanges') : t('products.createBtn')}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title={t('products.deleteTitle')}
                message={t('products.deleteConfirm', { name: deletingItem?.name || '' })}
                onClose={deleteModal.close}
                onConfirm={handleDelete}
                loading={loading}
            />

            <ConfirmModal
                isOpen={bulkDeleteModal.isOpen}
                title={t('products.bulkDeleteTitle')}
                message={t('products.bulkDeleteConfirm', { count: selectedIds.length })}
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