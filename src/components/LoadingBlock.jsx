import { useTranslation } from 'react-i18next'

export default function LoadingBlock({ text }) {
    const { t } = useTranslation()
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {text ?? t('common.loading')}
        </div>
    )
}
