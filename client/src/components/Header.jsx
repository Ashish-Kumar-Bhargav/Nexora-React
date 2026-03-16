import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect, useCallback } from 'react'
import NotificationBell from './NotificationBell.jsx'
import { useTheme } from './ThemeProvider.jsx'
import { Search, X, Sun, Moon } from 'lucide-react'

const roleColors = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-green-100 text-green-700',
  user: 'bg-gray-100 text-gray-700',
}

const TYPE_COLORS = {
  Invoice: 'bg-blue-100 text-blue-700',
  Quotation: 'bg-yellow-100 text-yellow-700',
  Customer: 'bg-green-100 text-green-700',
  Product: 'bg-purple-100 text-purple-700',
  Supplier: 'bg-orange-100 text-orange-700',
  'Credit Note': 'bg-red-100 text-red-700',
  'Purchase Order': 'bg-indigo-100 text-indigo-700',
  User: 'bg-teal-100 text-teal-700',
  Inventory: 'bg-cyan-100 text-cyan-700',
}

function getPageTitle(pathname) {
  const map = {
    '/dashboard': 'Dashboard',
    '/products': 'Products',
    '/inventory': 'Inventory',
    '/customers': 'Customers',
    '/quotations': 'Quotations',
    '/invoices': 'Invoices',
    '/reports': 'Reports',
    '/users': 'Users',
    '/companies': 'Companies',
    '/activity-log': 'Activity Log',
    '/profile': 'My Profile',
    '/credit-notes': 'Credit Notes',
    '/recurring-invoices': 'Recurring Invoices',
    '/suppliers': 'Suppliers',
    '/purchase-orders': 'Purchase Orders',
    '/settings/custom-fields': 'Custom Fields',
    '/settings/smtp': 'Email Settings',
  }
  return map[pathname] || 'Nexora ERP'
}

export default function Header({ user, title }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const pageTitle = title || getPageTitle(location.pathname)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)
  const debounceRef = useRef(null)

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); setShowResults(false); return }
    setSearching(true)
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (json.success) { setResults(json.data.results); setShowResults(true) }
    } finally { setSearching(false) }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, doSearch])

  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(result) {
    setQuery('')
    setShowResults(false)
    navigate(result.href)
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 shadow-sm dark:shadow-slate-900/50 flex-shrink-0 gap-4">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-slate-100 flex-shrink-0">{pageTitle}</h1>

      <div ref={searchRef} className="flex-1 max-w-md relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowResults(true) }}
            placeholder="Search invoices, customers, products..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
          />
          {query && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {showResults && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/70 border border-gray-100 dark:border-slate-700 overflow-hidden z-50 max-h-80 overflow-y-auto">
            {searching ? (
              <div className="flex items-center justify-center py-6 gap-2 text-gray-400 dark:text-slate-400 text-sm">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-6 text-gray-400 dark:text-slate-500 text-sm">No results found</div>
            ) : (
              <ul>
                {results.map((r) => (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition text-left"
                    >
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_COLORS[r.type] || 'bg-gray-100 text-gray-600'}`}>
                        {r.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{r.title}</p>
                        {r.subtitle && <p className="text-xs text-gray-400 dark:text-slate-400 truncate">{r.subtitle}</p>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <NotificationBell />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800 dark:text-slate-100">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{user?.companyName || 'Nexora'}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
              {initials}
            </div>
            {user?.role && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize hidden md:inline-flex ${roleColors[user.role] || roleColors.user}`}>
                {user.role.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
