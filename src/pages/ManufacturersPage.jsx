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
import { usePermissions } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { safeArray, parseBool } from '../utils/format'
import {FormField, TextareaField} from "../components/FormField.jsx";
import { Eye, Pencil, Trash2 } from 'lucide-react'

const exportColumns = [
    { header: 'ID', value: (r) => r.id },
    { header: 'Name', value: (r) => r.name },
    { header: 'Country', value: (r) => r.country },
    { header: 'Address', value: (r) => r.address },
    { header: 'Email', value: (r) => r.email },
    { header: 'Phone', value: (r) => r.phone },
    { header: 'Website', value: (r) => r.website },
    { header: 'Notes', value: (r) => r.notes },
    { header: 'Active', value: (r) => (r.active ? 'Active' : 'Inactive') },
]

const importColumns = [
    { header: 'Name', required: true, example: 'Acme Industries' },
    { header: 'Country', example: 'Germany' },
    { header: 'Address', example: '' },
    { header: 'Email', example: 'sales@acme.com' },
    { header: 'Phone', example: '+49 30 1234567' },
    { header: 'Website', example: 'https://acme.com' },
    { header: 'Notes', example: '' },
    { header: 'Active', example: 'Active' },
]

const emptyForm = {
    name: '',
    country: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    notes: '',
    active: true,
}

