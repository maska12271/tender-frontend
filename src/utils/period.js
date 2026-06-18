// Statistics period preset keys shared by the detail pages. Order dates are "YYYY-MM-DD" strings, so
// ranges are compared lexicographically (no timezone math). `all` means no bounds. Labels come from
// the i18n `period.*` dictionary, keyed by these.
export const PERIOD_KEYS = ['all', 'thisMonth', 'lastMonth', 'last12', 'thisYear', 'lastYear']

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function periodRange(key, now = new Date()) {
    const y = now.getFullYear()
    const m = now.getMonth()
    switch (key) {
        case 'thisMonth':
            return { start: ymd(new Date(y, m, 1)), end: ymd(new Date(y, m + 1, 0)) }
        case 'lastMonth':
            return { start: ymd(new Date(y, m - 1, 1)), end: ymd(new Date(y, m, 0)) }
        case 'last12':
            return { start: ymd(new Date(y, m - 11, 1)), end: ymd(new Date(y, m + 1, 0)) }
        case 'thisYear':
            return { start: `${y}-01-01`, end: `${y}-12-31` }
        case 'lastYear':
            return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` }
        default:
            return null
    }
}
