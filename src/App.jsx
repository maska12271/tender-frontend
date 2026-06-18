import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedLayout from './components/ProtectedLayout'
import RequireAdmin from './components/RequireAdmin'
import RequirePermission from './components/RequirePermission'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ManufacturersPage from './pages/ManufacturersPage'
import ManufacturerDetailPage from './pages/ManufacturerDetailPage'
import CategoriesPage from './pages/CategoriesPage'
import ClientsPage from './pages/ClientsPage'
import ClientDetailPage from './pages/ClientDetailPage'
import SalesOrdersPage from './pages/SalesOrdersPage'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import TendersPage from './pages/TendersPage'
import UsersPage from './pages/UsersPage'
import UserDetailPage from './pages/UserDetailPage'

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route
                    path="/products"
                    element={<RequirePermission module="PRODUCTS"><ProductsPage /></RequirePermission>}
                />
                <Route
                    path="/products/:id"
                    element={<RequirePermission module="PRODUCTS"><ProductDetailPage /></RequirePermission>}
                />
                <Route
                    path="/manufacturers"
                    element={<RequirePermission module="MANUFACTURERS"><ManufacturersPage /></RequirePermission>}
                />
                <Route
                    path="/manufacturers/:id"
                    element={<RequirePermission module="MANUFACTURERS"><ManufacturerDetailPage /></RequirePermission>}
                />
                <Route
                    path="/categories"
                    element={<RequirePermission module="CATEGORIES"><CategoriesPage /></RequirePermission>}
                />
                <Route
                    path="/clients"
                    element={<RequirePermission module="CLIENTS"><ClientsPage /></RequirePermission>}
                />
                <Route
                    path="/clients/:id"
                    element={<RequirePermission module="CLIENTS"><ClientDetailPage /></RequirePermission>}
                />
                <Route
                    path="/sales-orders"
                    element={<RequirePermission module="SALES_ORDERS"><SalesOrdersPage /></RequirePermission>}
                />
                <Route
                    path="/sales-orders/:id"
                    element={<RequirePermission module="SALES_ORDERS"><OrderDetailPage type="sales" /></RequirePermission>}
                />
                <Route
                    path="/purchase-orders"
                    element={<RequirePermission module="PURCHASE_ORDERS"><PurchaseOrdersPage /></RequirePermission>}
                />
                <Route
                    path="/purchase-orders/:id"
                    element={<RequirePermission module="PURCHASE_ORDERS"><OrderDetailPage type="purchase" /></RequirePermission>}
                />
                <Route
                    path="/tenders"
                    element={<RequirePermission module="TENDERS"><TendersPage /></RequirePermission>}
                />
                <Route
                    path="/users"
                    element={
                        <RequireAdmin>
                            <UsersPage />
                        </RequireAdmin>
                    }
                />
                <Route
                    path="/users/:id"
                    element={
                        <RequireAdmin>
                            <UserDetailPage />
                        </RequireAdmin>
                    }
                />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}