export default function ManufacturersPage() {
    const { t } = useTranslation()
    const { canCreate, canEdit, canDelete } = usePermissions('MANUFACTURERS')
    const toast = useToast()
    const navigate = useNavigate()
    const parseImportRow = (r) => {
        const name = (r['Name'] || '').trim()
        if (!name) return { error: t('manufacturers.import.nameRequired') }
        return {
            payload: {
                name,
                country: r['Country'] || '',
                address: r['Address'] || '',
                email: r['Email'] || '',
                phone: r['Phone'] || '',
                website: r['Website'] || '',
                notes: r['Notes'] || '',
                active: parseBool(r['Active'], true),
            },
        }
    }
    const [searchParams, setSearchParams] = useSearchParams()
    const formModal = useModal()
    const deleteModal = useModal()
    const bulkDeleteModal = useModal()

    const [rows, setRows] = useState([])
    const [form, setForm] = useState(emptyForm)
    const [editingId, setEditingId] = useState(null)
    const [deletingItem, setDeletingItem] = useState(null)
    const [selectedIds, setSelectedIds] = useState([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    // Deep-link support: ?edit=<id> opens the edit modal once rows are loaded (used by the detail
    // page's Edit button), then clears the param so a refresh/back doesn't reopen it.
    const editId = searchParams.get('edit')
    useEffect(() => {
        if (!editId || rows.length === 0) return
        const item = rows.find((r) => String(r.id) === String(editId))
        if (item) {
            openEdit(item)
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev)
                next.delete('edit')
                return next
            }, { replace: true })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editId, rows])

    const loadData = async () => {
        const response = await apiGet('/manufacturers?page=0&size=500&sortBy=id&sortDir=desc')
        setRows(safeArray(response))
    }

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const q = search.toLowerCase()
            const matchesSearch =
                !search ||
                row.name?.toLowerCase().includes(q) ||
                row.country?.toLowerCase().includes(q) ||
                row.email?.toLowerCase().includes(q) ||
                row.phone?.toLowerCase().includes(q)

            const matchesStatus =
                statusFilter.length === 0 || statusFilter.includes(row.active ? 'active' : 'inactive')

            return matchesSearch && matchesStatus
        })
    }, [rows, search, statusFilter])

    const openCreate = () => {
        setEditingId(null)
        setForm(emptyForm)
        formModal.open()
    }

    const openEdit = (item) => {
        setEditingId(item.id)
        setForm({
            name: item.name || '',
            country: item.country || '',
            address: item.address || '',
            email: item.email || '',
            phone: item.phone || '',
            website: item.website || '',
            notes: item.notes || '',
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

        try {
            if (editingId) {
                await apiPut(`/manufacturers/${editingId}`, form)
            } else {
                await apiPost('/manufacturers', form)
            }
            toast.success(editingId ? t('manufacturers.updated') : t('manufacturers.created'))
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
            await apiDelete(`/manufacturers/${deletingItem.id}`)
            toast.success(t('manufacturers.deleted'))
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
            await Promise.all(selectedIds.map((id) => apiDelete(`/manufacturers/${id}`)))
            toast.success(t('manufacturers.bulkDeleted', { count: selectedIds.length }))
            bulkDeleteModal.close()
            setSelectedIds([])
            await loadData()
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        { key: 'name', label: t('common.name') },
        { key: 'country', label: t('common.country') },
        { key: 'email', label: t('common.email') },
        { key: 'phone', label: t('common.phone') },
        { key: 'website', label: t('common.website') },
        {
            key: 'active',
            label: t('common.status'),
            render: (row) => <StatusBadge status={row.active ? 'ACTIVE' : 'INACTIVE'} />,
        },
        {
            key: 'actions',
            label: '',
            render: (row) => (
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <ActionMenu
                        actions={[
                            { key: 'view', label: t('common.viewDetails'), icon: Eye, onClick: () => navigate(`/manufacturers/${row.id}`) },
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
                title={t('manufacturers.title')}
                description={t('manufacturers.description')}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <DataToolbar
                            entityLabel="manufacturers"
                            exportColumns={exportColumns}
                            rows={filteredRows}
                            importConfig={{
                                canImport: canCreate,
                                endpoint: '/manufacturers',
                                templateColumns: importColumns,
                                parseRow: parseImportRow,
                            }}
                            onImported={loadData}
                        />
                        {canCreate && (
                            <button onClick={openCreate} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
                                {t('manufacturers.add')}
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
                        key: 'status',
                        value: statusFilter,
                        onChange: setStatusFilter,
                        placeholder: t('common.allStatuses'),
                        options: [
                            { value: 'active', label: t('common.active') },
                            { value: 'inactive', label: t('common.inactive') },
                        ],
                    },
                ]}
            />

            <DataTable
                tableId="manufacturers"
                columns={columns}
                rows={filteredRows}
                selectable={canDelete}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onRowClick={(row) => navigate(`/manufacturers/${row.id}`)}
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

            <Modal isOpen={formModal.isOpen} title={editingId ? t('manufacturers.editTitle') : t('manufacturers.addTitle')} onClose={formModal.close}>
                <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">
                    <FormField
                        id="manufacturer-name"
                        label={t('common.name')}
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder={t('common.name')}
                        className="md:col-span-2"
                    />

                    <FormField
                        id="manufacturer-country"
                        label={t('common.country')}
                        name="country"
                        value={form.country}
                        onChange={handleChange}
                        placeholder={t('common.country')}
                        className="md:col-span-2"
                    />

                    <FormField
                        id="manufacturer-email"
                        label={t('common.email')}
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder={t('common.email')}
                        className="md:col-span-2"
                    />

                    <FormField
                        id="manufacturer-phone"
                        label={t('common.phone')}
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder={t('common.phone')}
                        className="md:col-span-2"
                    />

                    <FormField
                        id="manufacturer-website"
                        label={t('common.website')}
                        name="website"
                        type="url"
                        value={form.website}
                        onChange={handleChange}
                        placeholder="https://example.com"
                        className="md:col-span-2"
                    />

                    <FormField
                        id="manufacturer-address"
                        label={t('common.address')}
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder={t('common.address')}
                        className="md:col-span-2"
                    />

                    <TextareaField
                        id="manufacturer-notes"
                        label={t('common.notes')}
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder={t('common.notes')}
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
                            {loading ? t('common.saving') : editingId ? t('common.saveChanges') : t('manufacturers.createBtn')}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title={t('manufacturers.deleteTitle')}
                message={t('manufacturers.deleteConfirm', { name: deletingItem?.name || '' })}
                onClose={deleteModal.close}
                onConfirm={handleDelete}
                loading={loading}
            />

            <ConfirmModal
                isOpen={bulkDeleteModal.isOpen}
                title={t('manufacturers.bulkDeleteTitle')}
                message={t('manufacturers.bulkDeleteConfirm', { count: selectedIds.length })}
                onClose={bulkDeleteModal.close}
                onConfirm={handleBulkDelete}
                loading={loading}
            />
        </div>
    )
}