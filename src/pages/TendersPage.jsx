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
import ConfirmModal from '../components/ConfirmModal'
import { useModal } from '../hooks/useModal'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { usePermissions } from '../context/AuthContext'
import QuickCreateModal from '../components/QuickCreateModal'
import { useToast } from '../context/ToastContext'
import { formatDate, formatMoney, safeArray } from '../utils/format'
import {FormField, FormSelect, TextareaField} from "../components/FormField.jsx";
import { Pencil, Trash2, Users } from 'lucide-react'

const emptyTenderForm = {
    title: '',
    tenderNumber: '',
    customerName: '',
    clientId: '',
    status: 'OPEN',
    publishedAt: '',
    deadline: '',
    description: '',
    estimatedValue: '',
}

const emptyParticipantForm = {
    manufacturerName: '',
    offeredPrice: '',
    notes: '',
    winner: false,
}

const exportColumns = [
    { header: 'ID', value: (r) => r.id },
    { header: 'Title', value: (r) => r.title },
    { header: 'Tender no.', value: (r) => r.tenderNumber },
    { header: 'Customer', value: (r) => r.customerName },
    { header: 'Client', value: (r) => r.clientName },
    { header: 'Status', value: (r) => r.status },
    { header: 'Published', value: (r) => r.publishedAt },
    { header: 'Deadline', value: (r) => r.deadline },
    { header: 'Estimated value', value: (r) => r.estimatedValue },
    { header: 'Description', value: (r) => r.description },
]

