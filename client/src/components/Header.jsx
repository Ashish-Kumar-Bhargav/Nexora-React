import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect, useCallback } from 'react'
import NotificationBell from './NotificationBell.jsx'
import { useTheme } from './ThemeProvider.jsx'
import { Search, X, Sun, Moon, Menu } from 'lucide-react'

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
    '/settings/plan': 'Subscription Plan',
  }
  return map[pathname] || 'SmartBilling'
}

export default function Header({ user, title, onMenuClick }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const pageTitle = title || getPageTitle(location.pathname)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false) // mobile search toggle
  const searchRef = useRef(null)
  const mobileInputRef = useRef(null)
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

  // Focus input when mobile search opens
  useEffect(() => {
    if (searchOpen && mobileInputRef.current) {
      setTimeout(() => mobileInputRef.current?.focus(), 50)
    }
  }, [searchOpen])

  function handleSelect(result) {
    setQuery('')
    setResults([])
    setShowResults(false)
    setSearchOpen(false)
    navigate(result.href)
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  const SearchResults = () => (
    showResults ? (
      <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/70 border border-gray-100 dark:border-slate-700 overflow-hidden z-50 max-h-72 overflow-y-auto">
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
    ) : null
  )

  return (
    <header className="relative h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center px-4 gap-3 shadow-sm dark:shadow-slate-900/50 flex-shrink-0">

      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-slate-200 transition-colors flex-shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <h1 className="text-base sm:text-xl font-semibold text-gray-800 dark:text-slate-100 flex-shrink-0 truncate">
        {pageTitle}
      </h1>

      {/* Desktop search */}
      <div ref={searchRef} className="hidden md:flex flex-1 max-w-md relative ml-2">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowResults(true) }}
            placeholder="Search invoices, customers..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
          />
          {query && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <SearchResults />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">

        {/* Mobile search toggle */}
        <button
          onClick={() => setSearchOpen((v) => !v)}
          className="md:hidden p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <NotificationBell />

        {/* User info */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden lg:block">
            <p className="text-sm font-medium text-gray-800 dark:text-slate-100 leading-tight">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{user?.companyName || 'SmartBilling'}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-xs sm:text-sm font-semibold shadow-sm">
              {initials}
            </div>
            {user?.role && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize hidden xl:inline-flex ${roleColors[user.role] || roleColors.user}`}>
                {user.role.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 z-40 shadow-lg">
          <div ref={searchRef} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={mobileInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => { if (results.length > 0) setShowResults(true) }}
              placeholder="Search invoices, customers, products..."
              className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-slate-100"
            />
            <button
              onClick={() => { clearSearch(); setSearchOpen(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
            <SearchResults />
          </div>
        </div>
      )}
    </header>
  )
}
