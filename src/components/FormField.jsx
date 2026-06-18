import CustomSelect from "./CustomSelect";

/**
 * Form select backed by {@link CustomSelect}. Emits an `onChange` shaped like a native event
 * (`{ target: { name, value } }`) so existing form handlers keep working unchanged. Pass
 * `searchable` for long lists (products, clients, manufacturers). `options` is `[{ value, label }]`.
 */
export function FormSelect({
                               id,
                               label,
                               name,
                               value,
                               onChange,
                               options = [],
                               placeholder = "Select...",
                               required = false,
                               searchable = false,
                               className = "",
                               onQuickCreate,
                           }) {
    return (
        <div className={`space-y-2 ${className}`}>
            <label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {label}
            </label>
            <CustomSelect
                id={id}
                options={options}
                value={value}
                searchable={searchable}
                placeholder={placeholder}
                ariaLabel={typeof label === "string" ? label : undefined}
                onChange={(val) => onChange({ target: { name, value: val } })}
                onQuickCreate={onQuickCreate}
            />
            {required && (
                <input
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    required
                    value={value ?? ""}
                    onChange={() => {}}
                />
            )}
        </div>
    );
}

export function FormField({
                              id,
                              label,
                              name,
                              value,
                              onChange,
                              type = "text",
                              placeholder = "",
                              required = false,
                              className = "",
                              inputClassName = "",
                              ...props
                          }) {
    return (
        <div className={`space-y-2 ${className}`}>
            <label
                htmlFor={id}
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
                {label}
            </label>
            <input
                id={id}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                required={required}
                placeholder={placeholder}
                className={`w-full rounded-xl border border-slate-300 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-950 ${inputClassName}`}
                {...props}
            />
        </div>
    );
}

export function TextareaField({
                                  id,
                                  label,
                                  name,
                                  value,
                                  onChange,
                                  placeholder = "",
                                  required = false,
                                  className = "",
                                  rows = 4,
                              }) {
    return (
        <div className={`space-y-2 ${className}`}>
            <label
                htmlFor={id}
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
                {label}
            </label>
            <textarea
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                placeholder={placeholder}
                rows={rows}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-950"
            />
        </div>
    );
}

export function SelectField({
                                id,
                                label,
                                name,
                                value,
                                onChange,
                                required = false,
                                className = "",
                                children,
                            }) {
    return (
        <div className={`space-y-2 ${className}`}>
            <label
                htmlFor={id}
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
                {label}
            </label>
            <select
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-950"
            >
                {children}
            </select>
        </div>
    );
}