import { useEffect, useState, useCallback, useRef } from 'react'
import {
  TrendingUp, TrendingDown, Search, LayoutGrid, List,
  Upload, Download, X, ChevronLeft, ChevronRight, AlertTriangle,
  Package, RefreshCw,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format } from 'date-fns'

function generateRef(type) {
  const now = new Date()
  const dateStr = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
  const timeStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0')
  const prefix = type === 'stock_in' ? 'STK-IN' : 'STK-OUT'
  return `${prefix}-${dateStr}-${timeStr}`
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']

export default function InventoryPage() {
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [stockSummary, setStockSummary] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showBulkUpload, setShowBulkUpload] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('list')

  // Pagination & filters
  const [page, setPage] = useState(1)
  const LIMIT = 15
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')

  const [form, setForm] = useState({
    productId: '', productName: '', productCode: '',
    type: 'stock_in',
    quantity: '', reference: '', notes: '',
  })

  // Bulk upload state
  const [bulkFile, setBulkFile] = useState(null)
  const [bulkResults, setBulkResults] = useState(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const fileInputRef = useRef(null)

  function getToken() { return localStorage.getItem('token') || '' }

  const fetchInventory = useCallback(async (p = page, q = search, tf = typeFilter, pf = productFilter) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (q) params.set('search', q)
      if (tf) params.set('type', tf)
      if (pf) params.set('productId', pf)

      const [recordsRes, summaryRes] = await Promise.all([
        fetch(`/api/inventory?${params}`, { headers: { Authorization: `Bearer ${getToken()}` } }),
        fetch('/api/inventory?aggregate=true', { headers: { Authorization: `Bearer ${getToken()}` } }),
      ])
      const recordsJson = await recordsRes.json()
      const summaryJson = await summaryRes.json()
      if (recordsJson.success) {
        setRecords(recordsJson.data.records)
        setTotal(recordsJson.data.total || 0)
      }
      if (summaryJson.success) setStockSummary(summaryJson.data.stockSummary)
    } finally { setLoading(false) }
  }, [page, search, typeFilter, productFilter])

  async function fetchProducts() {
    const res = await fetch('/api/products?status=approved&limit=200', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const json = await res.json()
    if (json.success) setProducts(json.data.products)
  }

  useEffect(() => {
    fetchInventory()
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyFilters(p = 1, q = search, tf = typeFilter, pf = productFilter) {
    setPage(p)
    fetchInventory(p, q, tf, pf)
  }

  function openStockForm(type) {
    setForm({ productId: '', productName: '', productCode: '', type, quantity: '', reference: generateRef(type), notes: '' })
    setError('')
    setShowForm(true)
  }

  function handleProductSelect(productId) {
    const product = products.find((p) => p._id === productId)
    if (product) setForm({ ...form, productId, productName: product.name, productCode: product.code })
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
      })
      const json = await res.json()
      if (json.success) {
        setShowForm(false)
        applyFilters()
      } else { setError(json.message) }
    } finally { setSubmitting(false) }
  }

  // Bulk Upload

  function downloadTemplate() {
    const csv = [
      'productCode,type,quantity,reference,notes',
      'NEX-LAP001,stock_in,10,PO-2024-001,Opening stock',
      'NEX-MOU001,stock_out,2,SO-2024-001,Customer order',
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'inventory_bulk_template.csv'
    a.click()
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(Boolean)
    if (lines.length < 2) return []
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const rows = lines.slice(1)
    return rows.map((line) => {
      const vals = line.split(',').map((v) => v.trim())
      const obj = {}
      header.forEach((h, i) => { obj[h] = vals[i] || '' })
      return {
        productCode: obj.productcode || obj['product code'] || '',
        type: obj.type === 'stock_out' ? 'stock_out' : 'stock_in',
        quantity: Number(obj.quantity) || 0,
        reference: obj.reference || '',
        notes: obj.notes || '',
      }
    })
  }

  async function handleBulkUpload() {
    if (!bulkFile) return
    setBulkUploading(true)
    setBulkResults(null)
    try {
      const text = await bulkFile.text()
      const records = parseCSV(text)
      if (records.length === 0) {
        alert('No valid rows found in CSV')
        return
      }
      const res = await fetch('/api/inventory/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ records }),
      })
      const json = await res.json()
      if (json.success) {
        setBulkResults(json.data.results)
        fetchInventory()
      } else {
        alert(json.message)
      }
    } finally {
      setBulkUploading(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  // Stock summary stats
  const outOfStock = stockSummary.filter((s) => s.currentStock === 0).length
  const lowStock = stockSummary.filter((s) => s.currentStock > 0 && s.currentStock < 10).length
  const healthyStock = stockSummary.filter((s) => s.currentStock >= 10).length

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} records · {stockSummary.length} products tracked</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'} transition`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('graphical')}
              className={`p-2 ${viewMode === 'graphical' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'} transition`}
              title="Graphical view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => { setShowBulkUpload(true); setBulkResults(null); setBulkFile(null) }}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-3 py-2 rounded-lg transition"
          >
            <Upload className="w-4 h-4" /> Bulk Upload
          </button>
          <button
            onClick={() => openStockForm('stock_in')}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition"
          >
            <TrendingUp className="w-4 h-4" /> Stock In
          </button>
          <button
            onClick={() => openStockForm('stock_out')}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition"
          >
            <TrendingDown className="w-4 h-4" /> Stock Out
          </button>
        </div>
      </div>

      {/* GRAPHICAL VIEW */}
      {viewMode === 'graphical' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Products', value: stockSummary.length, color: 'bg-blue-500', icon: Package },
              { label: 'Healthy Stock', value: healthyStock, color: 'bg-emerald-500', icon: TrendingUp },
              { label: 'Low Stock', value: lowStock, color: 'bg-orange-400', icon: AlertTriangle },
              { label: 'Out of Stock', value: outOfStock, color: 'bg-red-500', icon: AlertTriangle },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{label}</p>
                    <p className="text-2xl font-bold text-gray-800">{value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar chart: top 10 products by current stock */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">Current Stock Levels (Top 10)</h2>
              {stockSummary.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Package className="w-10 h-10 mb-2" />
                  <p className="text-sm">No inventory data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={[...stockSummary].sort((a, b) => b.currentStock - a.currentStock).slice(0, 10).map((s) => ({
                      name: s.productCode,
                      stock: s.currentStock,
                      in: s.totalIn,
                      out: s.totalOut,
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="stock" name="Stock" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie: stock health distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">Stock Health Distribution</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Healthy (≥10)', value: healthyStock },
                      { name: 'Low Stock (<10)', value: lowStock },
                      { name: 'Out of Stock', value: outOfStock },
                    ].filter((d) => d.value > 0)}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                    paddingAngle={3} dataKey="value"
                  >
                    {['#10b981', '#f59e0b', '#ef4444'].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Stock In vs Out comparison */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-4">Stock In vs Out by Product</h2>
              {stockSummary.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stockSummary.slice(0, 8).map((s) => ({
                    name: s.productCode,
                    'Stock In': s.totalIn,
                    'Stock Out': s.totalOut,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Stock In" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Stock Out" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Low/Out of stock alerts */}
          {(lowStock > 0 || outOfStock > 0) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" /> Stock Alerts
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {stockSummary
                  .filter((s) => s.currentStock < 10)
                  .sort((a, b) => a.currentStock - b.currentStock)
                  .map((s) => (
                    <div key={s._id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${s.currentStock === 0 ? 'bg-red-50' : 'bg-orange-50'}`}>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.productName}</p>
                        <p className="text-xs text-gray-400">{s.productCode}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${s.currentStock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {s.currentStock === 0 ? 'OUT' : `${s.currentStock} left`}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Stock Summary Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-semibold text-gray-700 mb-4">All Products Stock</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {stockSummary.map((item, i) => (
                <div
                  key={item._id}
                  className={`border rounded-xl p-3 ${item.currentStock === 0 ? 'border-red-200 bg-red-50' : item.currentStock < 10 ? 'border-orange-200 bg-orange-50' : 'border-gray-100'}`}
                >
                  <div className="w-6 h-6 rounded-full mb-2 flex items-center justify-center" style={{ backgroundColor: COLORS[i % COLORS.length] + '20' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                  <p className="text-xs text-gray-500 font-mono truncate">{item.productCode}</p>
                  <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                  <p className={`text-xl font-bold mt-1 ${item.currentStock === 0 ? 'text-red-500' : item.currentStock < 10 ? 'text-orange-500' : 'text-green-600'}`}>
                    {item.currentStock}
                  </p>
                  <div className="flex gap-2 mt-1 text-xs text-gray-400">
                    <span className="text-green-600">↑{item.totalIn}</span>
                    <span className="text-red-500">↓{item.totalOut}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <>
          {/* Quick stock summary strip */}
          {stockSummary.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Summary</span>
                {stockSummary.slice(0, 8).map((item) => (
                  <div key={item._id} className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">{item.productCode}:</span>
                    <span className={`text-xs font-bold ${item.currentStock === 0 ? 'text-red-500' : item.currentStock < 10 ? 'text-orange-500' : 'text-green-600'}`}>
                      {item.currentStock}
                    </span>
                  </div>
                ))}
                {stockSummary.length > 8 && <span className="text-xs text-gray-400">+{stockSummary.length - 8} more</span>}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); applyFilters(1, e.target.value, typeFilter, productFilter) }}
                placeholder="Search product..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); applyFilters(1, search, e.target.value, productFilter) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="stock_in">Stock In</option>
              <option value="stock_out">Stock Out</option>
            </select>
            <select
              value={productFilter}
              onChange={(e) => { setProductFilter(e.target.value); applyFilters(1, search, typeFilter, e.target.value) }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Products</option>
              {products.map((p) => <option key={p._id} value={p._id}>{p.code} — {p.name}</option>)}
            </select>
            <button
              onClick={() => { setSearch(''); setTypeFilter(''); setProductFilter(''); applyFilters(1, '', '', '') }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2.5 py-2 rounded-lg hover:bg-gray-50 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : records.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No inventory records found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {['Product', 'Code', 'Type', 'Qty', 'Prev Stock', 'Current Stock', 'Reference', 'By', 'Date'].map((h) => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-gray-800">{r.productName}</td>
                          <td className="py-3 px-4 text-xs font-mono text-gray-500">{r.productCode}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${r.type === 'stock_in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {r.type === 'stock_in' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {r.type === 'stock_in' ? 'Stock In' : 'Stock Out'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-gray-700">
                            <span className={r.type === 'stock_in' ? 'text-green-600' : 'text-red-500'}>
                              {r.type === 'stock_in' ? '+' : '-'}{r.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">{r.previousStock}</td>
                          <td className="py-3 px-4">
                            <span className={`text-sm font-bold ${r.currentStock === 0 ? 'text-red-500' : r.currentStock < 10 ? 'text-orange-500' : 'text-gray-800'}`}>
                              {r.currentStock}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500">{r.reference || '—'}</td>
                          <td className="py-3 px-4 text-xs text-gray-500">{r.createdByName || '—'}</td>
                          <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                            {format(new Date(r.createdAt), 'dd MMM yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={page === 1}
                        onClick={() => { setPage(page - 1); fetchInventory(page - 1) }}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-gray-600 px-2">Page {page} of {totalPages}</span>
                      <button
                        disabled={page === totalPages}
                        onClick={() => { setPage(page + 1); fetchInventory(page + 1) }}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Add Stock Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-base font-semibold text-gray-800">
                {form.type === 'stock_in' ? '↑ Stock In' : '↓ Stock Out'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && <div className="mx-5 mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Product *</label>
                <select required value={form.productId} onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p._id} value={p._id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select value={form.type}
                  onChange={(e) => { const t = e.target.value; setForm({ ...form, type: t, reference: generateRef(t) }) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="stock_in">Stock In</option>
                  <option value="stock_out">Stock Out</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                <input required type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reference</label>
                <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2 flex gap-3 pt-2 border-t border-gray-100">
                <button type="submit" disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
                  {submitting ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-5 py-2 rounded-lg transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-base font-semibold text-gray-800">Bulk Upload Inventory</h2>
              <button onClick={() => setShowBulkUpload(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">CSV Format</p>
                <p className="text-xs font-mono bg-blue-100 rounded px-2 py-1">productCode, type, quantity, reference, notes</p>
                <ul className="text-xs mt-2 space-y-0.5 text-blue-700">
                  <li>• <strong>productCode</strong>: Must match your product codes exactly</li>
                  <li>• <strong>type</strong>: <code>stock_in</code> or <code>stock_out</code></li>
                  <li>• <strong>quantity</strong>: Positive number</li>
                  <li>• <strong>reference, notes</strong>: Optional</li>
                </ul>
              </div>

              <button onClick={downloadTemplate}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 px-3 py-2 rounded-lg transition w-full justify-center">
                <Download className="w-4 h-4" /> Download CSV Template
              </button>

              {/* File upload */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Upload CSV File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => { setBulkFile(e.target.files?.[0] || null); setBulkResults(null) }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {bulkFile && (
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  Selected: <strong>{bulkFile.name}</strong> ({(bulkFile.size / 1024).toFixed(1)} KB)
                </div>
              )}

              <button
                onClick={handleBulkUpload}
                disabled={!bulkFile || bulkUploading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium py-2.5 rounded-lg transition"
              >
                {bulkUploading ? 'Processing...' : 'Upload & Process'}
              </button>

              {/* Results */}
              {bulkResults && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Upload Results</h3>
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-600 font-medium">✓ {bulkResults.filter((r) => r.success).length} success</span>
                      <span className="text-red-500 font-medium">✗ {bulkResults.filter((r) => !r.success).length} failed</span>
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                    {bulkResults.map((r, i) => (
                      <div key={i} className={`flex items-start gap-3 px-4 py-2.5 text-xs ${r.success ? '' : 'bg-red-50'}`}>
                        <span className={`font-medium ${r.success ? 'text-green-600' : 'text-red-500'}`}>
                          {r.success ? '✓' : '✗'}
                        </span>
                        <span className="text-gray-500">Row {r.row}</span>
                        <span className="font-mono text-gray-700">{r.productCode}</span>
                        {!r.success && <span className="text-red-600 ml-auto">{r.message}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
