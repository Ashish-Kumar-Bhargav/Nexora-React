import { useState, useMemo } from 'react'
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  TableProperties,
} from 'lucide-react'

const PAGE_SIZES = [25, 50, 100, 200, 500, 'All']

function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
}

export default function DataTable({
  columns,
  data,
  loading = false,
  defaultPageSize = 25,
  title,
  subtitle,
}) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [page, setPage] = useState(1)

  function handleSort(key, sortable) {
    if (sortable === false) return
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const total = sorted.length
  const effectivePageSize = pageSize === 'All' ? Math.max(total, 1) : Number(pageSize)
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize))
  const currentPage = Math.min(page, totalPages)
  const startIdx = (currentPage - 1) * effectivePageSize
  const pageData = pageSize === 'All' ? sorted : sorted.slice(startIdx, startIdx + effectivePageSize)
  const showingFrom = total === 0 ? 0 : startIdx + 1
  const showingTo = Math.min(startIdx + effectivePageSize, total)

  function goTo(p) { setPage(Math.max(1, Math.min(p, totalPages))) }

  const pageNumbers = useMemo(() => {
    const pages = []
    const range = 2
    const start = Math.max(1, currentPage - range)
    const end = Math.min(totalPages, currentPage + range)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }, [currentPage, totalPages])

  const thBase = 'px-4 py-3 text-left text-xs font-semibold tracking-wider select-none whitespace-nowrap'
  const tdBase = 'px-4 py-3 text-sm'

  if (loading) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200">
        {(title || subtitle) && (
          <div className="px-5 py-4 border-b border-gray-100 bg-white">
            {title && <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />}
            {subtitle && <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mt-1.5" />}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map((col) => (
                  <th key={col.key} className={`${thBase} text-gray-500 bg-gray-50`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {[...Array(6)].map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className={tdBase}>
                      <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200">
        {(title || subtitle) && (
          <div className="px-5 py-4 border-b border-gray-100 bg-white">
            {title && <p className="text-base font-semibold text-gray-800">{title}</p>}
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map((col) => (
                  <th key={col.key} className={`${thBase} text-gray-500`}>{col.label}</th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div className="flex flex-col items-center justify-center py-16 bg-white gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <TableProperties className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">No records found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {(title || subtitle) && (
        <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
          <div>
            {title && <p className="text-base font-semibold text-gray-800">{title}</p>}
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
            {total} record{total !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              {columns.map((col) => {
                const isSortable = col.sortable !== false
                const isActive = sortKey === col.key
                const align = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                return (
                  <th
                    key={col.key}
                    className={`${thBase} ${align} ${
                      isSortable ? 'cursor-pointer group hover:bg-blue-50 transition-colors' : ''
                    } ${isActive ? 'text-blue-700 bg-blue-50/60' : 'text-gray-500'}`}
                    onClick={() => handleSort(col.key, col.sortable)}
                  >
                    <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                      {col.label}
                      {isSortable && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {pageData.map((row, i) => (
              <tr
                key={row._id || i}
                className="hover:bg-blue-50/30 transition-colors duration-100 group"
              >
                {columns.map((col) => {
                  const align = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  return (
                    <td key={col.key} className={`${tdBase} ${align} text-gray-700`}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-white border-t border-gray-100">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>
            {total === 0 ? 'No records' : `Showing ${showingFrom}–${showingTo} of ${total} record${total !== 1 ? 's' : ''}`}
          </span>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <span>Show</span>
            <select
              value={String(pageSize)}
              onChange={(e) => {
                const v = e.target.value === 'All' ? 'All' : Number(e.target.value)
                setPageSize(v)
                setPage(1)
              }}
              className="border border-gray-200 rounded-md px-2 py-0.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {PAGE_SIZES.map((s) => (
                <option key={String(s)} value={String(s)}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <PagBtn onClick={() => goTo(1)} disabled={currentPage === 1} title="First page">
              <ChevronsLeft className="w-3.5 h-3.5" />
            </PagBtn>
            <PagBtn onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1} title="Previous page">
              <ChevronLeft className="w-3.5 h-3.5" />
            </PagBtn>

            {pageNumbers[0] > 1 && (
              <>
                <PagNum n={1} current={currentPage} onClick={() => goTo(1)} />
                {pageNumbers[0] > 2 && <span className="text-gray-400 px-1 text-xs">…</span>}
              </>
            )}
            {pageNumbers.map((n) => (
              <PagNum key={n} n={n} current={currentPage} onClick={() => goTo(n)} />
            ))}
            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <span className="text-gray-400 px-1 text-xs">…</span>
                )}
                <PagNum n={totalPages} current={currentPage} onClick={() => goTo(totalPages)} />
              </>
            )}

            <PagBtn onClick={() => goTo(currentPage + 1)} disabled={currentPage === totalPages} title="Next page">
              <ChevronRight className="w-3.5 h-3.5" />
            </PagBtn>
            <PagBtn onClick={() => goTo(totalPages)} disabled={currentPage === totalPages} title="Last page">
              <ChevronsRight className="w-3.5 h-3.5" />
            </PagBtn>
          </div>
        )}
      </div>
    </div>
  )
}

function PagBtn({ onClick, disabled, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
    >
      {children}
    </button>
  )
}

function PagNum({ n, current, onClick }) {
  const isActive = n === current
  return (
    <button
      onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
        isActive
          ? 'bg-blue-600 text-white border border-blue-600 shadow-sm'
          : 'border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
      }`}
    >
      {n}
    </button>
  )
}
