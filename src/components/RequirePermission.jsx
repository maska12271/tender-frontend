import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Gates a route by a single module permission. Users lacking the required access are redirected to
 * the dashboard (which every authenticated user can reach).
 */
export default function RequirePermission({ module, action = 'canView', children }) {
    const { can } = useAuth()

    if (!can(module, action)) {
        return <Navigate to="/dashboard" replace />
    }

    return children
}
