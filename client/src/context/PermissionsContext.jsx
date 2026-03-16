import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ALL_PAGE_KEYS, ALWAYS_ALLOWED_PAGES } from '../lib/pages.js'

const PermissionsContext = createContext({
  allowedPages: ALL_PAGE_KEYS,
  isFullAccess: false,
  isLoaded: false,
  canAccess: () => true,
  refresh: () => {},
})

export function PermissionsProvider({ children }) {
  const [allowedPages, setAllowedPages] = useState([])
  const [isFullAccess, setIsFullAccess] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const fetchPermissions = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { setIsLoaded(true); return }
    try {
      const res = await fetch('/api/permissions/my', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) {
        setAllowedPages(json.data.allowedPages)
        setIsFullAccess(json.data.isFullAccess)
      }
    } catch { /* ignore */ } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => { fetchPermissions() }, [fetchPermissions])

  function canAccess(pageKey) {
    if (!pageKey) return true
    if (ALWAYS_ALLOWED_PAGES.includes(pageKey)) return true
    if (isFullAccess) return true
    return allowedPages.includes(pageKey)
  }

  return (
    <PermissionsContext.Provider value={{ allowedPages, isFullAccess, isLoaded, canAccess, refresh: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionsContext)
}
