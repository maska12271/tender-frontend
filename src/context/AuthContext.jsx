import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost, setUnauthorizedHandler } from '../api/client'

const AuthContext = createContext(null)

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

const MANAGER_ROLES = ['OWNER', 'ADMINISTRATOR']

function readStoredUser() {
    try {
        const raw = localStorage.getItem(USER_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
    const [user, setUser] = useState(readStoredUser)

    const persistUser = useCallback((nextUser) => {
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
        setUser(nextUser)
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
    }, [])

    // Let the API client trigger a logout when the backend rejects the token (401).
    useEffect(() => {
        setUnauthorizedHandler(logout)
        return () => setUnauthorizedHandler(null)
    }, [logout])

    // Refresh the profile (and its permissions) from the server whenever a token is present, so
    // permission changes made by an admin take effect on the next load and sessions stored before
    // permissions existed get backfilled.
    useEffect(() => {
        if (!token) return
        let cancelled = false
        apiGet('/auth/me')
            .then((fresh) => {
                if (!cancelled && fresh) persistUser(fresh)
            })
            .catch(() => {
                /* 401 is handled by the unauthorized handler; ignore other transient errors. */
            })
        return () => {
            cancelled = true
        }
    }, [token, persistUser])

    const login = useCallback(async (email, password) => {
        const response = await apiPost('/auth/login', { email, password })
        localStorage.setItem(TOKEN_KEY, response.token)
        localStorage.setItem(USER_KEY, JSON.stringify(response.user))
        setToken(response.token)
        setUser(response.user)
        return response.user
    }, [])

    const isAdmin = MANAGER_ROLES.includes(user?.role)

    /**
     * Whether the current user may perform `action` ('canView' | 'canCreate' | 'canEdit' |
     * 'canDelete') on `module`. Owners and administrators are unrestricted.
     */
    const can = useCallback((module, action = 'canView') => {
        if (!user) return false
        if (MANAGER_ROLES.includes(user.role)) return true
        const flags = user.permissions?.[module]
        return Boolean(flags && flags[action])
    }, [user])

    const value = useMemo(() => ({
        token,
        user,
        isAuthenticated: Boolean(token),
        isAdmin,
        permissions: user?.permissions || {},
        can,
        login,
        logout,
    }), [token, user, isAdmin, can, login, logout])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    return useContext(AuthContext)
}

/**
 * Convenience hook returning the four access flags for a single module, e.g.
 * `const { canView, canCreate, canEdit, canDelete } = usePermissions('PRODUCTS')`.
 */
export function usePermissions(module) {
    const { can } = useAuth()
    return {
        canView: can(module, 'canView'),
        canCreate: can(module, 'canCreate'),
        canEdit: can(module, 'canEdit'),
        canDelete: can(module, 'canDelete'),
    }
}
