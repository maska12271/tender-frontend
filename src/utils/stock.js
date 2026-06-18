// Stock health derived from quantity vs. the reorder threshold (minimum stock).
// 'out' = nothing left, 'low' = at/below the reorder point, 'ok' = healthy.
export function stockStatusOf(row) {
    if (Number(row.stockQuantity) <= 0) return 'out'
    if (Number(row.stockQuantity) <= Number(row.minimumStock)) return 'low'
    return 'ok'
}
