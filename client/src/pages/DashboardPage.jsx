import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Warehouse, Clock, Users, FileText, Receipt, TrendingUp, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { format } from 'date-fns'

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100' },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', border: 'border-yellow-100' },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  border: 'border-green-100' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    border: 'border-red-100' },
}

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1']

function StatCard({ title, value, icon, color, href, subtitle }) {
  const navigate = useNavigate()
  const c = colorMap[color] || colorMap.blue
  return (
    <div
      onClick={() => navigate(href)}
      className={`bg-white rounded-xl border ${c.border} p-5 flex items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.icon} group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value.toLocaleString()}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="text-gray-300 group-hover:translate-x-1 transition-all">&#8594;</div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } })
        const json = await res.json()
        if (json.success) setData(json.data)
        else setError(json.message)
      } catch { setError('Failed to load dashboard') }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl p-5 h-24 animate-pulse border border-gray-100" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      </div>
    )
  }

  const productStatusData = [
    { name: 'Approved', value: data?.approvedProducts || 0 },
    { name: 'Pending', value: data?.pendingApprovals || 0 },
    { name: 'Other', value: Math.max(0, (data?.totalProducts || 0) - (data?.approvedProducts || 0) - (data?.pendingApprovals || 0)) },
  ].filter(d => d.value > 0)

  const barData = [
    { name: 'Products', total: data?.totalProducts || 0 },
    { name: 'Customers', total: data?.totalCustomers || 0 },
    { name: 'Quotations', total: data?.totalQuotations || 0 },
    { name: 'Invoices', total: data?.totalInvoices || 0 },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Overview of your business</p>
        </div>
        <p className="text-sm text-gray-400">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Products" value={data?.totalProducts ?? 0} icon={<Package className="w-5 h-5" />} color="blue" href="/products" subtitle={`${data?.approvedProducts ?? 0} approved`} />
        <StatCard title="Inventory Items" value={data?.totalInventoryItems ?? 0} icon={<Warehouse className="w-5 h-5" />} color="indigo" href="/inventory" />
        <StatCard title="Pending Approvals" value={data?.pendingApprovals ?? 0} icon={<Clock className="w-5 h-5" />} color="yellow" href="/products" subtitle="Requires attention" />
        <StatCard title="Total Customers" value={data?.totalCustomers ?? 0} icon={<Users className="w-5 h-5" />} color="green" href="/customers" />
        <StatCard title="Sales Quotations" value={data?.totalQuotations ?? 0} icon={<FileText className="w-5 h-5" />} color="purple" href="/quotations" subtitle={`${data?.quotationsByStatus?.approved || 0} approved`} />
        <StatCard title="Sales Invoices" value={data?.totalInvoices ?? 0} icon={<Receipt className="w-5 h-5" />} color="red" href="/invoices" subtitle={`${data?.invoicesByStatus?.paid || 0} paid`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Overview
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" /> Product Status
          </h2>
          {productStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={productStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {productStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Inventory</h2>
          {data?.recentInventory?.length ? (
            <div className="space-y-3">
              {data.recentInventory.map((item) => (
                <div key={item._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{item.productName}</p>
                    <p className="text-xs text-gray-400">{format(new Date(item.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.type === 'stock_in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.type === 'stock_in' ? '+' : '-'}{item.quantity}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">Stock: {item.currentStock}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">No inventory records yet</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h2>
          {data?.recentActivity?.length ? (
            <div className="space-y-3">
              {data.recentActivity.map((log) => (
                <div key={log._id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-xs font-bold">{log.action.charAt(0)}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{log.userName}</span>{' '}
                      <span className="text-gray-400">{log.action.toLowerCase()}d in</span>{' '}
                      <span className="font-medium capitalize">{log.module}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{format(new Date(log.createdAt), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-8">No activity logs yet</p>}
        </div>
      </div>
    </div>
  )
}
