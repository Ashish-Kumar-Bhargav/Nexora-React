import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Plus, Search, Pencil, Trash2, Building2, X, ChevronLeft, ChevronRight,
  Upload, Eye, EyeOff, CheckCircle, XCircle, ShieldCheck,
} from 'lucide-react'
import { PAGE_GROUPS, ALL_PAGE_KEYS } from '../lib/pages.js'

const emptyForm = {
  name: '', code: '', address: '', phone: '', email: '',
  gstNumber: '', logo: '', signature: '', isActive: true,
}

function ImageUpload({ label, value, onChange }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(false)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      alert('Image must be under 500KB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => onChange(ev.target?.result)
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium px-3 py-2 rounded-lg transition"
        >
          <Upload className="w-3.5 h-3.5" />
          {value ? 'Change' : 'Upload'}
        </button>
        {value && (
          <>
            <button
              type="button"
              onClick={() => setPreview(!preview)}
              className="text-blue-500 hover:text-blue-700 p-1"
              title="Preview"
            >
              {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => { onChange(''); if (inputRef.current) inputRef.current.value = '' }}
              className="text-red-400 hover:text-red-600 p-1"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-xs text-green-600 font-medium">Uploaded</span>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
      {value && preview && (
        <img src={value} alt={label} className="mt-2 max-h-20 border border-gray-200 rounded-lg object-contain bg-gray-50 p-1" />
      )}
    </div>
  )
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const LIMIT = 10
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Page permissions modal state
  const [pagesModal, setPagesModal] = useState({ open: false, company: null })
  const [selectedPages, setSelectedPages] = useState([])
  const [savingPages, setSavingPages] = useState(false)
  const [pagesError, setPagesError] = useState('')

  function getToken() { return localStorage.getItem('token') || '' }

  const fetchCompanies = useCallback(async (q = search, p = page, sf = statusFilter) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (q) params.set('search', q)
      if (sf) params.set('isActive', sf === 'active' ? 'true' : 'false')
      const res = await fetch(`/api/companies?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const json = await res.json()
      if (json.success) {
        setCompanies(json.data.companies)
        setTotal(json.data.total)
      }
    } finally { setLoading(false) }
  }, [search, page, statusFilter])

  useEffect(() => { fetchCompanies() }, [fetchCompanies])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  function openEdit(c) {
    setEditing(c)
    setForm({
      name: c.name, code: c.code, address: c.address || '', phone: c.phone || '',
      email: c.email || '', gstNumber: c.gstNumber || '',
      logo: c.logo || '', signature: c.signature || '', isActive: c.isActive,
    })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const url = editing ? `/api/companies/${editing._id}` : '/api/companies'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        setShowForm(false)
        fetchCompanies(search, page, statusFilter)
      } else {
        setError(json.message)
      }
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete company "${name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/companies/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const json = await res.json()
    if (json.success) fetchCompanies(search, page, statusFilter)
    else alert(json.message)
  }

  function openPagesModal(c) {
    setPagesModal({ open: true, company: c })
    // If company has no allowedPages (or empty), treat as "all pages" selected
    setSelectedPages(c.allowedPages?.length > 0 ? [...c.allowedPages] : [...ALL_PAGE_KEYS])
    setPagesError('')
  }

  function togglePage(key) {
    setSelectedPages((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  async function savePages() {
    if (!pagesModal.company) return
    setSavingPages(true)
    setPagesError('')
    try {
      // If all pages selected, save empty array (means "all allowed")
      const toSave = selectedPages.length === ALL_PAGE_KEYS.length ? [] : selectedPages
      const res = await fetch(`/api/companies/${pagesModal.company._id}/pages`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ allowedPages: toSave }),
      })
      const json = await res.json()
      if (json.success) {
        setPagesModal({ open: false, company: null })
        fetchCompanies(search, page, statusFilter)
      } else {
        setPagesError(json.message || 'Failed to save.')
      }
    } catch {
      setPagesError('Network error. Please try again.')
    } finally {
      setSavingPages(false)
    }
  }

  async function toggleActive(c) {
    const res = await fetch(`/api/companies/${c._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ isActive: !c.isActive }),
    })
    const json = await res.json()
    if (json.success) fetchCompanies(search, page, statusFilter)
  }

  const totalPages = Math.ceil(total / LIMIT)

  function handleSearch(q) {
    setSearch(q); setPage(1); fetchCompanies(q, 1, statusFilter)
  }
  function handleStatusFilter(sf) {
    setStatusFilter(sf); setPage(1); fetchCompanies(search, 1, sf)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Companies</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} total companies</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name or code..."
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : companies.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No companies found</p>
            <button onClick={openAdd} className="mt-3 text-blue-600 text-sm hover:underline">Add your first company</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Company', 'Code', 'GST Number', 'Contact', 'Logo', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {c.logo ? (
                            <img src={c.logo} alt={c.name} className="w-8 h-8 rounded-lg object-contain border border-gray-100 bg-gray-50" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Building2 className="w-4 h-4 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-800">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.address || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-gray-600">{c.code}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{c.gstNumber || '—'}</td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-700">{c.phone || '—'}</p>
                        <p className="text-xs text-gray-400">{c.email || '—'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {c.logo ? (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Logo
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> No logo
                            </span>
                          )}
                          {c.signature ? (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1 ml-2">
                              <CheckCircle className="w-3 h-3" /> Sign
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 flex items-center gap-1 ml-2">
                              <XCircle className="w-3 h-3" /> No sign
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`text-xs font-medium px-2 py-1 rounded-full cursor-pointer transition ${
                            c.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {c.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openPagesModal(c)}
                            className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Manage page access"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c._id, c.name)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => { setPage(page - 1); fetchCompanies(search, page - 1, statusFilter) }}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-600 px-2">Page {page} of {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => { setPage(page + 1); fetchCompanies(search, page + 1, statusFilter) }}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Page Permissions Modal */}
      {pagesModal.open && pagesModal.company && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  Page Access — {pagesModal.company.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Control which pages this company's users can access
                </p>
              </div>
              <button onClick={() => setPagesModal({ open: false, company: null })} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-hide space-y-5">
              {pagesError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 text-sm">{pagesError}</div>
              )}

              {/* Select All / Deselect All */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-medium">
                  {selectedPages.length} of {ALL_PAGE_KEYS.length} pages selected
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPages([...ALL_PAGE_KEYS])}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Select all
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPages(['dashboard'])}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              {/* Page groups */}
              {PAGE_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{group.label}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.pages.map((pg) => {
                      const checked = selectedPages.includes(pg.key)
                      const always = pg.alwaysAllowed
                      return (
                        <label
                          key={pg.key}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                            always
                              ? 'border-gray-100 bg-gray-50 cursor-default opacity-60'
                              : checked
                              ? 'border-indigo-200 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={always ? true : checked}
                            disabled={always}
                            onChange={() => !always && togglePage(pg.key)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className={`text-sm font-medium ${checked || always ? 'text-gray-800' : 'text-gray-500'}`}>
                            {pg.label}
                          </span>
                          {always && <span className="text-xs text-gray-400 ml-auto">(always)</span>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={savePages}
                disabled={savingPages}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium py-2.5 rounded-xl transition"
              >
                {savingPages ? 'Saving...' : 'Save Page Access'}
              </button>
              <button
                onClick={() => setPagesModal({ open: false, company: null })}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 size={16} className="text-blue-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-800">
                  {editing ? 'Edit Company' : 'Add New Company'}
                </h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-5 mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Company Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Nexora Tech Pvt Ltd"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {!editing && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Company Code *</label>
                  <input
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. NEXORA"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  />
                  <p className="text-xs text-gray-400 mt-1">Unique identifier, used as DB name. Cannot be changed.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GST Number</label>
                <input
                  value={form.gstNumber}
                  onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                  placeholder="e.g. 29AAACN1234A1Z5"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91-80-4123-4567"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="info@company.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Full company address"
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Logo Upload */}
              <div>
                <ImageUpload
                  label="Company Logo (max 500KB)"
                  value={form.logo}
                  onChange={(v) => setForm({ ...form, logo: v })}
                />
              </div>

              {/* Signature Upload */}
              <div>
                <ImageUpload
                  label="Authorized Signature (max 500KB)"
                  value={form.signature}
                  onChange={(v) => setForm({ ...form, signature: v })}
                />
              </div>

              {editing && (
                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    id="isActive"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-600">Company is active</label>
                </div>
              )}

              <div className="sm:col-span-2 flex gap-3 pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
                >
                  {submitting ? 'Saving...' : editing ? 'Update Company' : 'Create Company'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-5 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
