import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react'

const MODULE_OPTIONS = ['', 'invoices', 'quotations', 'customers', 'products', 'inventory', 'users', 'credit-notes', 'purchase-orders', 'recurring-invoices']
const ACTION_OPTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE']

const ACTION_STYLES = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  APPROVE: 'bg-purple-100 text-purple-700',
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const LIMIT = 50

  const [module, setModule] = useState('')
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (module) params.set('module', module)
      if (action) params.set('action', action)
      if (search) params.set('search', search)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)

      const res = await fetch(`/api/activity-logs?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const json = await res.json()
      if (json.success) {
        setLogs(json.data.logs)
        setTotal(json.data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [module, action, search, startDate, endDate])

  useEffect(() => { setPage(1); fetchLogs(1) }, [fetchLogs])

  const totalPages = Math.ceil(total / LIMIT)

  function handlePageChange(p) {
    setPage(p)
    fetchLogs(p)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-50">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all user actions in your company</p>
        </div>
        <span className="text-sm text-gray-400">{total.toLocaleString()} entries</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <input
            type="text" placeholder="Search by user..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select value={module} onChange={(e) => setModule(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {MODULE_OPTIONS.map((m) => <option key={m} value={m}>{m || 'All Modules'}</option>)}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a || 'All Actions'}</option>)}
          </select>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <Activity className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm">No activity logs found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-300">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-300">Action</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-300">Module</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-300">Details</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-300">Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-t border-gray-100 dark:border-slate-700 hover:bg-blue-50/30 dark:hover:bg-slate-700/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800 dark:text-slate-100">{log.userName || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_STYLES[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-slate-300 capitalize">{log.module}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs max-w-xs truncate">
                    {log.details ? Object.entries(log.details).map(([k, v]) => `${k}: ${String(v)}`).join(', ') : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                    {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-1">
              <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
