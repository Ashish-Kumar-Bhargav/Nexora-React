import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, FileCheck, X } from 'lucide-react'
import { format } from 'date-fns'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  issued: 'bg-blue-100 text-blue-700',
  applied: 'bg-green-100 text-green-700',
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
}

export default function CreditNotesPage() {
  const [creditNotes, setCreditNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [invoices, setInvoices] = useState([])

  const [form, setForm] = useState({
    invoiceId: '', amount: '', reason: '', notes: '',
  })

  const fetchCreditNotes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/credit-notes', { headers: { Authorization: `Bearer ${getToken()}` } })
      const json = await res.json()
      if (json.success) setCreditNotes(json.data.creditNotes)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCreditNotes() }, [fetchCreditNotes])

  async function openForm() {
    setForm({ invoiceId: '', amount: '', reason: '', notes: '' })
    setFormError('')
    const res = await fetch('/api/invoices?status=paid', { headers: { Authorization: `Bearer ${getToken()}` } })
    const json = await res.json()
    if (json.success) setInvoices(json.data.invoices.filter((i) => i.status === 'paid'))
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      const res = await fetch('/api/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      })
      const json = await res.json()
      if (json.success) { setShowForm(false); fetchCreditNotes() }
      else setFormError(json.message)
    } finally { setSubmitting(false) }
  }

  async function handleStatusChange(id, status) {
    const res = await fetch(`/api/credit-notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status }),
    })
    const json = await res.json()
    if (json.success) fetchCreditNotes()
    else alert(json.message)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this credit note?')) return
    const res = await fetch(`/api/credit-notes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const json = await res.json()
    if (json.success) fetchCreditNotes()
    else alert(json.message)
  }

  const selectedInvoice = invoices.find((i) => i._id === form.invoiceId)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Credit Notes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Issue refunds and adjustments against paid invoices</p>
        </div>
        <button onClick={openForm}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm">
          <Plus className="w-4 h-4" /> New Credit Note
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">Create Credit Note</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 mb-4 text-sm">{formError}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Paid Invoice *</label>
                <select required value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select invoice</option>
                  {invoices.map((i) => (
                    <option key={i._id} value={i._id}>{i.invoiceNumber} — {i.customerName} (₹{i.grandTotal.toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Credit Amount *</label>
                <input type="number" min="0.01" step="0.01" required
                  max={selectedInvoice?.grandTotal}
                  value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedInvoice && <p className="text-xs text-gray-400 mt-1">Max: ₹{selectedInvoice.grandTotal.toLocaleString()}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason *</label>
              <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Returned goods, billing error, discount"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
                {submitting ? 'Creating...' : 'Create Credit Note'}
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
        ) : creditNotes.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <FileCheck className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm">No credit notes yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">CN #</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Invoice</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Customer</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Reason</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Date</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {creditNotes.map((cn) => (
                <tr key={cn._id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-800">{cn.creditNoteNumber}</td>
                  <td className="px-5 py-3 text-gray-600">{cn.invoiceNumber}</td>
                  <td className="px-5 py-3 text-gray-700">{cn.customerName}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">₹{cn.amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{cn.reason}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[cn.status]}`}>{cn.status}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{format(new Date(cn.createdAt), 'dd MMM yyyy')}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {cn.status === 'draft' && (
                        <button onClick={() => handleStatusChange(cn._id, 'issued')}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 hover:bg-blue-50 rounded-lg transition">
                          Issue
                        </button>
                      )}
                      {cn.status === 'issued' && (
                        <button onClick={() => handleStatusChange(cn._id, 'applied')}
                          className="text-xs text-green-600 hover:text-green-700 font-medium px-2 py-1 hover:bg-green-50 rounded-lg transition">
                          Apply
                        </button>
                      )}
                      {cn.status !== 'applied' && (
                        <button onClick={() => handleDelete(cn._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
