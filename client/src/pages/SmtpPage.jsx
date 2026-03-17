import { useEffect, useState } from 'react'
import { Mail, Save, Eye, EyeOff, Wifi } from 'lucide-react'

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
}

export default function SmtpPage() {
  const [form, setForm] = useState({
    smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '',
    smtpFrom: '', smtpFromName: '',
    lowStockThreshold: '10',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [msg, setMsg] = useState(null)
  const [testMsg, setTestMsg] = useState(null)

  useEffect(() => {
    fetch('/api/companies/me', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const c = j.data.company
          setForm({
            smtpHost: c.smtpHost || '',
            smtpPort: String(c.smtpPort || '587'),
            smtpUser: c.smtpUser || '',
            smtpPass: c.smtpPass || '',
            smtpFrom: c.smtpFrom || '',
            smtpFromName: c.smtpFromName || '',
            lowStockThreshold: String(c.lowStockThreshold ?? 10),
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/companies/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          currency: 'INR',
          smtpHost: form.smtpHost,
          smtpPort: Number(form.smtpPort),
          smtpUser: form.smtpUser,
          smtpPass: form.smtpPass,
          smtpFrom: form.smtpFrom,
          smtpFromName: form.smtpFromName,
          lowStockThreshold: Number(form.lowStockThreshold),
        }),
      })
      const json = await res.json()
      if (json.success) setMsg({ type: 'success', text: 'Settings saved successfully.' })
      else setMsg({ type: 'error', text: json.message })
    } catch {
      setMsg({ type: 'error', text: 'Network error.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!testEmail) { setTestMsg({ type: 'error', text: 'Enter a test recipient email.' }); return }
    setTesting(true)
    setTestMsg(null)
    try {
      const res = await fetch('/api/emails/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ to: testEmail }),
      })
      const json = await res.json()
      if (json.success) setTestMsg({ type: 'success', text: 'Test email sent successfully!' })
      else setTestMsg({ type: 'error', text: json.message })
    } catch {
      setTestMsg({ type: 'error', text: 'Failed to send test email.' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Company Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure email, currency, and alert thresholds</p>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">General Settings</h2>
          <p className="text-xs text-gray-400 mb-4">Currency is fixed to Indian Rupee (₹ INR)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Currency</label>
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 flex items-center gap-2">
                <span className="font-semibold text-gray-700">₹</span> Indian Rupee (INR)
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Low Stock Threshold</label>
              <input
                type="number" min="1" max="1000"
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
              />
              <p className="text-xs text-gray-400 mt-1">Alert when stock falls below this quantity</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800">Email / SMTP Configuration</h2>
              <p className="text-xs text-gray-400">Used for sending invoices, quotations and notifications</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">SMTP Host</label>
              <input
                value={form.smtpHost} placeholder="smtp.gmail.com"
                onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">SMTP Port</label>
              <input
                type="number" value={form.smtpPort} placeholder="587"
                onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Username / Email</label>
              <input
                type="email" value={form.smtpUser} placeholder="noreply@yourcompany.com"
                onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Password / App Key</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} value={form.smtpPass} placeholder="••••••••"
                  onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">From Email</label>
              <input
                type="email" value={form.smtpFrom} placeholder="invoices@yourcompany.com"
                onChange={(e) => setForm({ ...form, smtpFrom: e.target.value })}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">From Name</label>
              <input
                value={form.smtpFromName} placeholder="Your Company Name"
                onChange={(e) => setForm({ ...form, smtpFromName: e.target.value })}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition shadow-sm">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
            <Wifi className="w-4 h-4 text-green-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-800">Test SMTP Connection</h2>
        </div>
        {testMsg && (
          <div className={`mb-3 px-4 py-2.5 rounded-lg text-sm ${testMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {testMsg.text}
          </div>
        )}
        <div className="flex gap-3">
          <input
            type="email" value={testEmail} placeholder="recipient@test.com"
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="button" onClick={handleTest} disabled={testing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            {testing ? 'Sending...' : 'Send Test'}
          </button>
        </div>
      </div>
    </div>
  )
}
