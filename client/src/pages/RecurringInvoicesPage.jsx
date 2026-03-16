import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, RefreshCw, X, Play, Pause } from 'lucide-react'
import { format } from 'date-fns'

const emptyItem = { productId: '', productName: '', productCode: '', quantity: 1, unitPrice: 0, taxRate: 18, taxAmount: 0, total: 0 }
const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '' }

export default function RecurringInvoicesPage() {
  const [recurring, setRecurring] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [generating, setGenerating] = useState(null)

  const [form, setForm] = useState({
    name: '', customerId: '', frequency: 'monthly', dayOfMonth: '', startDate: '', endDate: '', notes: '',
    items: [{ ...emptyItem }],
  })

  const fetchRecurring = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/recurring-invoices', { headers: { Authorization: `Bearer ${getToken()}` } })
      const json = await res.json()
      if (json.success) setRecurring(json.data.recurringInvoices)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRecurring() }, [fetchRecurring])

  async function openForm() {
    setForm({ name: '', customerId: '', frequency: 'monthly', dayOfMonth: '', startDate: '', endDate: '', notes: '', items: [{ ...emptyItem }] })
    setFormError('')
    const [cRes, pRes] = await Promise.all([
      fetch('/api/customers', { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch('/api/products?status=approved', { headers: { Authorization: `Bearer ${getToken()}` } }),
    ])
    const [cJson, pJson] = await Promise.all([cRes.json(), pRes.json()])
    if (cJson.success) setCustomers(cJson.data.customers)
    if (pJson.success) setProducts(pJson.data.products)
    setShowForm(true)
  }

  function updateItem(i, field, value) {
    const items = [...form.items]
    const item = { ...items[i], [field]: value }
    if (field === 'productId') {
      const p = products.find((p) => p._id === value)
      if (p) { item.productName = p.name; item.productCode = p.code; item.unitPrice = p.basePrice; item.taxRate = p.taxRate }
    }
    const lineTotal = Number(item.quantity) * Number(item.unitPrice)
    item.taxAmount = (lineTotal * Number(item.taxRate)) / 100
    item.total = lineTotal + item.taxAmount
    items[i] = item
    setForm({ ...form, items })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    const customer = customers.find((c) => c._id === form.customerId)
    try {
      const res = await fetch('/api/recurring-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ...form,
          customerName: customer?.companyName,
          dayOfMonth: form.dayOfMonth ? Number(form.dayOfMonth) : undefined,
          endDate: form.endDate || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) { setShowForm(false); fetchRecurring() }
      else setFormError(json.message)
    } finally { setSubmitting(false) }
  }

  async function handleToggle(id, isActive) {
    const res = await fetch(`/api/recurring-invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ isActive: !isActive }),
    })
    const json = await res.json()
    if (json.success) fetchRecurring()
  }

  async function handleGenerate(id) {
    setGenerating(id)
    const res = await fetch('/api/recurring-invoices', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ id }),
    })
    const json = await res.json()
    if (json.success) { alert(`Invoice generated: ${json.data.invoice.invoiceNumber}`); fetchRecurring() }
    else alert(json.message)
    setGenerating(null)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this recurring invoice schedule?')) return
    const res = await fetch(`/api/recurring-invoices/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const json = await res.json()
    if (json.success) fetchRecurring()
    else alert(json.message)
  }

  const totals = form.items.reduce((acc, item) => ({ grand: acc.grand + item.total }), { grand: 0 })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Recurring Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Set up automatic invoice schedules</p>
        </div>
        <button onClick={openForm}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm">
          <Plus className="w-4 h-4" /> New Schedule
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">New Recurring Schedule</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 mb-4 text-sm">{formError}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Schedule Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Monthly Retainer"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
                <select required value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select customer</option>
                  {customers.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Frequency *</label>
                <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date *</label>
                <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Date (optional)</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {form.frequency !== 'weekly' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Day of Month (1-28)</label>
                  <input type="number" min="1" max="28" value={form.dayOfMonth}
                    onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
                <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { ...emptyItem }] })}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3 min-w-[160px]">Product</th>
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3 w-20">Qty</th>
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3 w-28">Unit Price</th>
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 w-28">Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="pr-3 py-2">
                          <select required value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">Select product</option>
                            {products.map((p) => <option key={p._id} value={p._id}>{p.code} - {p.name}</option>)}
                          </select>
                        </td>
                        <td className="pr-3 py-2">
                          <input type="number" min="1" required value={item.quantity}
                            onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="pr-3 py-2">
                          <input type="number" min="0" step="0.01" required value={item.unitPrice}
                            onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="py-2 text-gray-700 font-medium">₹{item.total.toFixed(2)}</td>
                        <td className="py-2">
                          {form.items.length > 1 && (
                            <button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}
                              className="text-gray-300 hover:text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right mt-2">
                <span className="text-sm font-bold text-gray-800">Grand Total: ₹{totals.grand.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
                {submitting ? 'Creating...' : 'Create Schedule'}
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
        ) : recurring.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <RefreshCw className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm">No recurring schedules yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Customer</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Frequency</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Next Run</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Generated</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recurring.map((r) => (
                <tr key={r._id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-800">{r.name}</td>
                  <td className="px-5 py-3 text-gray-600">{r.customerName}</td>
                  <td className="px-5 py-3 text-right font-semibold">₹{r.grandTotal.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-gray-600 capitalize">{r.frequency}</td>
                  <td className="px-5 py-3 text-gray-500">{format(new Date(r.nextRunDate), 'dd MMM yyyy')}</td>
                  <td className="px-5 py-3 text-center text-gray-500">{r.invoicesGenerated}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {r.isActive ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleGenerate(r._id)} disabled={!r.isActive || generating === r._id}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition disabled:opacity-30" title="Generate now">
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggle(r._id, r.isActive)}
                        className={`p-1.5 rounded-lg transition ${r.isActive ? 'text-yellow-500 hover:bg-yellow-50' : 'text-green-500 hover:bg-green-50'}`}
                        title={r.isActive ? 'Pause' : 'Resume'}>
                        {r.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleDelete(r._id)}
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
