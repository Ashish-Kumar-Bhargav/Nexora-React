import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, X, Settings } from 'lucide-react'

const MODULES = [
  { value: 'invoices', label: 'Invoices' },
  { value: 'quotations', label: 'Quotations' },
  { value: 'products', label: 'Products' },
  { value: 'customers', label: 'Customers' },
]

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'boolean', label: 'Yes / No' },
]

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
}

export default function CustomFieldsPage() {
  const [activeModule, setActiveModule] = useState('invoices')
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [optionInput, setOptionInput] = useState('')

  const [form, setForm] = useState({
    fieldLabel: '',
    fieldType: 'text',
    options: [],
    required: false,
    showInPdf: true,
    sortOrder: 0,
  })

  const fetchFields = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/custom-fields?module=${activeModule}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const json = await res.json()
      if (json.success) setFields(json.data.fields)
    } finally {
      setLoading(false)
    }
  }, [activeModule])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  function openForm() {
    setForm({ fieldLabel: '', fieldType: 'text', options: [], required: false, showInPdf: true, sortOrder: fields.length })
    setOptionInput('')
    setError('')
    setShowForm(true)
  }

  function addOption() {
    const opt = optionInput.trim()
    if (opt && !form.options.includes(opt)) {
      setForm({ ...form, options: [...form.options, opt] })
    }
    setOptionInput('')
  }

  function removeOption(opt) {
    setForm({ ...form, options: form.options.filter((o) => o !== opt) })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ module: activeModule, ...form }),
      })
      const json = await res.json()
      if (json.success) {
        setShowForm(false)
        fetchFields()
      } else {
        setError(json.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this custom field? Existing data will not be deleted.')) return
    const res = await fetch(`/api/custom-fields/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const json = await res.json()
    if (json.success) fetchFields()
    else alert(json.message)
  }

  async function handleTogglePdf(field) {
    const res = await fetch(`/api/custom-fields/${field._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ showInPdf: !field.showInPdf }),
    })
    const json = await res.json()
    if (json.success) fetchFields()
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Custom Fields</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define additional fields for your modules</p>
        </div>
        <button
          onClick={openForm}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>

      {/* Module Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex gap-1 px-4 pt-4">
          {MODULES.map((m) => (
            <button
              key={m.value}
              onClick={() => setActiveModule(m.value)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeModule === m.value
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="border-t border-gray-100" />
      </div>

      {/* Add Field Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            New Field for {MODULES.find((m) => m.value === activeModule)?.label}
          </h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Field Label *</label>
                <input
                  required value={form.fieldLabel}
                  onChange={(e) => setForm({ ...form, fieldLabel: e.target.value })}
                  placeholder="e.g. GST Number"
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
                />
                {form.fieldLabel && (
                  <p className="text-xs text-gray-400 mt-1">
                    Key: <code className="bg-gray-100 px-1 rounded">{form.fieldLabel.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}</code>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Field Type</label>
                <select
                  value={form.fieldType}
                  onChange={(e) => setForm({ ...form, fieldType: e.target.value, options: [] })}
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Sort Order</label>
                <input
                  type="number" value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
                />
              </div>
            </div>

            {/* Dropdown options */}
            {form.fieldType === 'select' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2">Dropdown Options</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                    placeholder="Type an option and press Enter"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="button" onClick={addOption}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.options.map((opt) => (
                    <span key={opt} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full">
                      {opt}
                      <button type="button" onClick={() => removeOption(opt)} className="hover:text-red-500 ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {form.options.length === 0 && (
                    <span className="text-xs text-gray-400">No options added yet</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-6 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={form.required}
                  onChange={(e) => setForm({ ...form, required: e.target.checked })}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700">Required field</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={form.showInPdf}
                  onChange={(e) => setForm({ ...form, showInPdf: e.target.checked })}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700">Show in PDF</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
                {submitting ? 'Saving...' : 'Create Field'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-5 py-2 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Fields List */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">
            {MODULES.find((m) => m.value === activeModule)?.label} Fields
          </h2>
          <span className="text-xs text-gray-400">{fields.length} field{fields.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Settings className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm">No custom fields defined for this module yet.</p>
            <button onClick={openForm} className="mt-3 text-blue-600 text-sm hover:underline">
              Add your first field
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Label</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Key</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Type</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Required</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Show in PDF</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field._id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-800">{field.fieldLabel}</td>
                  <td className="px-5 py-3">
                    <code className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{field.fieldKey}</code>
                  </td>
                  <td className="px-5 py-3 text-gray-600 capitalize">
                    {FIELD_TYPES.find((t) => t.value === field.fieldType)?.label || field.fieldType}
                    {field.fieldType === 'select' && field.options && field.options.length > 0 && (
                      <span className="text-xs text-gray-400 ml-1">({field.options.length} options)</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {field.required ? (
                      <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Yes</span>
                    ) : (
                      <span className="text-xs text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleTogglePdf(field)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full transition ${
                        field.showInPdf
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {field.showInPdf ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleDelete(field._id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Remove field"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