export default function TendersPage() {
    const { t } = useTranslation()
    const { canCreate, canEdit, canDelete } = usePermissions('TENDERS')
    const toast = useToast()
    const { quickCreate, openQuickCreate, closeQuickCreate, handleQuickCreated } = useQuickCreate()
    const formModal = useModal()
    const deleteModal = useModal()
    const bulkDeleteModal = useModal()
    const participantsModal = useModal()
    const participantFormModal = useModal()
    const participantDeleteModal = useModal()
    const participantBulkDeleteModal = useModal()

    const [rows, setRows] = useState([])
    const [clients, setClients] = useState([])
    const [participants, setParticipants] = useState([])
    const [form, setForm] = useState(emptyTenderForm)
    const [participantForm, setParticipantForm] = useState(emptyParticipantForm)
    const [editingId, setEditingId] = useState(null)
    const [selectedTender, setSelectedTender] = useState(null)
    const [editingParticipantId, setEditingParticipantId] = useState(null)
    const [deletingItem, setDeletingItem] = useState(null)
    const [deletingParticipant, setDeletingParticipant] = useState(null)
    const [selectedIds, setSelectedIds] = useState([])
    const [selectedParticipantIds, setSelectedParticipantIds] = useState([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const [tendersRes, clientsRes] = await Promise.all([
            apiGet('/tenders?page=0&size=500&sortBy=id&sortDir=desc'),
            apiGet('/clients?page=0&size=500&sortBy=id&sortDir=asc'),
        ])
        setRows(safeArray(tendersRes))
        setClients(safeArray(clientsRes))
    }

    const loadParticipants = async (tenderId) => {
        const response = await apiGet(`/tenders/${tenderId}/participants`)
        setParticipants(safeArray(response))
    }

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const q = search.toLowerCase()
            const matchesSearch =
                !search ||
                row.title?.toLowerCase().includes(q) ||
                row.tenderNumber?.toLowerCase().includes(q) ||
                row.customerName?.toLowerCase().includes(q) ||
                row.clientName?.toLowerCase().includes(q)

            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(row.status)

            return matchesSearch && matchesStatus
        })
    }, [rows, search, statusFilter])

    const openCreate = () => {
        setEditingId(null)
        setForm(emptyTenderForm)
        formModal.open()
    }

    const openEdit = (item) => {
        setEditingId(item.id)
        setForm({
            title: item.title || '',
            tenderNumber: item.tenderNumber || '',
            customerName: item.customerName || '',
            clientId: item.clientId || '',
            status: item.status || 'OPEN',
            publishedAt: item.publishedAt || '',
            deadline: item.deadline || '',
            description: item.description || '',
            estimatedValue: item.estimatedValue ?? '',
        })
        formModal.open()
    }

    const openDelete = (item) => {
        setDeletingItem(item)
        deleteModal.open()
    }

    const openParticipants = async (item) => {
        setSelectedTender(item)
        setSelectedParticipantIds([])
        await loadParticipants(item.id)
        participantsModal.open()
    }

    const openParticipantCreate = () => {
        setEditingParticipantId(null)
        setParticipantForm(emptyParticipantForm)
        participantFormModal.open()
    }

    const openParticipantEdit = (item) => {
        setEditingParticipantId(item.id)
        setParticipantForm({
            manufacturerName: item.manufacturerName || '',
            offeredPrice: item.offeredPrice ?? '',
            notes: item.notes || '',
            winner: !!item.winner,
        })
        participantFormModal.open()
    }

    const openParticipantDelete = (item) => {
        setDeletingParticipant(item)
        participantDeleteModal.open()
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleParticipantChange = (e) => {
        const { name, value, type, checked } = e.target
        setParticipantForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const payload = {
            title: form.title,
            tenderNumber: form.tenderNumber,
            customerName: form.customerName,
            clientId: Number(form.clientId),
            status: form.status,
            publishedAt: form.publishedAt || null,
            deadline: form.deadline || null,
            description: form.description,
            estimatedValue: Number(form.estimatedValue || 0),
        }

        try {
            if (editingId) {
                await apiPut(`/tenders/${editingId}`, payload)
            } else {
                await apiPost('/tenders', payload)
            }
            toast.success(editingId ? t('tenders.updated') : t('tenders.created'))
            formModal.close()
            setEditingId(null)
            setForm(emptyTenderForm)
            await loadData()
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingItem) return
        setLoading(true)
        try {
            await apiDelete(`/tenders/${deletingItem.id}`)
            toast.success(t('tenders.deleted'))
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
            await Promise.all(selectedIds.map((id) => apiDelete(`/tenders/${id}`)))
            toast.success(t('tenders.bulkDeleted', { count: selectedIds.length }))
            bulkDeleteModal.close()
            setSelectedIds([])
            await loadData()
        } finally {
            setLoading(false)
        }
    }

    const handleParticipantSubmit = async (e) => {
        e.preventDefault()
        if (!selectedTender) return
        setLoading(true)

        const payload = {
            manufacturerName: participantForm.manufacturerName,
            offeredPrice: Number(participantForm.offeredPrice || 0),
            notes: participantForm.notes,
            winner: participantForm.winner,
        }

        try {
            if (editingParticipantId) {
                await apiPut(`/tenders/${selectedTender.id}/participants/${editingParticipantId}`, payload)
            } else {
                await apiPost(`/tenders/${selectedTender.id}/participants`, payload)
            }

            toast.success(editingParticipantId ? t('tenders.participants.updated') : t('tenders.participants.added'))
            participantFormModal.close()
            setEditingParticipantId(null)
            setParticipantForm(emptyParticipantForm)
            await loadParticipants(selectedTender.id)
        } finally {
            setLoading(false)
        }
    }

    const handleParticipantDelete = async () => {
        if (!selectedTender || !deletingParticipant) return
        setLoading(true)
        try {
            await apiDelete(`/tenders/${selectedTender.id}/participants/${deletingParticipant.id}`)
            toast.success(t('tenders.participants.deleted'))
            participantDeleteModal.close()
            setDeletingParticipant(null)
            setSelectedParticipantIds((prev) => prev.filter((id) => id !== deletingParticipant.id))
            await loadParticipants(selectedTender.id)
        } finally {
            setLoading(false)
        }
    }

    const handleParticipantBulkDelete = async () => {
        if (!selectedTender || selectedParticipantIds.length === 0) return
        setLoading(true)
        try {
            await Promise.all(
                selectedParticipantIds.map((id) =>
                    apiDelete(`/tenders/${selectedTender.id}/participants/${id}`)
                )
            )
            toast.success(t('tenders.participants.bulkDeleted', { count: selectedParticipantIds.length }))
            participantBulkDeleteModal.close()
            setSelectedParticipantIds([])
            await loadParticipants(selectedTender.id)
        } finally {
            setLoading(false)
        }
    }

    const columns = [
        { key: 'title', label: t('tenders.cols.title') },
        { key: 'tenderNumber', label: t('tenders.cols.tenderNo') },
        { key: 'customerName', label: t('tenders.cols.customer') },
        { key: 'clientName', label: t('tenders.cols.client') },
        { key: 'status', label: t('common.status'), render: (row) => <StatusBadge status={row.status} /> },
        { key: 'deadline', label: t('tenders.cols.deadline'), render: (row) => formatDate(row.deadline) },
        { key: 'estimatedValue', label: t('tenders.cols.estimatedValue'), render: (row) => formatMoney(row.estimatedValue) },
        {
            key: 'actions',
            label: '',
            render: (row) => (
                <div className="flex justify-end">
                    <ActionMenu
                        actions={[
                            ...(canEdit ? [{ key: 'edit', label: t('common.edit'), icon: Pencil, onClick: () => openEdit(row) }] : []),
                            { key: 'participants', label: t('tenders.participants.title'), icon: Users, onClick: () => openParticipants(row) },
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
                title={t('tenders.title')}
                description={t('tenders.description')}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <DataToolbar
                            entityLabel="tenders"
                            exportColumns={exportColumns}
                            rows={filteredRows}
                        />
                        {canCreate && (
                            <button onClick={openCreate} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
                                {t('tenders.add')}
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
                            { value: 'OPEN', label: t('statuses.OPEN') },
                            { value: 'PUBLISHED', label: t('statuses.PUBLISHED') },
                            { value: 'IN_PROGRESS', label: t('statuses.IN_PROGRESS') },
                            { value: 'CLOSED', label: t('statuses.CLOSED') },
                            { value: 'CANCELLED', label: t('statuses.CANCELLED') },
                        ],
                    },
                ]}
            />

            <DataTable
                tableId="tenders"
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

            <Modal
                isOpen={participantsModal.isOpen}
                title={selectedTender ? t('tenders.participants.titleFor', { title: selectedTender.title }) : t('tenders.participants.title')}
                onClose={participantsModal.close}
                width="max-w-5xl"
            >
                <div className="space-y-5">
                    {canEdit && (
                        <div className="flex justify-end">
                            <button onClick={openParticipantCreate} className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700">
                                {t('tenders.participants.add')}
                            </button>
                        </div>
                    )}

                    <DataTable
                        tableId="tender-participants"
                        paginate={false}
                        columns={[
                            { key: 'manufacturerName', label: t('tenders.participants.name') },
                            { key: 'offeredPrice', label: t('tenders.participants.offeredPrice'), render: (row) => formatMoney(row.offeredPrice) },
                            { key: 'notes', label: t('common.notes') },
                            {
                                key: 'winner',
                                label: t('tenders.participants.winner'),
                                render: (row) => (row.winner ? <StatusBadge status="WINNER" /> : <span className="text-slate-400">—</span>),
                            },
                            ...(canEdit ? [{
                                key: 'actions',
                                label: '',
                                render: (row) => (
                                    <div className="flex justify-end">
                                        <ActionMenu
                                            actions={[
                                                { key: 'edit', label: t('common.edit'), icon: Pencil, onClick: () => openParticipantEdit(row) },
                                                { key: 'delete', label: t('common.delete'), icon: Trash2, danger: true, onClick: () => openParticipantDelete(row) },
                                            ]}
                                        />
                                    </div>
                                ),
                            }] : []),
                        ]}
                        rows={participants}
                        selectable={canEdit}
                        selectedIds={selectedParticipantIds}
                        onSelectionChange={setSelectedParticipantIds}
                        bulkActions={
                            canEdit ? (
                                <button
                                    onClick={participantBulkDeleteModal.open}
                                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700"
                                >
                                    <Trash2 className="h-4 w-4" /> Delete selected
                                </button>
                            ) : null
                        }
                    />
                </div>
            </Modal>

            <Modal
                isOpen={formModal.isOpen}
                title={editingId ? t('tenders.editTitle') : t('tenders.addTitle')}
                onClose={formModal.close}
            >
                <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                    <FormField
                        id="tender-title"
                        label={t('tenders.form.title')}
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        required
                        placeholder={t('tenders.form.titlePlaceholder')}
                        className="md:col-span-2"
                    />

                    <FormField
                        id="tender-number"
                        label={t('tenders.form.tenderNumber')}
                        name="tenderNumber"
                        value={form.tenderNumber}
                        onChange={handleChange}
                        placeholder={t('tenders.form.tenderNumber')}
                    />

                    <FormField
                        id="tender-customer-name"
                        label={t('tenders.form.customerName')}
                        name="customerName"
                        value={form.customerName}
                        onChange={handleChange}
                        placeholder={t('tenders.form.customerName')}
                    />

                    <FormSelect
                        id="tender-client"
                        label={t('tenders.form.client')}
                        name="clientId"
                        value={form.clientId}
                        onChange={handleChange}
                        required
                        searchable
                        placeholder={t('tenders.form.selectClient')}
                        options={clients.map((item) => ({ value: String(item.id), label: item.name }))}
                        onQuickCreate={(name) => openQuickCreate('client', name, (item) => {
                            setClients((prev) => [...prev, item.raw])
                            handleChange({ target: { name: 'clientId', value: item.value } })
                        })}
                    />

                    <FormSelect
                        id="tender-status"
                        label={t('common.status')}
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        placeholder={t('tenders.form.selectStatus')}
                        options={[
                            { value: 'OPEN', label: t('statuses.OPEN') },
                            { value: 'PUBLISHED', label: t('statuses.PUBLISHED') },
                            { value: 'IN_PROGRESS', label: t('statuses.IN_PROGRESS') },
                            { value: 'CLOSED', label: t('statuses.CLOSED') },
                            { value: 'CANCELLED', label: t('statuses.CANCELLED') },
                        ]}
                    />

                    <FormField
                        id="tender-estimated-value"
                        label={t('tenders.form.estimatedValue')}
                        type="number"
                        step="0.01"
                        min="0"
                        name="estimatedValue"
                        value={form.estimatedValue}
                        onChange={handleChange}
                        placeholder={t('tenders.form.estimatedValue')}
                    />

                    <FormField
                        id="tender-published-at"
                        label={t('tenders.form.publishedAt')}
                        type="date"
                        name="publishedAt"
                        value={form.publishedAt}
                        onChange={handleChange}
                    />

                    <FormField
                        id="tender-deadline"
                        label={t('tenders.form.deadline')}
                        type="date"
                        name="deadline"
                        value={form.deadline}
                        onChange={handleChange}
                    />

                    <TextareaField
                        id="tender-description"
                        label={t('common.description')}
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder={t('common.description')}
                        rows={5}
                        className="md:col-span-2"
                    />

                    <div className="md:col-span-2 flex justify-end gap-3">
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
                            {loading ? t('common.saving') : editingId ? t('common.saveChanges') : t('tenders.createBtn')}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title={t('tenders.deleteTitle')}
                message={t('tenders.deleteConfirm', { name: deletingItem?.title || '' })}
                onClose={deleteModal.close}
                onConfirm={handleDelete}
                loading={loading}
            />

            <ConfirmModal
                isOpen={participantDeleteModal.isOpen}
                title={t('tenders.participants.deleteTitle')}
                message={t('tenders.participants.deleteConfirm', { name: deletingParticipant?.manufacturerName || '' })}
                onClose={participantDeleteModal.close}
                onConfirm={handleParticipantDelete}
                loading={loading}
            />

            <ConfirmModal
                isOpen={bulkDeleteModal.isOpen}
                title={t('tenders.bulkDeleteTitle')}
                message={t('tenders.bulkDeleteConfirm', { count: selectedIds.length })}
                onClose={bulkDeleteModal.close}
                onConfirm={handleBulkDelete}
                loading={loading}
            />

            <ConfirmModal
                isOpen={participantBulkDeleteModal.isOpen}
                title={t('tenders.participants.bulkDeleteTitle')}
                message={t('tenders.participants.bulkDeleteConfirm', { count: selectedParticipantIds.length })}
                onClose={participantBulkDeleteModal.close}
                onConfirm={handleParticipantBulkDelete}
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