export function formatMoney(value) {
    const number = Number(value || 0)
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
    }).format(number)
}

export function formatDate(value) {
    if (!value) return '-'
    return new Date(value).toLocaleDateString()
}

export function safeArray(value) {
    return Array.isArray(value) ? value : value?.content || []
}

export function isActiveStatus(status) {
    return ['NEW', 'OPEN', 'IN_PROGRESS', 'PUBLISHED', 'CONFIRMED'].includes(String(status || '').toUpperCase())
}

// Lenient parsers used when importing user-supplied CSV cells.
export function parseBool(value, fallback = true) {
    if (value == null || value === '') return fallback
    const v = String(value).trim().toLowerCase()
    if (['true', 'yes', 'y', '1', 'active'].includes(v)) return true
    if (['false', 'no', 'n', '0', 'inactive', 'archived'].includes(v)) return false
    return fallback
}

export function toNumber(value, fallback = 0) {
    if (value == null || value === '') return fallback
    const cleaned = String(value).replace(/[^0-9.-]/g, '')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : fallback
}