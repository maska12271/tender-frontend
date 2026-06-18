// Minimal, dependency-free CSV helpers (RFC 4180-style quoting) used by the data
// export/import feature. Quoting handles values containing commas, quotes and newlines;
// a UTF-8 BOM is prepended on download so Excel opens accented text correctly.

const BOM = String.fromCharCode(0xfeff)

function escapeCell(value) {
    if (value == null) return ''
    const text = String(value)
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
    }
    return text
}

/**
 * Build CSV text from column descriptors and rows.
 * @param {{header: string, value?: (row) => unknown, field?: string}[]} columns
 * @param {object[]} rows
 */
export function buildCsv(columns, rows) {
    const headerLine = columns.map((c) => escapeCell(c.header)).join(',')
    const bodyLines = rows.map((row) =>
        columns.map((c) => escapeCell(c.value ? c.value(row) : row[c.field])).join(','),
    )
    return [headerLine, ...bodyLines].join('\r\n')
}

/** Trigger a browser download of CSV text (with a UTF-8 BOM for Excel). */
export function downloadCsv(filename, csv) {
    const blob = new Blob([BOM, csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export function exportToCsv(filename, columns, rows) {
    downloadCsv(filename, buildCsv(columns, rows))
}

/** Tokenize CSV text into a matrix of strings, honouring quoted fields. */
function parseCsvMatrix(text) {
    const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
    const rows = []
    let row = []
    let field = ''
    let inQuotes = false

    for (let i = 0; i < input.length; i++) {
        const ch = input[i]
        if (inQuotes) {
            if (ch === '"') {
                if (input[i + 1] === '"') {
                    field += '"'
                    i++
                } else {
                    inQuotes = false
                }
            } else {
                field += ch
            }
        } else if (ch === '"') {
            inQuotes = true
        } else if (ch === ',') {
            row.push(field)
            field = ''
        } else if (ch === '\n') {
            row.push(field)
            rows.push(row)
            row = []
            field = ''
        } else if (ch !== '\r') {
            field += ch
        }
    }
    row.push(field)
    rows.push(row)
    return rows
}

/**
 * Parse CSV text into `{ headers, records }`, where each record is an object keyed by the
 * (trimmed) header row. Fully empty lines are dropped and all values are trimmed.
 */
export function parseCsvToObjects(text) {
    const matrix = parseCsvMatrix(text).filter((cells) => cells.some((c) => c.trim() !== ''))
    if (matrix.length === 0) return { headers: [], records: [] }

    const headers = matrix[0].map((h) => h.trim())
    const records = matrix.slice(1).map((cells) => {
        const record = {}
        headers.forEach((header, i) => {
            record[header] = (cells[i] ?? '').trim()
        })
        return record
    })
    return { headers, records }
}
