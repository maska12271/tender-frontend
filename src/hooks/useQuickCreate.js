import { useState, useRef } from 'react'

/**
 * Manages the open/close state for QuickCreateModal.
 * Uses a ref for the onCreated callback to avoid stale closure issues across async API calls.
 */
export function useQuickCreate() {
    const [quickCreate, setQuickCreate] = useState(null)
    const callbackRef = useRef(null)

    const openQuickCreate = (type, name, onCreated) => {
        callbackRef.current = onCreated
        setQuickCreate({ type, name })
    }

    const closeQuickCreate = () => {
        callbackRef.current = null
        setQuickCreate(null)
    }

    const handleQuickCreated = (item) => {
        callbackRef.current?.(item)
        callbackRef.current = null
        setQuickCreate(null)
    }

    return { quickCreate, openQuickCreate, closeQuickCreate, handleQuickCreated }
}
