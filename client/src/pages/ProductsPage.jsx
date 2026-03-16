import { useEffect, useState, useCallback } from 'react'
import { Plus, Check, X, Trash2, Search, Pencil, ChevronLeft, ChevronRight, Package } from 'lucide-react'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const emptyForm = { name: '', category: '', description: '', unit: 'pcs', basePrice: '', taxRate: '18', requiresApproval: false, customFields: {} }

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const LIMIT = 10
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [userRole, setUserRole] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])
  const [units, setUnits] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [addingUnit, setAddingUnit] = useState(false)
  const [customFieldDefs, setCustomFieldDefs] = useState([])

  function getToken() { return localStorage.getItem('token') || '' }

  const fetchCategoriesAndUnits = async () => {
    const res = await fetch('/api/products/categories', { headers: { Authorization: `Bearer ${getToken()}` } })
    const json = await res.json()
    if (json.success) {
      setCategories(json.data.categories)
      setUnits(json.data.units)
    }
  }

  const fetchProducts = useCallback(async (q = '', p = 1) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&page=${p}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const json = await res.json()
      if (json.success) {
        setProducts(json.data.products)
        setTotal(json.data.total || 0)
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) { try { setUserRole(JSON.parse(userStr).role || '') } catch {} }
    fetchProducts()
    fetchCategoriesAndUnits()
  }, [fetchProducts])

  const fetchCustomFieldDefs = async () => {
    const res = await fetch('/api/custom-fields?module=products', { headers: { Authorization: `Bearer ${getToken()}` } })
    const json = await res.json()
    if (json.success) setCustomFieldDefs(json.data.fields)
  }

  const openAdd = () => {
    setEditingProduct(null)
    setForm(emptyForm)
    setError('')
    setShowForm(true)
    fetchCustomFieldDefs()
  }

  const openEdit = (p) => {
    setEditingProduct(p)
    setForm({ name: p.name, category: p.category, description: p.description || '', unit: p.unit, basePrice: String(p.basePrice), taxRate: String(p.taxRate), requiresApproval: p.requiresApproval, customFields: p.customFields || {} })
    setError('')
    setShowForm(true)
    fetchCustomFieldDefs()
  }

  function setCustomField(key, value) {
    setForm((prev) => ({ ...prev, customFields: { ...prev.customFields, [key]: value } }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, basePrice: Number(form.basePrice), taxRate: Number(form.taxRate) }),
      })
      const json = await res.json()
      if (json.success) {
        setShowForm(false)
        setForm(emptyForm)
        setEditingProduct(null)
        fetchProducts(search, page)
      } else { setError(json.message) }
    } finally { setSubmitting(false) }
  }

  async function handleApprove(id, action) {
    const res = await fetch(`/api/products/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    if (json.success) fetchProducts(search, page)
    else alert(json.message)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this product? This action cannot be undone.')) return
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } })
    const json = await res.json()
    if (json.success) fetchProducts(search, page)
    else alert(json.message)
  }

  async function addCategory() {
    if (!newCategory.trim()) return
    const res = await fetch('/api/products/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ type: 'category', value: newCategory.trim() }),
    })
    const json = await res.json()
    if (json.success) {
      await fetchCategoriesAndUnits()
      setForm({ ...form, category: newCategory.trim() })
      setNewCategory('')
      setAddingCategory(false)
    }
  }

  async function addUnit() {
    if (!newUnit.trim()) return
    const res = await fetch('/api/products/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ type: 'unit', value: newUnit.trim() }),
    })
    const json = await res.json()
    if (json.success) {
      await fetchCategoriesAndUnits()
      setForm({ ...form, unit: newUnit.trim() })
      setNewUnit('')
      setAddingUnit(false)
    }
  }

  const canApprove = ['admin', 'super_admin', 'manager'].includes(userRole)
  const canDelete = ['admin', 'super_admin'].includes(userRole)
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} total products</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Package size={16} className="text-blue-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mx-5 mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wireless Mouse" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Category *</label>
                  <button type="button" onClick={() => setAddingCategory(!addingCategory)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                    <Plus size={10} /> New
                  </button>
                </div>
                {addingCategory ? (
                  <div className="flex gap-2">
                    <input autoFocus value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category name" className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="button" onClick={addCategory} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs">Add</button>
                    <button type="button" onClick={() => setAddingCategory(false)} className="border border-gray-200 px-2 py-2 rounded-lg text-xs"><X size={12} /></button>
                  </div>
                ) : (
                  <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select category</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Unit</label>
                  <button type="button" onClick={() => setAddingUnit(!addingUnit)} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                    <Plus size={10} /> New
                  </button>
                </div>
                {addingUnit ? (
                  <div className="flex gap-2">
                    <input autoFocus value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="Unit name" className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="button" onClick={addUnit} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs">Add</button>
                    <button type="button" onClick={() => setAddingUnit(false)} className="border border-gray-200 px-2 py-2 rounded-lg text-xs"><X size={12} /></button>
                  </div>
                ) : (
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {units.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Base Price (&#8377;)</label>
                <input type="number" min="0" step="0.01" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} placeholder="0.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate (%)</label>
                <input type="number" min="0" max="100" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief product description" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input id="reqApproval" type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })} className="rounded border-gray-300 text-blue-600" />
                <label htmlFor="reqApproval" className="text-sm text-gray-600">Requires approval before activation</label>
              </div>
              {customFieldDefs.length > 0 && (
                <>
                  <div className="sm:col-span-2 border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Additional Fields</p>
                  </div>
                  {customFieldDefs.map((field) => (
                    <div key={field.fieldKey}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{field.fieldLabel}{field.required && ' *'}</label>
                      {field.fieldType === 'select' ? (
                        <select
                          required={field.required}
                          value={String(form.customFields[field.fieldKey] || '')}
                          onChange={(e) => setCustomField(field.fieldKey, e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : field.fieldType === 'boolean' ? (
                        <select
                          value={String(form.customFields[field.fieldKey] ?? '')}
                          onChange={(e) => setCustomField(field.fieldKey, e.target.value === 'true')}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : (
                        <input
                          type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                          required={field.required}
                          value={String(form.customFields[field.fieldKey] || '')}
                          onChange={(e) => setCustomField(field.fieldKey, field.fieldType === 'number' ? Number(e.target.value) : e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  ))}
                </>
              )}
              <div className="sm:col-span-2 flex gap-3 pt-2 border-t border-gray-100">
                <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
                  {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-5 py-2 rounded-lg transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); fetchProducts(e.target.value, 1) }}
            placeholder="Search products..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No products found</p>
            <button onClick={openAdd} className="mt-3 text-blue-600 text-sm hover:underline">Add your first product</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Code', 'Name', 'Category', 'Unit', 'Base Price', 'Tax', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-xs text-gray-500 font-mono">{p.code}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-800">{p.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{p.category}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{p.unit}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 font-medium">&#8377;{p.basePrice.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{p.taxRate}%</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[p.status] || ''}`}>{p.status}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                          {canApprove && p.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(p._id, 'approve')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Approve"><Check className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleApprove(p._id, 'reject')} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Reject"><X className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(p._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Showing {((page - 1) * LIMIT) + 1}&ndash;{Math.min(page * LIMIT, total)} of {total}</p>
                <div className="flex items-center gap-2">
                  <button disabled={page === 1} onClick={() => { setPage(page - 1); fetchProducts(search, page - 1) }} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-xs text-gray-600 px-2">Page {page} of {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => { setPage(page + 1); fetchProducts(search, page + 1) }} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
