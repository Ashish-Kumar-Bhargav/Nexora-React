import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts'
import { format } from 'date-fns'
import {
  TrendingUp, Package, AlertTriangle, CheckCircle, Download,
  Calendar, BarChart2, IndianRupee, ArrowUpRight, Search, X,
  CreditCard, Sliders,
} from 'lucide-react'

// Static field definitions per module for the dynamic report builder
const MODULE_FIELDS = {
  invoices: [
    { key: 'invoiceNumber', label: 'Invoice Number' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'grandTotal', label: 'Grand Total' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'taxTotal', label: 'Tax Total' },
    { key: 'status', label: 'Status' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'paidAt', label: 'Paid On' },
    { key: 'createdByName', label: 'Created By' },
    { key: 'createdAt', label: 'Created Date' },
  ],
  quotations: [
    { key: 'quotationNumber', label: 'Quotation Number' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'grandTotal', label: 'Grand Total' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'taxTotal', label: 'Tax Total' },
    { key: 'status', label: 'Status' },
    { key: 'validUntil', label: 'Valid Until' },
    { key: 'notes', label: 'Notes' },
    { key: 'createdByName', label: 'Created By' },
    { key: 'createdAt', label: 'Created Date' },
  ],
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function formatINR(val) {
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return format(d, 'yyyy-MM-dd')
  })
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)

  // Sales filters
  const [salesCustomer, setSalesCustomer] = useState('')
  const [salesMinAmount, setSalesMinAmount] = useState('')
  const [salesMaxAmount, setSalesMaxAmount] = useState('')

  // Stock filters
  const [stockSearch, setStockSearch] = useState('')
  const [stockStatus, setStockStatus] = useState('all')

  // Payment filters
  const [paymentCustomer, setPaymentCustomer] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('all')

  // Dynamic report state
  const [dynamicModule, setDynamicModule] = useState('invoices')
  const [selectedFields, setSelectedFields] = useState(['invoiceNumber', 'customerName', 'grandTotal', 'status'])
  const [customFieldDefs, setCustomFieldDefs] = useState([])
  const [dynamicData, setDynamicData] = useState(null)
  const [dynamicHeaders, setDynamicHeaders] = useState([])

  const [salesData, setSalesData] = useState(null)
  const [profitData, setProfitData] = useState(null)
  const [stockData, setStockData] = useState(null)
  const [sendingAlert, setSendingAlert] = useState(false)
  const [alertMsg, setAlertMsg] = useState(null)
  const [paymentData, setPaymentData] = useState(null)

  // Fetch custom field definitions for dynamic report
  useEffect(() => {
    if (activeTab !== 'dynamic') return
    fetch(`/api/custom-fields?module=${dynamicModule}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCustomFieldDefs(json.data.fields)
      })
      .catch(() => {/* ignore */})
  }, [activeTab, dynamicModule])

  // Reset selected fields when module changes
  useEffect(() => {
    if (dynamicModule === 'invoices') {
      setSelectedFields(['invoiceNumber', 'customerName', 'grandTotal', 'status'])
    } else {
      setSelectedFields(['quotationNumber', 'customerName', 'grandTotal', 'status'])
    }
    setDynamicData(null)
  }, [dynamicModule])

  const fetchReport = useCallback(async (tab) => {
    if (tab === 'dynamic') return // dynamic fetches on demand
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: tab, startDate, endDate })
      if (tab === 'sales') {
        if (salesCustomer) params.set('customer', salesCustomer)
        if (salesMinAmount) params.set('minAmount', salesMinAmount)
        if (salesMaxAmount) params.set('maxAmount', salesMaxAmount)
      }
      if (tab === 'stock') {
        if (stockSearch) params.set('stockSearch', stockSearch)
        if (stockStatus !== 'all') params.set('stockStatus', stockStatus)
      }
      if (tab === 'payments') {
        if (paymentCustomer) params.set('customer', paymentCustomer)
        if (paymentStatus !== 'all') params.set('paymentStatus', paymentStatus)
      }
      const res = await fetch(`/api/reports?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const json = await res.json()
      if (json.success) {
        if (tab === 'sales') setSalesData(json.data)
        if (tab === 'profit') setProfitData(json.data)
        if (tab === 'stock') setStockData(json.data)
        if (tab === 'payments') setPaymentData(json.data)
      }
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, salesCustomer, salesMinAmount, salesMaxAmount, stockSearch, stockStatus, paymentCustomer, paymentStatus])

  useEffect(() => {
    fetchReport(activeTab)
  }, [activeTab, fetchReport])

  async function runDynamicReport() {
    if (selectedFields.length === 0) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: 'dynamic',
        module: dynamicModule,
        fields: selectedFields.join(','),
        startDate,
        endDate,
      })
      const res = await fetch(`/api/reports?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const json = await res.json()
      if (json.success) {
        setDynamicData(json.data.records)
        setDynamicHeaders(json.data.fields)
      }
    } finally {
      setLoading(false)
    }
  }

  function toggleField(key) {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    )
  }

  async function sendLowStockAlert() {
    setSendingAlert(true); setAlertMsg(null)
    try {
      const res = await fetch('/api/notifications/low-stock-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      setAlertMsg({ type: json.success ? 'success' : 'error', text: json.message })
    } catch {
      setAlertMsg({ type: 'error', text: 'Failed to send alert email.' })
    } finally {
      setSendingAlert(false)
    }
  }

  function exportCSV() {
    if (activeTab === 'sales' && salesData) {
      const rows = [['Date', 'Revenue', 'Tax Collected', 'Invoices', 'Customers']]
      salesData.dailySales.forEach((d) => {
        rows.push([
          format(new Date(d.date), 'dd/MM/yyyy'),
          d.revenue.toFixed(2), d.taxCollected.toFixed(2),
          String(d.invoiceCount), String(d.customerCount),
        ])
      })
      downloadCSV(rows, `sales-report-${startDate}-${endDate}.csv`)
    } else if (activeTab === 'stock' && stockData) {
      const rows = [['Product', 'Code', 'Current Stock', 'Total In', 'Total Out', 'Status']]
      stockData.stockSummary.forEach((s) => {
        const status = s.currentStock === 0 ? 'Out of Stock' : s.currentStock < (stockData?.lowStockThreshold ?? 10) ? 'Low Stock' : 'Healthy'
        rows.push([s.productName, s.productCode, String(s.currentStock), String(s.totalIn), String(s.totalOut), status])
      })
      downloadCSV(rows, `stock-report-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    } else if (activeTab === 'profit' && profitData) {
      const rows = [['Year', 'Month', 'Revenue', 'Tax', 'Net Revenue', 'Invoices']]
      profitData.monthlyProfit.forEach((m) => {
        rows.push([String(m.year), MONTHS[m.month - 1], m.revenue.toFixed(2), m.taxAmount.toFixed(2), m.netRevenue.toFixed(2), String(m.invoiceCount)])
      })
      downloadCSV(rows, `profit-report-${startDate}-${endDate}.csv`)
    } else if (activeTab === 'payments' && paymentData) {
      const rows = [['Invoice #', 'Customer', 'Total', 'Paid', 'Pending', 'Status', 'Due Date', 'Paid On']]
      paymentData.payments.forEach((p) => {
        rows.push([
          p.invoiceNumber, p.customerName,
          p.grandTotal.toFixed(2), p.paidAmount.toFixed(2), p.pendingAmount.toFixed(2),
          p.status,
          p.dueDate ? format(new Date(p.dueDate), 'dd/MM/yyyy') : '',
          p.paidAt ? format(new Date(p.paidAt), 'dd/MM/yyyy') : '',
        ])
      })
      downloadCSV(rows, `payment-report-${startDate}-${endDate}.csv`)
    } else if (activeTab === 'dynamic' && dynamicData && dynamicHeaders.length > 0) {
      const allFields = [
        ...MODULE_FIELDS[dynamicModule],
        ...customFieldDefs.map((f) => ({ key: `customFields.${f.fieldKey}`, label: f.fieldLabel })),
      ]
      const headerLabels = dynamicHeaders.map((h) => {
        const found = allFields.find((f) => f.key === h)
        return found ? found.label : h
      })
      const rows = [headerLabels]
      dynamicData.forEach((record) => {
        rows.push(dynamicHeaders.map((h) => {
          if (h.startsWith('customFields.')) {
            const key = h.replace('customFields.', '')
            const cf = record.customFields
            return String(cf?.[key] ?? '')
          }
          const val = record[h]
          if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))) {
            try { return format(new Date(val), 'dd/MM/yyyy') } catch { return String(val ?? '') }
          }
          return String(val ?? '')
        }))
      })
      downloadCSV(rows, `dynamic-report-${dynamicModule}-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    }
  }

  function downloadCSV(rows, filename) {
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
  }

  const tabs = [
    { key: 'sales', label: 'Daily Sales', icon: BarChart2 },
    { key: 'profit', label: 'Profit Analysis', icon: TrendingUp },
    { key: 'stock', label: 'Stock Report', icon: Package },
    { key: 'payments', label: 'Payment Report', icon: CreditCard },
    { key: 'dynamic', label: 'Custom Report', icon: Sliders },
  ]

  const allDynamicFields = [
    ...MODULE_FIELDS[dynamicModule],
    ...customFieldDefs.map((f) => ({ key: `customFields.${f.fieldKey}`, label: `${f.fieldLabel} (custom)` })),
  ]

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Business insights and analytics</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Tabs + Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between px-4 pt-4 pb-0 flex-wrap gap-3">
          <div className="flex gap-1 flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
          {activeTab !== 'stock' && activeTab !== 'dynamic' && (
            <div className="flex items-center gap-2 pb-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Sales extra filters */}
        {activeTab === 'sales' && (
          <div className="px-4 pb-4 pt-3 border-t border-gray-50 flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Filter by customer..." value={salesCustomer}
                onChange={(e) => setSalesCustomer(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Amount:</span>
              <input type="number" placeholder="Min ₹" value={salesMinAmount}
                onChange={(e) => setSalesMinAmount(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
              />
              <span className="text-gray-400 text-xs">–</span>
              <input type="number" placeholder="Max ₹" value={salesMaxAmount}
                onChange={(e) => setSalesMaxAmount(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
              />
            </div>
            {(salesCustomer || salesMinAmount || salesMaxAmount) && (
              <button onClick={() => { setSalesCustomer(''); setSalesMinAmount(''); setSalesMaxAmount('') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition">
                <X className="w-3 h-3" /> Reset filters
              </button>
            )}
          </div>
        )}

        {/* Stock extra filters */}
        {activeTab === 'stock' && (
          <div className="px-4 pb-4 pt-3 border-t border-gray-50 flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Search product name or code..." value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
            </div>
            <select value={stockStatus} onChange={(e) => setStockStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Status</option>
              <option value="ok">In Stock (≥{stockData?.lowStockThreshold ?? 10})</option>
              <option value="low">Low Stock (&lt;{stockData?.lowStockThreshold ?? 10})</option>
              <option value="out">Out of Stock</option>
            </select>
            {(stockSearch || stockStatus !== 'all') && (
              <button onClick={() => { setStockSearch(''); setStockStatus('all') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition">
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        )}

        {/* Payment extra filters */}
        {activeTab === 'payments' && (
          <div className="px-4 pb-4 pt-3 border-t border-gray-50 flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Filter by customer..." value={paymentCustomer}
                onChange={(e) => setPaymentCustomer(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Statuses</option>
              <option value="draft">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {(paymentCustomer || paymentStatus !== 'all') && (
              <button onClick={() => { setPaymentCustomer(''); setPaymentStatus('all') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition">
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        )}

        <div className="border-t border-gray-100" />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      )}

      {/* SALES TAB */}
      {!loading && activeTab === 'sales' && salesData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Total Revenue" value={formatINR(salesData.summary.totalRevenue)} icon={IndianRupee} color="bg-blue-500" subtitle="From paid invoices" />
            <StatCard title="Tax Collected" value={formatINR(salesData.summary.totalTax)} icon={ArrowUpRight} color="bg-green-500" subtitle="GST amount" />
            <StatCard title="Total Invoices" value={String(salesData.summary.totalInvoices)} icon={BarChart2} color="bg-purple-500" subtitle="Paid invoices" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Daily Revenue</h2>
            {salesData.dailySales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <BarChart2 className="w-10 h-10 mb-2" />
                <p className="text-sm">No sales data in this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesData.dailySales.map((d) => ({
                  date: format(new Date(d.date), 'dd MMM'),
                  revenue: d.revenue, tax: d.taxCollected, invoices: d.invoiceCount,
                }))}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatINR(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {salesData.dailySales.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-700">Daily Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Date</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Revenue</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Tax</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Invoices</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Customers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.dailySales.map((d, i) => (
                      <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-700">{format(new Date(d.date), 'dd MMM yyyy')}</td>
                        <td className="px-5 py-3 text-right font-medium text-gray-800">{formatINR(d.revenue)}</td>
                        <td className="px-5 py-3 text-right text-gray-500">{formatINR(d.taxCollected)}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{d.invoiceCount}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{d.customerCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROFIT TAB */}
      {!loading && activeTab === 'profit' && profitData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Total Revenue" value={formatINR(profitData.summary.totalRevenue)} icon={IndianRupee} color="bg-blue-500" subtitle={`${profitData.summary.count} invoices`} />
            <StatCard title="Net Revenue (excl. tax)" value={formatINR(profitData.summary.totalSubtotal)} icon={TrendingUp} color="bg-emerald-500" subtitle="Pre-tax amount" />
            <StatCard title="Total GST" value={formatINR(profitData.summary.totalTax)} icon={ArrowUpRight} color="bg-orange-400" subtitle="Tax collected" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">Monthly Revenue vs Tax</h2>
              {profitData.monthlyProfit.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <TrendingUp className="w-10 h-10 mb-2" />
                  <p className="text-sm">No profit data in this period</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={profitData.monthlyProfit.map((m) => ({
                    period: `${MONTHS[m.month - 1]} ${m.year}`,
                    revenue: m.revenue, tax: m.taxAmount, net: m.netRevenue,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatINR(v)} />
                    <Bar dataKey="net" name="Net Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tax" name="Tax" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">Top Customers</h2>
              {profitData.topCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <p className="text-sm">No data</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profitData.topCustomers.map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.customerName}</p>
                        <p className="text-xs text-gray-400">{c.invoiceCount} invoice{c.invoiceCount !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-sm font-semibold text-gray-700">{formatINR(c.revenue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STOCK TAB */}
      {!loading && activeTab === 'stock' && stockData && (
        <div className="space-y-6">
          {alertMsg && (
            <div className={`px-4 py-3 rounded-xl text-sm font-medium ${alertMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {alertMsg.text}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="Total Products" value={String(stockData.summary.totalProducts)} icon={Package} color="bg-blue-500" />
            <StatCard title="Healthy Stock" value={String(stockData.summary.healthyStockCount)} icon={CheckCircle} color="bg-emerald-500" />
            <StatCard title="Low Stock" value={String(stockData.summary.lowStockCount)} icon={AlertTriangle} color="bg-orange-400" subtitle={`< ${stockData.lowStockThreshold} units`} />
            <StatCard title="Out of Stock" value={String(stockData.summary.outOfStockCount)} icon={AlertTriangle} color="bg-red-500" subtitle="0 units" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">Stock Level Distribution</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: `Healthy (≥${stockData.lowStockThreshold})`, value: stockData.summary.healthyStockCount },
                      { name: `Low Stock (<${stockData.lowStockThreshold})`, value: stockData.summary.lowStockCount - stockData.summary.outOfStockCount },
                      { name: 'Out of Stock', value: stockData.summary.outOfStockCount },
                    ].filter((d) => d.value > 0)}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value"
                  >
                    {['#10b981', '#f59e0b', '#ef4444'].map((color, i) => (
                      <Cell key={i} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-700">Low Stock Products</h2>
                <button
                  onClick={sendLowStockAlert}
                  disabled={sendingAlert}
                  className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium px-3 py-1.5 rounded-lg transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {sendingAlert ? 'Sending...' : 'Send Alert Email'}
                </button>
              </div>
              {stockData.stockSummary.filter((s) => s.currentStock < stockData.lowStockThreshold).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <CheckCircle className="w-8 h-8 mb-2 text-green-400" />
                  <p className="text-sm">All products have healthy stock levels</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {stockData.stockSummary.filter((s) => s.currentStock < stockData.lowStockThreshold).sort((a, b) => a.currentStock - b.currentStock).map((s, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${s.currentStock === 0 ? 'bg-red-50' : 'bg-orange-50'}`}>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.productName}</p>
                        <p className="text-xs text-gray-400">{s.productCode}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.currentStock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {s.currentStock === 0 ? 'OUT OF STOCK' : `${s.currentStock} left`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-700">Full Stock Report</h2>
              <span className="text-xs text-gray-400">{stockData.stockSummary.length} products</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Product</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Code</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Total In</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Total Out</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500">Current Stock</th>
                    <th className="text-center px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.stockSummary.map((s, i) => {
                    const status = s.currentStock === 0 ? 'out' : s.currentStock < stockData.lowStockThreshold ? 'low' : 'ok'
                    return (
                      <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-medium text-gray-800">{s.productName}</td>
                        <td className="px-5 py-3 text-gray-500">{s.productCode}</td>
                        <td className="px-5 py-3 text-right text-green-600">+{s.totalIn}</td>
                        <td className="px-5 py-3 text-right text-red-500">-{s.totalOut}</td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-700">{s.currentStock}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status === 'out' ? 'bg-red-100 text-red-700' : status === 'low' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {stockData.stockSummary.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">No inventory data found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENTS TAB */}
      {!loading && activeTab === 'payments' && paymentData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <StatCard title="Total Invoices" value={String(paymentData.summary.totalInvoices)} icon={CreditCard} color="bg-blue-500" />
            <StatCard title="Total Billed" value={formatINR(paymentData.summary.totalBilled)} icon={IndianRupee} color="bg-slate-500" />
            <StatCard title="Total Paid" value={formatINR(paymentData.summary.totalPaid)} icon={CheckCircle} color="bg-emerald-500" subtitle="Collected" />
            <StatCard title="Total Pending" value={formatINR(paymentData.summary.totalPending)} icon={AlertTriangle} color="bg-orange-400" subtitle="Outstanding" />
            <StatCard title="Overdue" value={String(paymentData.summary.overdueCount)} icon={AlertTriangle} color="bg-red-500" subtitle="Past due date" />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-700">Invoice Payment Details</h2>
              <span className="text-xs text-gray-400">{paymentData.payments.length} invoices</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Invoice #</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Customer</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Total</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Paid</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Pending</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Due Date</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500">Paid On</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentData.payments.map((p, i) => (
                    <tr key={i} className={`border-t border-gray-50 hover:bg-gray-50/50 ${p.isOverdue ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 font-medium text-blue-700">{p.invoiceNumber}</td>
                      <td className="px-4 py-3 text-gray-700">{p.customerName}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{formatINR(p.grandTotal)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">{formatINR(p.paidAmount)}</td>
                      <td className="px-4 py-3 text-right text-orange-500 font-medium">{formatINR(p.pendingAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          p.status === 'paid' ? 'bg-green-100 text-green-700' :
                          p.status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                          p.isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {p.isOverdue && p.status !== 'paid' ? 'Overdue' : p.status === 'draft' ? 'Unpaid' : p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">
                        {p.dueDate ? format(new Date(p.dueDate), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">
                        {p.paidAt ? format(new Date(p.paidAt), 'dd MMM yyyy') : '—'}
                      </td>
                    </tr>
                  ))}
                  {paymentData.payments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-sm">No invoices found for the selected filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC REPORT TAB */}
      {activeTab === 'dynamic' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Report Builder</h2>

            {/* Module + Date selector */}
            <div className="flex flex-wrap items-end gap-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Module</label>
                <select
                  value={dynamicModule}
                  onChange={(e) => setDynamicModule(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="invoices">Invoices</option>
                  <option value="quotations">Quotations</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Field selector */}
            <div className="mb-5">
              <p className="text-xs font-medium text-gray-600 mb-2">Select Fields to Include</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {allDynamicFields.map((field) => {
                  const checked = selectedFields.includes(field.key)
                  return (
                    <label
                      key={field.key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-sm ${
                        checked
                          ? 'bg-blue-50 border-blue-300 text-blue-800'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleField(field.key)}
                        className="accent-blue-600"
                      />
                      {field.label}
                    </label>
                  )
                })}
              </div>
              {allDynamicFields.length === 0 && (
                <p className="text-sm text-gray-400">No fields available.</p>
              )}
            </div>

            <button
              onClick={runDynamicReport}
              disabled={selectedFields.length === 0 || loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              <BarChart2 className="w-4 h-4" />
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>

          {/* Dynamic Results Table */}
          {dynamicData && dynamicHeaders.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-700">Results</h2>
                <span className="text-xs text-gray-400">{dynamicData.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      {dynamicHeaders.map((h) => {
                        const found = allDynamicFields.find((f) => f.key === h)
                        return (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">
                            {found ? found.label : h}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {dynamicData.map((record, i) => (
                      <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
                        {dynamicHeaders.map((h) => {
                          let val
                          if (h.startsWith('customFields.')) {
                            const key = h.replace('customFields.', '')
                            const cf = record.customFields
                            val = cf?.[key]
                          } else {
                            val = record[h]
                          }

                          // Format dates
                          if (val && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
                            try { val = format(new Date(val), 'dd MMM yyyy') } catch { /* keep original */ }
                          }
                          // Format currency fields
                          const isAmount = ['grandTotal', 'subtotal', 'taxTotal', 'paidAmount', 'pendingAmount'].includes(h)
                          return (
                            <td key={h} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                              {isAmount ? formatINR(Number(val) || 0) : String(val ?? '—')}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    {dynamicData.length === 0 && (
                      <tr>
                        <td colSpan={dynamicHeaders.length} className="px-5 py-10 text-center text-gray-400 text-sm">
                          No records found for the selected date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
