import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, Warehouse, Clock, Users, FileText, Receipt, TrendingUp,
  ShoppingCart, IndianRupee, AlertTriangle, ArrowUpRight, ArrowDownRight,
  CheckCircle2, Activity, Zap, BarChart3, ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format } from 'date-fns'

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n === undefined || n === null) return '₹0'
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}
function fmtFull(n) {
  return `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

const STATUS_CONFIG = {
  paid:            { label: 'Paid',          color: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  draft:           { label: 'Draft',         color: '#94a3b8', bg: 'bg-slate-100',   text: 'text-slate-600'   },
  partially_paid:  { label: 'Partial',       color: '#f59e0b', bg: 'bg-amber-100',   text: 'text-amber-700'   },
  cancelled:       { label: 'Cancelled',     color: '#ef4444', bg: 'bg-red-100',     text: 'text-red-700'     },
}

const PIE_COLORS = ['#10b981','#94a3b8','#f59e0b','#ef4444','#6366f1']

// ── sub-components ────────────────────────────────────────────────────────────
function HeroCard({ title, value, subtitle, icon: Icon, gradient, trend }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${gradient} text-white shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-extrabold leading-tight">{value}</p>
          {subtitle && <p className="text-white/60 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
          <Icon size={20} className="text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          {trend >= 0
            ? <ArrowUpRight size={13} className="text-white/80" />
            : <ArrowDownRight size={13} className="text-white/80" />}
          <span className="text-white/80 text-xs font-medium">
            {trend >= 0 ? '+' : ''}{trend}% vs last month
          </span>
        </div>
      )}
      {/* Decorative circle */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full" />
      <div className="absolute -right-0 -bottom-8 w-16 h-16 bg-white/10 rounded-full" />
    </div>
  )
}

function StatCard({ title, value, icon: Icon, iconBg, iconText, href, badge }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => href && navigate(href)}
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${href ? 'cursor-pointer group' : ''}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={18} className={iconText} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{title}</p>
        <p className="text-xl font-bold text-gray-800 dark:text-slate-100">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      </div>
      {badge && (
        <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">{badge}</span>
      )}
      {href && <ChevronRight size={14} className="text-gray-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors flex-shrink-0" />}
    </div>
  )
}

// Custom tooltip for charts
function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-3">
      <p className="text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">{label}</p>
      <p className="text-sm font-bold text-blue-600">{fmtFull(payload[0]?.value)}</p>
      {payload[1] && <p className="text-xs text-gray-400">{payload[1]?.value} invoices</p>}
    </div>
  )
}

// Loading skeleton
function Skeleton({ className }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded-xl ${className}`} />
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-7 w-36 mb-1" /><Skeleton className="h-4 w-48" /></div>
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="lg:col-span-2 h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <p className="text-gray-600 dark:text-slate-300 font-medium">Failed to load dashboard</p>
        <p className="text-sm text-gray-400">{error}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-blue-600 hover:underline">Try again</button>
      </div>
    )
  }

  // Derived data
  const invoiceStatusData = Object.entries(data?.invoicesByStatus || {}).map(([status, count]) => ({
    name: STATUS_CONFIG[status]?.label || status,
    value: count,
    color: STATUS_CONFIG[status]?.color || '#94a3b8',
  })).filter(d => d.value > 0)

  const monthlyRevenue = data?.monthlyRevenue || []
  const hasRevenueData = monthlyRevenue.some(m => m.revenue > 0)

  return (
    <div className="space-y-5 pb-4">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 dark:text-slate-400 mt-0.5">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-full hover:shadow-sm transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ── Hero KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <HeroCard
          title="Today's Revenue"
          value={fmt(data?.todayRevenue)}
          subtitle={`${fmtFull(data?.todayRevenue)} collected`}
          icon={IndianRupee}
          gradient="bg-gradient-to-br from-emerald-500 to-green-600"
        />
        <HeroCard
          title="This Month"
          value={fmt(data?.monthRevenue)}
          subtitle="Paid invoices"
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
        />
        <HeroCard
          title="Outstanding"
          value={fmt(data?.outstandingAmount)}
          subtitle="Awaiting payment"
          icon={Clock}
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
        />
        <HeroCard
          title="Total Revenue"
          value={fmt(data?.totalRevenue)}
          subtitle="All-time collected"
          icon={BarChart3}
          gradient="bg-gradient-to-br from-violet-500 to-indigo-600"
        />
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard title="Customers" value={data?.totalCustomers ?? 0} icon={Users} iconBg="bg-blue-50 dark:bg-blue-900/30" iconText="text-blue-600" href="/customers" />
        <StatCard title="Products" value={data?.totalProducts ?? 0} icon={Package} iconBg="bg-indigo-50 dark:bg-indigo-900/30" iconText="text-indigo-600" href="/products" badge={data?.pendingApprovals > 0 ? `${data.pendingApprovals} pending` : undefined} />
        <StatCard title="Invoices" value={data?.totalInvoices ?? 0} icon={Receipt} iconBg="bg-emerald-50 dark:bg-emerald-900/30" iconText="text-emerald-600" href="/invoices" />
        <StatCard title="Quotations" value={data?.totalQuotations ?? 0} icon={FileText} iconBg="bg-violet-50 dark:bg-violet-900/30" iconText="text-violet-600" href="/quotations" />
        <StatCard title="Purchase Orders" value={data?.totalPurchaseOrders ?? 0} icon={ShoppingCart} iconBg="bg-orange-50 dark:bg-orange-900/30" iconText="text-orange-600" href="/purchase-orders" />
        <StatCard title="Inventory Items" value={data?.totalInventoryItems ?? 0} icon={Warehouse} iconBg="bg-cyan-50 dark:bg-cyan-900/30" iconText="text-cyan-600" href="/inventory" />
        <StatCard title="Purchase Value" value={fmt(data?.totalPOValue)} icon={IndianRupee} iconBg="bg-rose-50 dark:bg-rose-900/30" iconText="text-rose-600" />
        <StatCard title="Paid Invoices" value={data?.invoicesByStatus?.paid ?? 0} icon={CheckCircle2} iconBg="bg-teal-50 dark:bg-teal-900/30" iconText="text-teal-600" href="/invoices" />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Monthly Revenue */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">Revenue Trend</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Last 6 months — paid invoices</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <TrendingUp size={13} /> Revenue
            </div>
          </div>
          {hasRevenueData ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyRevenue} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5}
                  fill="url(#revenueGrad)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex flex-col items-center justify-center gap-2 text-gray-300 dark:text-slate-600">
              <BarChart3 size={36} />
              <p className="text-sm text-gray-400 dark:text-slate-500">No revenue data yet</p>
              <button onClick={() => navigate('/invoices')} className="text-xs text-blue-500 hover:underline">Create an invoice</button>
            </div>
          )}
        </div>

        {/* Invoice Status Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <div className="mb-5">
            <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">Invoice Status</h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Distribution by status</p>
          </div>
          {invoiceStatusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={invoiceStatusData} cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value"
                    startAngle={90} endAngle={-270}
                  >
                    {invoiceStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(val, name) => [val, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-y-2 mt-2">
                {invoiceStatusData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-500 dark:text-slate-400 truncate">{item.name}</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-slate-300 ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-gray-300 dark:text-slate-600">
              <Receipt size={32} />
              <p className="text-sm text-gray-400 dark:text-slate-500">No invoices yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Recent Invoices + Low Stock ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Invoices */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-slate-700">
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">Recent Invoices</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Latest {data?.recentInvoices?.length || 0} entries</p>
            </div>
            <button
              onClick={() => navigate('/invoices')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline"
            >
              View all <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {data?.recentInvoices?.length ? data.recentInvoices.map((inv) => {
              const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft
              return (
                <div
                  key={inv._id}
                  onClick={() => navigate('/invoices')}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                >
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Receipt size={14} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{inv.customerName}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{inv.invoiceNumber} · {format(new Date(inv.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-100">{fmtFull(inv.grandTotal)}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                      {sc.label}
                    </span>
                  </div>
                </div>
              )
            }) : (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-300 dark:text-slate-600">
                <Receipt size={32} />
                <p className="text-sm text-gray-400 dark:text-slate-500">No invoices yet</p>
                <button onClick={() => navigate('/invoices')} className="text-xs text-blue-500 hover:underline">Create first invoice</button>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Low Stock + Activity */}
        <div className="space-y-5">

          {/* Low Stock Alert */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={12} className="text-amber-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">Low Stock Alert</h2>
              </div>
              <button onClick={() => navigate('/inventory')} className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
                View <ArrowUpRight size={11} />
              </button>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-slate-700">
              {data?.lowStockItems?.length ? data.lowStockItems.map((item) => (
                <div key={item._id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                  <div className="w-8 h-8 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package size={13} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{item.productName}</p>
                    {item.productCode && <p className="text-xs text-gray-400 dark:text-slate-500">{item.productCode}</p>}
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      item.currentStock <= 0
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : item.currentStock < 5
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {item.currentStock <= 0 ? 'Out' : `${item.currentStock} left`}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="flex items-center gap-3 px-5 py-5">
                  <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-sm text-gray-500 dark:text-slate-400">All products are well-stocked</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Activity size={12} className="text-blue-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100">Recent Activity</h2>
              </div>
              <button onClick={() => navigate('/activity-log')} className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium">
                View all <ArrowUpRight size={11} />
              </button>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-slate-700">
              {data?.recentActivity?.length ? data.recentActivity.slice(0, 5).map((log) => (
                <div key={log._id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-[10px] font-bold">{(log.userName || '?').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 dark:text-slate-300 leading-snug">
                      <span className="font-semibold">{log.userName}</span>
                      {' '}<span className="text-gray-400 dark:text-slate-500">{log.action?.toLowerCase()}d</span>{' '}
                      <span className="font-medium capitalize">{log.module}</span>
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{format(new Date(log.createdAt), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              )) : (
                <div className="flex items-center gap-3 px-5 py-5">
                  <Zap size={16} className="text-gray-300 dark:text-slate-600 flex-shrink-0" />
                  <p className="text-sm text-gray-400 dark:text-slate-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
