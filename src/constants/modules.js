/**
 * Permission modules shared between the sidebar, route guards and the admin permission editor.
 * Mirrors the backend {@code PermissionModule} enum. Keep the keys in sync.
 */
// `navKey` indexes the i18n `nav.*` dictionary so the module name can be shown translated.
export const PERMISSION_MODULES = [
    { module: 'PRODUCTS', label: 'Products', navKey: 'products', path: '/products' },
    { module: 'MANUFACTURERS', label: 'Manufacturers', navKey: 'manufacturers', path: '/manufacturers' },
    { module: 'CATEGORIES', label: 'Categories', navKey: 'categories', path: '/categories' },
    { module: 'CLIENTS', label: 'Clients', navKey: 'clients', path: '/clients' },
    { module: 'SALES_ORDERS', label: 'Sales Orders', navKey: 'salesOrders', path: '/sales-orders' },
    { module: 'PURCHASE_ORDERS', label: 'Purchase Orders', navKey: 'purchaseOrders', path: '/purchase-orders' },
    { module: 'TENDERS', label: 'Tenders', navKey: 'tenders', path: '/tenders' },
]
