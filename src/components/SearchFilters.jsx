import { useTranslation } from 'react-i18next'
import CustomSelect from "./CustomSelect"

/**
 * Search box plus a set of multi-select filters. Each filter's `value` is an array of selected
 * option values and `onChange` receives the new array. An empty array means "no filter" (show all),
 * so the option lists should NOT include an "All ..." sentinel.
 */
export default function SearchFilters({
                                          search,
                                          onSearchChange,
                                          filters = [],
                                          rightContent,
                                      }) {
    const { t } = useTranslation()
    return (
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-4 lg:grid-cols-[2fr_repeat(3,1fr)]">
                <input
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={t('common.search')}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950"
                />

                {filters.map((filter) => (
                    <CustomSelect
                        key={filter.key}
                        multiple
                        options={filter.options}
                        value={filter.value}
                        onChange={filter.onChange}
                        placeholder={filter.placeholder || t('common.allStatuses')}
                        ariaLabel={filter.placeholder}
                    />
                ))}
            </div>

            {rightContent ? <div className="flex justify-end">{rightContent}</div> : null}
        </div>
    )
}
