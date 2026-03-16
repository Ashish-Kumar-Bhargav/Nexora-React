import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Package, Warehouse, Users, FileText, Receipt,
  UserCog, Building2, LogOut, ChevronRight, ChevronDown, Zap, RefreshCw,
  BarChart2, Settings, X, CheckCircle, Activity, User, FileCheck,
  RepeatIcon, Truck, ShoppingCart, Mail, Menu, PanelLeftClose, Lock,
} from 'lucide-react'
import { usePermissions } from '../context/PermissionsContext.jsx'

const navGroups = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'manager', 'user'], pageKey: 'dashboard' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/customers', label: 'Customers', icon: Users, roles: ['super_admin', 'admin', 'manager', 'user'], pageKey: 'customers' },
      { href: '/quotations', label: 'Quotations', icon: FileText, roles: ['super_admin', 'admin', 'manager', 'user'], pageKey: 'quotations' },
      { href: '/invoices', label: 'Invoices', icon: Receipt, roles: ['super_admin', 'admin', 'manager', 'user'], pageKey: 'invoices' },
      { href: '/credit-notes', label: 'Credit Notes', icon: FileCheck, roles: ['super_admin', 'admin', 'manager'], pageKey: 'credit-notes' },
      { href: '/recurring-invoices', label: 'Recurring', icon: RepeatIcon, roles: ['super_admin', 'admin', 'manager'], pageKey: 'recurring-invoices' },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { href: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['super_admin', 'admin', 'manager'], pageKey: 'suppliers' },
      { href: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, roles: ['super_admin', 'admin', 'manager'], pageKey: 'purchase-orders' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { href: '/products', label: 'Products', icon: Package, roles: ['super_admin', 'admin', 'manager', 'user'], pageKey: 'products' },
      { href: '/inventory', label: 'Inventory', icon: Warehouse, roles: ['super_admin', 'admin', 'manager', 'user'], pageKey: 'inventory' },
    ],
  },
  {
    label: 'Reports & Logs',
    items: [
      { href: '/reports', label: 'Reports', icon: BarChart2, roles: ['super_admin', 'admin', 'manager'], pageKey: 'reports' },
      { href: '/activity-log', label: 'Activity Log', icon: Activity, roles: ['super_admin', 'admin', 'manager'], pageKey: 'activity-log' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/users', label: 'Users', icon: UserCog, roles: ['super_admin', 'admin'], pageKey: 'users' },
      { href: '/companies', label: 'Companies', icon: Building2, roles: ['super_admin'], pageKey: null },
      { href: '/settings/custom-fields', label: 'Custom Fields', icon: Settings, roles: ['super_admin', 'admin'], pageKey: 'custom-fields' },
      { href: '/settings/smtp', label: 'Email Settings', icon: Mail, roles: ['super_admin', 'admin'], pageKey: 'smtp-settings' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/profile', label: 'My Profile', icon: User, roles: ['super_admin', 'admin', 'manager', 'user'], pageKey: 'profile' },
    ],
  },
]

export default function Sidebar({ userRole, userName, userEmail: userEmailProp, userCompanyName }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { canAccess } = usePermissions()
  const [collapsed, setCollapsed] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState(new Set())
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState('')
  const [companies, setCompanies] = useState([])
  const [companiesCount, setCompaniesCount] = useState(0)
  const [currentCompanyId, setCurrentCompanyId] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed')
    if (saved === 'true') setCollapsed(true)
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const u = JSON.parse(userStr)
        setCompaniesCount(u.companiesCount || 0)
        setCurrentCompanyId(u.companyId || '')
      }
      const companiesStr = localStorage.getItem('companies')
      if (companiesStr) {
        const c = JSON.parse(companiesStr)
        setCompanies(c)
        setCompaniesCount((prev) => Math.max(prev, c.length))
      }
    } catch { /* ignore */ }
  }, [])

  function toggleSidebar() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar_collapsed', String(next))
  }

  function toggleGroup(label) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const displayName = userName || ''
  const userEmail = userEmailProp || ''
  const companyName = userCompanyName || ''

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('companies')
    navigate('/login', { replace: true })
  }

  const handleSwitchCompany = async (targetCompanyId) => {
    if (targetCompanyId === currentCompanyId) { setShowSwitchModal(false); return }
    setSwitching(true); setSwitchError('')
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch('/api/auth/switch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetCompanyId }),
      })
      const json = await res.json()
      if (json.success) {
        localStorage.setItem('token', json.data.token)
        localStorage.setItem('user', JSON.stringify(json.data.user))
        localStorage.setItem('companies', JSON.stringify(json.data.companies || []))
        setCurrentCompanyId(targetCompanyId)
        setShowSwitchModal(false)
        navigate('/dashboard')
        window.location.reload()
      } else {
        setSwitchError(json.message || 'Failed to switch company')
      }
    } catch {
      setSwitchError('Network error. Please try again.')
    } finally {
      setSwitching(false)
    }
  }

  const initials = displayName
    ? displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <>
      <aside className={`${collapsed ? 'w-16' : 'w-64'} min-h-screen bg-[#0f172a] flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative`}>
        <div className="h-16 flex items-center justify-between px-3 border-b border-slate-700 flex-shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap size={16} className="text-white" />
              </div>
              <span className="text-white font-bold text-xl tracking-widest whitespace-nowrap">NEXORA</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
              <Zap size={16} className="text-white" />
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition flex-shrink-0 ${collapsed ? 'absolute -right-3 top-5 bg-slate-700 border border-slate-600 rounded-full z-10 p-1' : ''}`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <Menu size={14} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-hide py-3 px-2">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) => item.roles.includes(userRole))
            if (visibleItems.length === 0) return null
            const isGroupCollapsed = collapsedGroups.has(group.label)

            return (
              <div key={group.label} className="mb-2">
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-2 mb-1 group"
                  >
                    <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider group-hover:text-slate-400 transition">
                      {group.label}
                    </span>
                    <ChevronDown size={12} className={`text-slate-600 transition-transform ${isGroupCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                )}

                {(!isGroupCollapsed || collapsed) && (
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon
                      const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                      const locked = !canAccess(item.pageKey)
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          title={collapsed ? (locked ? `${item.label} (Access Denied)` : item.label) : undefined}
                          className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-all ${
                            collapsed ? 'px-0 py-2 justify-center' : 'px-3 py-2'
                          } ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                              : locked
                              ? 'text-slate-600 hover:bg-slate-800/50 hover:text-slate-400'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <Icon size={16} className={`flex-shrink-0 ${locked && !isActive ? 'opacity-40' : ''}`} />
                          {!collapsed && (
                            <>
                              <span className={`flex-1 truncate ${locked ? 'opacity-40' : ''}`}>{item.label}</span>
                              {locked && !isActive && <Lock size={11} className="text-slate-600 flex-shrink-0" />}
                              {isActive && !locked && <ChevronRight size={13} />}
                            </>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="p-2 border-t border-slate-700">
          {!collapsed && companyName && (
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2 bg-slate-800 rounded-lg">
              <Building2 size={12} className="text-blue-400 flex-shrink-0" />
              <span className="text-blue-300 text-xs truncate flex-1">{companyName}</span>
            </div>
          )}

          {!collapsed && (
            <div className="flex items-center gap-3 px-2 py-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{displayName}</p>
                <p className="text-slate-400 text-xs truncate">{userEmail}</p>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="flex justify-center py-1 mb-1">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold" title={displayName}>
                {initials}
              </div>
            </div>
          )}

          {!collapsed && companiesCount > 1 && (
            <button
              onClick={() => { setShowSwitchModal(true); setSwitchError('') }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white text-sm font-medium transition-colors mb-0.5"
            >
              <RefreshCw size={15} />
              Switch Company
            </button>
          )}

          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`w-full flex items-center rounded-lg text-slate-400 hover:bg-red-900/30 hover:text-red-400 text-sm font-medium transition-colors ${
              collapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2.5'
            }`}
          >
            <LogOut size={18} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {showSwitchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Switch Company</h3>
                <p className="text-xs text-gray-400 mt-0.5">Select a company to switch to</p>
              </div>
              <button onClick={() => setShowSwitchModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {switchError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-2">{switchError}</div>
              )}
              {companies.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No companies available</p>
              ) : (
                companies.map((c) => {
                  const isCurrent = c.companyId?.toString() === currentCompanyId?.toString()
                  return (
                    <button
                      key={c.companyId}
                      onClick={() => handleSwitchCompany(c.companyId?.toString())}
                      disabled={switching || isCurrent}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                        isCurrent ? 'border-blue-500 bg-blue-50 cursor-default' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 size={16} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                          {c.role && <p className="text-xs text-gray-500 capitalize">{c.role.replace('_', ' ')}</p>}
                        </div>
                      </div>
                      {isCurrent && <CheckCircle size={16} className="text-blue-500 flex-shrink-0" />}
                    </button>
                  )
                })
              )}
              {switching && (
                <div className="flex items-center justify-center py-3">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                  <span className="ml-2 text-sm text-gray-500">Switching...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
