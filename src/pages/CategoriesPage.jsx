import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiDelete, apiGet, apiPost, apiPut } from '../api/client'
import PageHeader from '../components/PageHeader'
import SearchFilters from '../components/SearchFilters'
import DataTable from '../components/DataTable'
import DataToolbar from '../components/DataToolbar'
import StatusBadge from '../components/StatusBadge'
import ActionMenu from '../components/ActionMenu'
import Modal from '../components/Modal'
import { FormField, TextareaField } from "../components/FormField";
import ConfirmModal from '../components/ConfirmModal'
import { useModal } from '../hooks/useModal'
import { usePermissions } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { safeArray, parseBool } from '../utils/format'
import { Pencil, Trash2 } from 'lucide-react'

const exportColumns = [
    { header: 'ID', value: (r) => r.id },
    { header: 'Name', value: (r) => r.name },
    { header: 'Description', value: (r) => r.description },
    { header: 'Active', value: (r) => (r.active ? 'Active' : 'Inactive') },
]

const importColumns = [
    { header: 'Name', required: true, example: 'Office Supplies' },
    { header: 'Description', example: 'General office consumables' },
    { header: 'Active', example: 'Active' },
]

const emptyForm = {
    name: '',
    description: '',
    active: true,
}

export default function CategoriesPage() {
    const { t } = useTranslation()
    const { canCreate, canEdit, canDelete } = usePermissions('CATEGORIES')
    const toast = useToast()
    const parseImportRow = (r) => {
        const name = (r['Name'] || '').trim()
        if (!name) return { error: t('categories.import.nameRequired') }
        return {
            payload: {
                name,
                description: r['Description'] || '',
                active: parseBool(r['Active'], true),
            },
        }
    }
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

    const loadData = async () => {
        const response = await apiGet('/categories?page=0&size=500&sortBy=id&sortDir=desc')
        setRows(safeArray(response))
    }

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const q = search.toLowerCase()
            const matchesSearch =
                !search ||
                row.name?.toLowerCase().includes(q) ||
                row.description?.toLowerCase().includes(q)

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
            description: item.description || '',
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
                await apiPut(`/categories/${editingId}`, form)
            } else {
                await apiPost('/categories', form)
            }
            toast.success(editingId ? t('categories.updated') : t('categories.created'))
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
            await apiDelete(`/categories/${deletingItem.id}`)
            toast.success(t('categories.deleted'))
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
            await Promise.all(selectedIds.map((id) => apiDelete(`/categories/${id}`)))
            toast.success(t('categories.bulkDeleted', { count: selectedIds.length }))
            bulkDeleteModal.close()
            setSelectedIds([])
            await loadData()
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        { key: 'name', label: t('common.name') },
        { key: 'description', label: t('common.description') },
        {
            key: 'active',
            label: t('common.status'),
            render: (row) => <StatusBadge status={row.active ? 'ACTIVE' : 'INACTIVE'} />,
        },
        ...((canEdit || canDelete) ? [{
            key: 'actions',
            label: '',
            render: (row) => (
                <div className="flex justify-end">
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
                title={t('categories.title')}
                description={t('categories.description')}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <DataToolbar
                            entityLabel="categories"
                            exportColumns={exportColumns}
                            rows={filteredRows}
                            importConfig={{
                                canImport: canCreate,
                                endpoint: '/categories',
                                templateColumns: importColumns,
                                parseRow: parseImportRow,
                            }}
                            onImported={loadData}
                        />
                        {canCreate && (
                            <button onClick={openCreate} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
                                {t('categories.add')}
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
                tableId="categories"
                columns={columns}
                rows={filteredRows}
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

            <Modal isOpen={formModal.isOpen} title={editingId ? t('categories.editTitle') : t('categories.addTitle')} onClose={formModal.close} width="max-w-2xl">
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <FormField
                        id="category-name"
                        label={t('common.name')}
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder={t('common.name')}
                        className="md:col-span-2"
                    />

                    <TextareaField
                        id="category-description"
                        label={t('common.description')}
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder={t('common.description')}
                        className="md:col-span-2"
                    />
                    <label className="md:col-span-2 inline-flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800">
                        <input
                            type="checkbox"
                            name="active"
                            checked={form.active}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 dark:border-slate-700"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{t('common.active')}</span>
                    </label>

                    <div className="flex col-span-2 justify-end gap-3">
                        <button type="button" onClick={formModal.close} className="rounded-xl border border-slate-300 px-4 py-2.5 dark:border-slate-700">{t('common.cancel')}</button>
                        <button type="submit" disabled={loading} className="rounded-xl bg-teal-600 px-4 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-60">
                            {loading ? t('common.saving') : editingId ? t('common.saveChanges') : t('categories.createBtn')}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title={t('categories.deleteTitle')}
                message={t('categories.deleteConfirm', { name: deletingItem?.name || '' })}
                onClose={deleteModal.close}
                onConfirm={handleDelete}
                loading={loading}
            />

            <ConfirmModal
                isOpen={bulkDeleteModal.isOpen}
                title={t('categories.bulkDeleteTitle')}
                message={t('categories.bulkDeleteConfirm', { count: selectedIds.length })}
                onClose={bulkDeleteModal.close}
                onConfirm={handleBulkDelete}
                loading={loading}
            />
        </div>
    )
}