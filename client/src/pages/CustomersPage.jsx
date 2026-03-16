import { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import { Plus, Pencil, Trash2, X, Search, Users } from 'lucide-react'

const emptyForm = { companyName: '', contactPerson: '', phone: '', email: '', address: '', gstNumber: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  function getToken() { return localStorage.getItem('token') || '' }

  const fetchCustomers = async (q = '') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (data.success) setCustomers(data.data.customers || data.data)
      else setError(data.message)
    } catch { setError('Failed to load customers') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCustomers() }, [])

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({ companyName: c.companyName, contactPerson: c.contactPerson || '', phone: c.phone || '', email: c.email || '', address: c.address || '', gstNumber: c.gstNumber || '' })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.companyName.trim()) { setError('Company name is required'); return }
    setSaving(true)
    setError('')
    try {
      const url = editing ? `/api/customers/${editing._id}` : '/api/customers'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) { setShowModal(false); fetchCustomers(search) }
      else setError(data.message || 'Failed to save')
    } catch { setError('Network error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return
    const res = await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const data = await res.json()
    if (data.success) fetchCustomers(search)
    else alert(data.message)
  }

  const columns = [
    { key: 'companyName', label: 'Company Name' },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'gstNumber', label: 'GST Number', render: (v) => v || '—' },
    {
      key: 'isActive', label: 'Status',
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${v ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {v ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: '_id', label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={14} /></button>
          <button onClick={() => handleDelete(row._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ]

  const fields = [
    { key: 'companyName', label: 'Company Name *', placeholder: 'ABC Pvt Ltd' },
    { key: 'contactPerson', label: 'Contact Person', placeholder: 'John Doe' },
    { key: 'phone', label: 'Phone', placeholder: '+91 9876543210' },
    { key: 'email', label: 'Email', placeholder: 'contact@abc.com' },
    { key: 'address', label: 'Address', placeholder: '123 Street, City' },
    { key: 'gstNumber', label: 'GST Number', placeholder: '22AAAAA0000A1Z5' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{customers.length} total customers</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); fetchCustomers(e.target.value) }}
              placeholder="Search customers..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
            {customers.length} records
          </span>
        </div>
        <DataTable columns={columns} data={customers} loading={loading} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users size={16} className="text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">{editing ? 'Edit Customer' : 'Add Customer'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1"><X size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {error && <div className="col-span-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}
              {fields.map(({ key, label, placeholder }) => (
                <div key={key} className={key === 'address' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none hover:border-gray-300 transition-colors"
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">
                {saving ? 'Saving...' : editing ? 'Update Customer' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
