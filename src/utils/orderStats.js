// Aggregates the flat order-line list returned by the manufacturer/client detail endpoints into the
// shapes their pages render: one row per order, one row per product, a monthly time series and a
// summary. Each line is { orderId, orderNumber, orderDate, status, productId, productName, sku,
// quantity, lineTotal }. The monthly points use generic `units`/`amount` keys so a single TrendChart
// config can plot either "units sold / revenue" (client) or "units purchased / spend" (manufacturer).
export function aggregateOrderLines(lines = []) {
    const orderMap = new Map()
    const productMap = new Map()
    const monthMap = new Map()
    let totalUnits = 0
    let totalAmount = 0

    const countedOrders = new Set()

    for (const l of lines) {
        const qty = l.quantity || 0
        const amount = Number(l.lineTotal) || 0
        const cancelled = String(l.status || '').toUpperCase() === 'CANCELLED'

        // Every order (cancelled included) appears as a row in the table for completeness.
        if (l.orderId != null) {
            let o = orderMap.get(l.orderId)
            if (!o) {
                o = { orderId: l.orderId, orderNumber: l.orderNumber, orderDate: l.orderDate, status: l.status, itemCount: 0, quantity: 0, total: 0 }
                orderMap.set(l.orderId, o)
            }
            o.itemCount += 1
            o.quantity += qty
            o.total += amount
        }

        // ...but cancelled orders never count toward spend/revenue, units, products or the chart.
        if (cancelled) continue

        totalUnits += qty
        totalAmount += amount
        if (l.orderId != null) countedOrders.add(l.orderId)

        if (l.productId != null) {
            let p = productMap.get(l.productId)
            if (!p) {
                p = { productId: l.productId, name: l.productName, sku: l.sku, quantity: 0, total: 0 }
                productMap.set(l.productId, p)
            }
            p.quantity += qty
            p.total += amount
        }

        if (l.orderDate) {
            const month = l.orderDate.slice(0, 7)
            let mm = monthMap.get(month)
            if (!mm) {
                mm = { month, units: 0, amount: 0 }
                monthMap.set(month, mm)
            }
            mm.units += qty
            mm.amount += amount
        }
    }

    const orders = [...orderMap.values()].sort((a, b) => String(b.orderDate || '').localeCompare(String(a.orderDate || '')))
    const products = [...productMap.values()].sort((a, b) => b.total - a.total)
    const monthly = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month))

    return {
        orders,
        products,
        monthly,
        summary: {
            orderCount: countedOrders.size,
            productCount: productMap.size,
            totalUnits,
            totalAmount,
            avgOrderValue: countedOrders.size ? totalAmount / countedOrders.size : 0,
        },
    }
}
