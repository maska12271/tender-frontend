const API_BASE_URL = 'http://localhost:8080/api'

// Registered by AuthContext so the client can force a logout when the token is rejected.
let unauthorizedHandler = null

// Registered by ToastProvider so every failed request surfaces an error notification.
let errorHandler = null

export function setUnauthorizedHandler(handler) {
    unauthorizedHandler = handler
}

export function setErrorHandler(handler) {
    errorHandler = handler
}

function reportError(message) {
    if (errorHandler) errorHandler(message)
}

function getToken() {
    return localStorage.getItem('token')
}

async function request(path, options = {}) {
    // `suppressErrorToast` lets bulk callers (e.g. CSV import) handle failures per-row
    // instead of firing a global error toast for every failed request.
    const { suppressErrorToast = false, headers: customHeaders, ...fetchOptions } = options
    const token = getToken()

    let response
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(customHeaders || {}),
            },
            ...fetchOptions,
        })
    } catch {
        // Network failure / server unreachable - fetch rejects before any response.
        const message = 'Unable to reach the server. Check your connection and try again.'
        if (!suppressErrorToast) reportError(message)
        throw new Error(message)
    }

    if (response.status === 401) {
        // The session-expired path drives a logout/redirect; no separate error toast needed.
        if (unauthorizedHandler) unauthorizedHandler()
        throw new Error('Your session has expired. Please log in again.')
    }

    if (!response.ok) {
        const message = await extractError(response)
        if (!suppressErrorToast) reportError(message)
        throw new Error(message)
    }

    if (response.status === 204) {
        return null
    }

    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()

    if (!text) {
        return null
    }

    if (contentType.includes('application/json')) {
        return JSON.parse(text)
    }

    return text
}

async function extractError(response) {
    const text = await response.text()
    if (!text) {
        return `Request failed: ${response.status}`
    }
    try {
        const parsed = JSON.parse(text)
        return parsed.error || parsed.message || text
    } catch {
        return text
    }
}

export function apiGet(path) {
    return request(path)
}

export function apiPost(path, body, options = {}) {
    return request(path, {
        method: 'POST',
        body: JSON.stringify(body),
        ...options,
    })
}

export function apiPut(path, body) {
    return request(path, {
        method: 'PUT',
        body: JSON.stringify(body),
    })
}

export function apiPatch(path, body) {
    return request(path, {
        method: 'PATCH',
        body: JSON.stringify(body),
    })
}

export function apiDelete(path) {
    return request(path, {
        method: 'DELETE',
    })
}

export async function apiUpload(path, formData) {
    const token = getToken()
    let response
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        })
    } catch {
        const message = 'Unable to reach the server. Check your connection and try again.'
        reportError(message)
        throw new Error(message)
    }

    if (response.status === 401) {
        if (unauthorizedHandler) unauthorizedHandler()
        throw new Error('Your session has expired. Please log in again.')
    }

    if (!response.ok) {
        const message = await extractError(response)
        reportError(message)
        throw new Error(message)
    }

    return response.json()
}
