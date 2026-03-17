import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search, ShieldOff, Building2, X, Check, Shield } from 'lucide-react'
import DataTable from '../components/DataTable'
import { useNavigate } from 'react-router-dom'
import { PAGE_GROUPS, ALL_PAGE_KEYS } from '../lib/pages.js'

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'user',
}

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-indigo-100 text-indigo-700',
  user: 'bg-gray-100 text-gray-600',
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
}

export default function UsersPage() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState('')

  // Company assignment modal state
  const [assignModal, setAssignModal] = useState({ open: false, user: null })
  const [allCompanies, setAllCompanies] = useState([])
  const [assignments, setAssignments] = useState([])
  const [newCompanyId, setNewCompanyId] = useState('')
  const [newRole, setNewRole] = useState('user')
  const [savingAssign, setSavingAssign] = useState(false)
  const [assignError, setAssignError] = useState('')
  const [assignSuccess, setAssignSuccess] = useState('')
  // Tracks which assignment rows have the page permissions panel expanded
  const [expandedPages, setExpandedPages] = useState(new Set())

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const u = JSON.parse(userStr)
        setCurrentUserRole(u.role || '')
        if (!['admin', 'super_admin'].includes(u.role)) {
          navigate('/dashboard', { replace: true })
        }
      } catch { /* ignore */ }
    }
    fetchUsers()
    fetchAllCompanies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchUsers(q = '') {
    setLoading(true)
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const json = await res.json()
      if (json.success) setUsers(json.data.users)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAllCompanies() {
    try {
      const res = await fetch('/api/companies/list?includePages=true', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const json = await res.json()
      if (json.success) setAllCompanies(json.data.companies)
    } catch { /* ignore */ }
  }

  function openEdit(user) {
    setEditId(user._id)
    setForm({ name: user.name, email: user.email, phone: user.phone || '', password: '', role: user.role })
    setShowForm(true)
  }

  function openAssignModal(user) {
    setAssignModal({ open: true, user })
    setAssignments(user.companies.map((c) => ({ ...c, pagePermissions: c.pagePermissions || [] })))
    setNewCompanyId('')
    setNewRole('user')
    setAssignError('')
    setAssignSuccess('')
    setExpandedPages(new Set())
  }

  function closeAssignModal() {
    setAssignModal({ open: false, user: null })
    setAssignments([])
    setAssignError('')
    setAssignSuccess('')
    setExpandedPages(new Set())
  }

  function togglePagesExpanded(companyId) {
    setExpandedPages((prev) => {
      const next = new Set(prev)
      if (next.has(companyId)) next.delete(companyId)
      else next.add(companyId)
      return next
    })
  }

  function toggleUserPage(companyId, pageKey) {
    setAssignments((prev) => prev.map((a) => {
      if (a.companyId !== companyId) return a
      const current = a.pagePermissions || []
      const updated = current.includes(pageKey)
        ? current.filter((k) => k !== pageKey)
        : [...current, pageKey]
      return { ...a, pagePermissions: updated }
    }))
  }

  function setAllUserPages(companyId, grantAll) {
    setAssignments((prev) => prev.map((a) =>
      a.companyId !== companyId ? a : { ...a, pagePermissions: grantAll ? [] : ['dashboard'] }
    ))
  }

  // Get the company's allowed pages (from allCompanies data)
  function getCompanyAllowedPages(companyId) {
    const c = allCompanies.find((c) => c._id === companyId)
    return c?.allowedPages?.length > 0 ? c.allowedPages : ALL_PAGE_KEYS
  }

  function addAssignment() {
    if (!newCompanyId) { setAssignError('Please select a company.'); return }
    if (assignments.some((a) => a.companyId === newCompanyId)) {
      setAssignError('This company is already assigned.'); return
    }
    setAssignments((prev) => [...prev, { companyId: newCompanyId, role: newRole, isActive: true }])
    setNewCompanyId('')
    setNewRole('user')
    setAssignError('')
  }

  function removeAssignment(companyId) {
    setAssignments((prev) => prev.filter((a) => a.companyId !== companyId))
  }

  function updateAssignmentRole(companyId, role) {
    setAssignments((prev) => prev.map((a) => a.companyId === companyId ? { ...a, role } : a))
  }

  function toggleAssignmentActive(companyId) {
    setAssignments((prev) => prev.map((a) => a.companyId === companyId ? { ...a, isActive: !a.isActive } : a))
  }

  async function saveAssignments() {
    if (!assignModal.user) return
    setSavingAssign(true)
    setAssignError('')
    setAssignSuccess('')
    try {
      const res = await fetch(`/api/users/${assignModal.user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ companies: assignments }),
      })
      const json = await res.json()
      if (json.success) {
        setAssignSuccess('Company assignments saved successfully.')
        fetchUsers(search)
        // Update the modal user reference so UI stays fresh
        setAssignModal((prev) => prev.user ? { ...prev, user: { ...prev.user, companies: assignments } } : prev)
      } else {
        setAssignError(json.message || 'Failed to save assignments.')
      }
    } catch {
      setAssignError('Network error. Please try again.')
    } finally {
      setSavingAssign(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const url = editId ? `/api/users/${editId}` : '/api/users'
      const method = editId ? 'PUT' : 'POST'
      const payload = editId
        ? { name: form.name, phone: form.phone, ...(form.password ? { password: form.password } : {}) }
        : form
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        setShowForm(false)
        setEditId(null)
        setForm(emptyForm)
        fetchUsers(search)
      } else {
        setError(json.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleActive(user) {
    const res = await fetch(`/api/users/${user._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ isActive: !user.isActive }),
    })
    const json = await res.json()
    if (json.success) fetchUsers(search)
    else alert(json.message)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this user permanently?')) return
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const json = await res.json()
    if (json.success) fetchUsers(search)
    else alert(json.message)
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone', render: (v) => v || '-' },
    {
      key: 'role',
      label: 'Role',
      render: (v) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[v] || 'bg-gray-100 text-gray-600'}`}>
          {v.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'companies',
      label: 'Companies',
      render: (v) => {
        const count = v?.length || 0
        return (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            {count} {count === 1 ? 'company' : 'companies'}
          </span>
        )
      },
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (v) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {v ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: '_id',
      label: 'Actions',
      render: (id, row) => {
        const user = row
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openEdit(user)}
              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
              title="Edit user"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => openAssignModal(user)}
              className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition"
              title="Manage company assignments"
            >
              <Building2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleToggleActive(user)}
              className="p-1.5 text-yellow-500 hover:bg-yellow-50 rounded-lg transition"
              title={user.isActive ? 'Deactivate' : 'Activate'}
            >
              <ShieldOff className="w-3.5 h-3.5" />
            </button>
            {currentUserRole === 'super_admin' && (
              <button
                onClick={() => handleDelete(id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Delete user"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )
      },
    },
  ]

  // Resolve company name from id
  function companyName(id) {
    const c = allCompanies.find((c) => c._id === id)
    return c ? `${c.name} (${c.code})` : id
  }

  // Companies not yet assigned
  const unassignedCompanies = allCompanies.filter(
    (c) => !assignments.some((a) => a.companyId === c._id)
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage user accounts and company access</p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); setError('') }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-sm shadow-blue-200 dark:shadow-blue-900/30"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">{editId ? 'Edit User' : 'New User'}</h2>
              <button onClick={() => { setShowForm(false); setEditId(null) }} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Name *</label>
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Email *</label>
                    <input required type="email" disabled={!!editId} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Phone</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">
                      {editId ? 'New Password (optional)' : 'Password *'}
                    </label>
                    <input required={!editId} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400" />
                  </div>
                  {!editId && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Global Role</label>
                      <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400">
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        {currentUserRole === 'super_admin' && <option value="super_admin">Super Admin</option>}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">The per-company role is set separately in Company Assignments.</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2 rounded-lg transition">
                    {submitting ? 'Saving...' : editId ? 'Update User' : 'Create User'}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditId(null) }}
                    className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2 rounded-lg transition">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Company Assignment Modal */}
      {assignModal.open && assignModal.user && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Manage Company Access</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {assignModal.user.name} — {assignModal.user.email}
                </p>
              </div>
              <button onClick={closeAssignModal} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-hide">
              {/* Feedback */}
              {assignError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{assignError}</div>
              )}
              {assignSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" /> {assignSuccess}
                </div>
              )}

              {/* Current Assignments */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Assigned Companies ({assignments.length})
                </h4>
                {assignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No companies assigned yet.</p>
                    <p className="text-xs mt-1">Use the form below to add companies.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((a) => {
                      const isPagesExpanded = expandedPages.has(a.companyId)
                      const companyPages = getCompanyAllowedPages(a.companyId)
                      const userPages = a.pagePermissions || []
                      const hasCustomPages = userPages.length > 0
                      return (
                        <div
                          key={a.companyId}
                          className={`rounded-xl border ${a.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}
                        >
                          {/* Assignment row */}
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${a.isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                                {companyName(a.companyId)}
                              </p>
                              {hasCustomPages && (
                                <p className="text-xs text-indigo-500">{userPages.length} page{userPages.length !== 1 ? 's' : ''} selected</p>
                              )}
                            </div>
                            {/* Role selector */}
                            <select
                              value={a.role}
                              onChange={(e) => updateAssignmentRole(a.companyId, e.target.value)}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="user">User</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                            {/* Active toggle */}
                            <button
                              onClick={() => toggleAssignmentActive(a.companyId)}
                              title={a.isActive ? 'Disable access' : 'Enable access'}
                              className={`px-2 py-1 rounded-lg text-xs font-medium transition ${a.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                              {a.isActive ? 'Active' : 'Paused'}
                            </button>
                            {/* Pages toggle */}
                            <button
                              onClick={() => togglePagesExpanded(a.companyId)}
                              title="Manage page permissions"
                              className={`p-1.5 rounded-lg text-xs transition flex-shrink-0 ${isPagesExpanded ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100 hover:text-indigo-500'}`}
                            >
                              <Shield className="w-3.5 h-3.5" />
                            </button>
                            {/* Remove */}
                            <button
                              onClick={() => removeAssignment(a.companyId)}
                              className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                              title="Remove assignment"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Page permissions panel */}
                          {isPagesExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Page Access</p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setAllUserPages(a.companyId, true)}
                                    className="text-xs text-blue-600 hover:underline font-medium"
                                  >
                                    All pages
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button
                                    type="button"
                                    onClick={() => setAllUserPages(a.companyId, false)}
                                    className="text-xs text-gray-400 hover:underline"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 mb-3">
                                {hasCustomPages
                                  ? `Custom: ${userPages.length} page${userPages.length !== 1 ? 's' : ''} selected`
                                  : 'Inherits all company-allowed pages'}
                              </p>
                              <div className="space-y-3">
                                {PAGE_GROUPS.map((group) => {
                                  const groupPages = group.pages.filter((p) => companyPages.includes(p.key) || p.alwaysAllowed)
                                  if (groupPages.length === 0) return null
                                  return (
                                    <div key={group.label}>
                                      <p className="text-xs text-gray-400 font-medium mb-1.5">{group.label}</p>
                                      <div className="flex flex-wrap gap-2">
                                        {groupPages.map((pg) => {
                                          const isChecked = pg.alwaysAllowed || (!hasCustomPages) || userPages.includes(pg.key)
                                          return (
                                            <label
                                              key={pg.key}
                                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition ${
                                                pg.alwaysAllowed
                                                  ? 'border-gray-100 bg-gray-50 opacity-50 cursor-default'
                                                  : isChecked
                                                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={pg.alwaysAllowed ? true : isChecked}
                                                disabled={pg.alwaysAllowed}
                                                onChange={() => {
                                                  if (pg.alwaysAllowed) return
                                                  // On first manual change, init userPages from companyPages
                                                  if (!hasCustomPages) {
                                                    const initPages = companyPages.filter((k) => k !== pg.key)
                                                    setAssignments((prev) => prev.map((aa) =>
                                                      aa.companyId !== a.companyId ? aa : { ...aa, pagePermissions: initPages }
                                                    ))
                                                  } else {
                                                    toggleUserPage(a.companyId, pg.key)
                                                  }
                                                }}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                                              />
                                              {pg.label}
                                            </label>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Add New Assignment */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Add Company</h4>
                {unassignedCompanies.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">All available companies are already assigned.</p>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <select
                      value={newCompanyId}
                      onChange={(e) => { setNewCompanyId(e.target.value); setAssignError('') }}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select company...</option>
                      {unassignedCompanies.map((c) => (
                        <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="button"
                      onClick={addAssignment}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                )}
              </div>

              {/* Role Legend */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-700 mb-2">Per-Company Role Permissions</p>
                <div className="space-y-1 text-xs text-blue-600">
                  <p><span className="font-semibold">Admin</span> — Full access: manage settings, users, all data</p>
                  <p><span className="font-semibold">Manager</span> — Create/edit/approve records; no user management</p>
                  <p><span className="font-semibold">User</span> — View and create basic records only</p>
                </div>
                <p className="text-xs text-blue-500 mt-2">
                  A user can have different roles in different companies. Set <strong>Active</strong> to temporarily pause access without removing the assignment.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
              <button
                onClick={saveAssignments}
                disabled={savingAssign}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2.5 rounded-xl transition"
              >
                {savingAssign ? 'Saving...' : 'Save Assignments'}
              </button>
              <button
                onClick={closeAssignModal}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); fetchUsers(e.target.value) }}
            placeholder="Search users..."
            className="pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
        <DataTable columns={columns} data={users} loading={loading} seamless />
      </div>
    </div>
  )
}
