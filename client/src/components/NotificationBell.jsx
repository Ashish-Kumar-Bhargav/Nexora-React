import { useState, useEffect, useRef } from 'react'
import { Bell, AlertTriangle, CheckCircle, Info, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

const typeStyles = {
  warning: { bg: 'bg-yellow-50', icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />, dot: 'bg-yellow-400' },
  info: { bg: 'bg-blue-50', icon: <Info className="w-4 h-4 text-blue-500" />, dot: 'bg-blue-400' },
  danger: { bg: 'bg-red-50', icon: <AlertTriangle className="w-4 h-4 text-red-500" />, dot: 'bg-red-400' },
  success: { bg: 'bg-green-50', icon: <CheckCircle className="w-4 h-4 text-green-500" />, dot: 'bg-green-400' },
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setNotifications(data.data.notifications)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const count = notifications.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
      >
        <Bell size={20} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-slate-900/70 border border-gray-100 dark:border-slate-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <h3 className="font-semibold text-gray-800 dark:text-slate-100 text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {count > 0 && <span className="bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">{count}</span>}
              <button onClick={() => setOpen(false)} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"><X size={14} /></button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />)}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-slate-500">No notifications</p>
              </div>
            ) : (
              <div>
                {notifications.map((n) => {
                  const style = typeStyles[n.type]
                  return (
                    <Link
                      key={n.id}
                      to={n.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-50 dark:border-slate-700 last:border-0 transition-colors ${style.bg}`}
                    >
                      <div className="mt-0.5 flex-shrink-0">{style.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-slate-200">{n.title}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 truncate">{n.message}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
            <button onClick={fetchNotifications} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium w-full text-center">
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
