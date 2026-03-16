import { useEffect, useState, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Truck } from 'lucide-react'

const emptyForm = {
  name: '', contactPerson: '', phone: '', email: '', address: '', gstNumber: '',
  bankAccount: '', bankIfsc: '', paymentTerms: '',
}

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/suppliers', { headers: { Authorization: `Bearer ${getToken()}` } })
      const json = await res.json()
      if (json.success) setSuppliers(json.data.suppliers)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  function openAdd() { setEditing(null); setForm(emptyForm); setError(''); setShowForm(true) }
  function openEdit(s) {
    setEditing(s)
    setForm({ name: s.name, contactPerson: s.contactPerson || '', phone: s.phone || '', email: s.email || '',
      address: s.address || '', gstNumber: s.gstNumber || '', bankAccount: '', bankIfsc: '', paymentTerms: s.paymentTerms || '' })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const url = editing ? `/api/suppliers/${editing._id}` : '/api/suppliers'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) { setShowForm(false); fetchSuppliers() }
      else setError(json.message)
    } finally { setSubmitting(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this supplier?')) return
    const res = await fetch(`/api/suppliers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const json = await res.json()
    if (json.success) fetchSuppliers()
    else alert(json.message)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your vendors and suppliers</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">{editing ? 'Edit Supplier' : 'New Supplier'}</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Company / Supplier Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {[
              { label: 'Contact Person', key: 'contactPerson' },
              { label: 'Phone', key: 'phone' },
              { label: 'Email', key: 'email', type: 'email' },
              { label: 'GST Number', key: 'gstNumber' },
              { label: 'Bank Account', key: 'bankAccount' },
              { label: 'Bank IFSC', key: 'bankIfsc' },
              { label: 'Payment Terms', key: 'paymentTerms' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type={type || 'text'} value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
                {submitting ? 'Saving...' : editing ? 'Update' : 'Create Supplier'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-5 py-2 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Truck className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm">No suppliers yet. Add your first supplier.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Email</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">GST</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s._id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-5 py-3 text-gray-600">{s.contactPerson || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{s.phone || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{s.email || '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{s.gstNumber || '—'}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(s)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(s._id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
