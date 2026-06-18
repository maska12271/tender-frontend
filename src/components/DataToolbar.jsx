import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Upload } from 'lucide-react'
import { exportToCsv } from '../utils/csv'
import ImportModal from './ImportModal'

/**
 * Header toolbar with Export (always) and Import (when `importConfig.canImport`).
 * Export writes the rows it is given — pass the page's already-filtered rows so the export
 * mirrors the current search/filter view. Import is offered only for entities that map cleanly
 * to a flat CSV; omit `importConfig` to render export only.
 */
export default function DataToolbar({ entityLabel, exportColumns, rows, importConfig, onImported }) {
    const { t } = useTranslation()
    const [importOpen, setImportOpen] = useState(false)
    const canImport = Boolean(importConfig?.canImport)

    const handleExport = () => {
        const date = new Date().toISOString().slice(0, 10)
        exportToCsv(`${entityLabel}-${date}.csv`, exportColumns, rows)
    }

    return (
        <>
            <button
                type="button"
                onClick={handleExport}
                disabled={rows.length === 0}
                title={rows.length === 0 ? t('toolbar.nothingToExport') : t('toolbar.exportTitle', { count: rows.length })}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
                <Download className="h-4 w-4" /> {t('toolbar.export')}
            </button>

            {canImport && (
                <button
                    type="button"
                    onClick={() => setImportOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    <Upload className="h-4 w-4" /> {t('toolbar.import')}
                </button>
            )}

            {canImport && importOpen && (
                <ImportModal
                    isOpen
                    onClose={() => setImportOpen(false)}
                    entityLabel={entityLabel}
                    endpoint={importConfig.endpoint}
                    templateColumns={importConfig.templateColumns}
                    parseRow={importConfig.parseRow}
                    onImported={onImported}
                />
            )}
        </>
    )
}
