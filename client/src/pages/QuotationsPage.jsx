import { useEffect, useState, useCallback } from 'react'
import { Plus, Check, X, ArrowRight, Pencil, Trash2, FileText, Mail, History, CheckCircle, XCircle } from 'lucide-react'
import DataTable from '../components/DataTable'
import { format } from 'date-fns'

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  converted: 'bg-blue-100 text-blue-700',
}

const emptyItem = {
  productId: '', productName: '', productCode: '',
  quantity: 1, unitPrice: 0, taxRate: 18, taxAmount: 0, total: 0,
}

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''
}

async function fetchCompanyInfo() {
  try {
    const res = await fetch('/api/companies/me', { headers: { Authorization: `Bearer ${getToken()}` } })
    const json = await res.json()
    if (json.success) return json.data.company
  } catch { /* ignore */ }
  return null
}

function getImgFormat(dataUrl) {
  if (dataUrl.includes('image/png')) return 'PNG'
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return 'JPEG'
  if (dataUrl.includes('image/webp')) return 'WEBP'
  return 'PNG'
}

async function generatePDF(quotation, company) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const accent = [5, 150, 105]
  const lightBg = [240, 253, 244]

  // ── Header band ──
  doc.setFillColor(...accent)
  doc.rect(0, 0, pageW, 38, 'F')

  let textStartX = 14
  if (company?.logo) {
    try {
      doc.addImage(company.logo, getImgFormat(company.logo), 14, 4, 24, 24)
      textStartX = 42
    } catch { /* ignore */ }
  }

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text((company?.name || 'Your Company').toUpperCase(), textStartX, 15)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(167, 243, 208)
  const companyLines = []
  if (company?.address) companyLines.push(company.address)
  if (company?.phone) companyLines.push(`Ph: ${company.phone}`)
  if (company?.email) companyLines.push(company.email)
  if (company?.gstNumber) companyLines.push(`GSTIN: ${company.gstNumber}`)
  doc.text(companyLines.join('  |  '), textStartX, 23)

  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('QUOTATION', pageW - 14, 15, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(167, 243, 208)
  doc.text(quotation.quotationNumber, pageW - 14, 22, { align: 'right' })

  const statusColorMap = {
    approved: [16, 185, 129],
    rejected: [239, 68, 68],
    pending: [245, 158, 11],
    draft: [100, 116, 139],
    converted: [59, 130, 246],
  }
  const statusColor = statusColorMap[quotation.status] || [100, 116, 139]
  doc.setFillColor(...statusColor)
  doc.roundedRect(pageW - 50, 26, 36, 8, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(quotation.status.toUpperCase(), pageW - 32, 31.5, { align: 'center' })

  // ── Info section ──
  const infoY = 46
  doc.setFillColor(...lightBg)
  doc.roundedRect(14, infoY, 90, 32, 2, 2, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...accent)
  doc.text('QUOTE FOR', 18, infoY + 7)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(quotation.customerName, 18, infoY + 14)

  doc.setFillColor(...lightBg)
  doc.roundedRect(pageW - 104, infoY, 90, 32, 2, 2, 'F')
  const detailX = pageW - 100
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...accent)
  doc.text('QUOTATION DETAILS', detailX, infoY + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text('Quotation #:', detailX, infoY + 14)
  doc.setFont('helvetica', 'bold')
  doc.text(quotation.quotationNumber, detailX + 28, infoY + 14)
  doc.setFont('helvetica', 'normal')
  doc.text('Date:', detailX, infoY + 20)
  doc.setFont('helvetica', 'bold')
  doc.text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), detailX + 28, infoY + 20)
  if (quotation.validUntil) {
    doc.setFont('helvetica', 'normal')
    doc.text('Valid Until:', detailX, infoY + 26)
    doc.setFont('helvetica', 'bold')
    doc.text(new Date(quotation.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), detailX + 28, infoY + 26)
  }

  // ── Items Table ──
  const tableStartY = infoY + 38
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    head: [['#', 'Product', 'HSN/Code', 'Qty', 'Unit Price', 'Tax %', 'Tax Amt', 'Total']],
    body: quotation.items.map((item, i) => [
      i + 1,
      item.productName,
      item.productCode || '-',
      item.quantity,
      `₹${item.unitPrice.toLocaleString('en-IN')}`,
      `${item.taxRate}%`,
      `₹${item.taxAmount.toFixed(2)}`,
      `₹${item.total.toFixed(2)}`,
    ]),
    headStyles: { fillColor: accent, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', cellPadding: 4 },
    bodyStyles: { fontSize: 8.5, cellPadding: 3.5, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
  })

  const finalY = doc.lastAutoTable.finalY + 6
  const totalsX = pageW - 80
  doc.setFillColor(...lightBg)
  doc.roundedRect(totalsX - 6, finalY, 82, 38, 2, 2, 'F')

  const subtotal = quotation.subtotal || (quotation.grandTotal - (quotation.taxTotal || 0))
  const taxTotal = quotation.taxTotal || quotation.items.reduce((s, i) => s + i.taxAmount, 0)
  const cgst = taxTotal / 2
  const sgst = taxTotal / 2

  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)
  const labelX = totalsX
  const valueX = pageW - 16
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', labelX, finalY + 8)
  doc.text(`₹${subtotal.toFixed(2)}`, valueX, finalY + 8, { align: 'right' })
  doc.text('CGST:', labelX, finalY + 15)
  doc.text(`₹${cgst.toFixed(2)}`, valueX, finalY + 15, { align: 'right' })
  doc.text('SGST:', labelX, finalY + 22)
  doc.text(`₹${sgst.toFixed(2)}`, valueX, finalY + 22, { align: 'right' })
  doc.setDrawColor(...accent)
  doc.setLineWidth(0.5)
  doc.line(totalsX - 4, finalY + 26, pageW - 14, finalY + 26)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...accent)
  doc.text('GRAND TOTAL:', labelX, finalY + 34)
  doc.text(`₹${quotation.grandTotal?.toFixed(2) || '0.00'}`, valueX, finalY + 34, { align: 'right' })

  if (quotation.notes) {
    const notesY = finalY + 46
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('Notes:', 14, notesY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(quotation.notes, 14, notesY + 6)
  }

  // ── Authorized Signatory ──
  const footerY = pageH - 16
  const sigAreaY = footerY - 28
  if (company?.signature) {
    try {
      doc.addImage(company.signature, getImgFormat(company.signature), 14, sigAreaY, 50, 16)
    } catch { /* ignore */ }
  }
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(14, sigAreaY + 18, 70, sigAreaY + 18)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text(`For ${company?.name || ''}`, 14, sigAreaY + 22)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Authorized Signatory', 14, sigAreaY + 26)

  doc.setFillColor(...accent)
  doc.rect(0, footerY, pageW, 16, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(167, 243, 208)
  doc.text('This quotation is valid for the period mentioned above. Prices subject to change after validity.', pageW / 2, footerY + 6, { align: 'center' })
  doc.text('Generated by Nexora ERP  •  This is a computer-generated document.', pageW / 2, footerY + 11, { align: 'center' })

  return doc
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState([])
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState('')
  const [company, setCompany] = useState(null)
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    notes: '',
    validUntil: '',
    items: [{ ...emptyItem }],
  })

  // Email modal state
  const [emailModal, setEmailModal] = useState({ open: false, quotation: null })
  const [emailTab, setEmailTab] = useState('compose')
  const [emailTo, setEmailTo] = useState('')
  const [emailCc, setEmailCc] = useState('')
  const [emailBcc, setEmailBcc] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailMsg, setEmailMsg] = useState(null)
  const [emailHistory, setEmailHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/quotations', { headers: { Authorization: `Bearer ${getToken()}` } })
      const json = await res.json()
      if (json.success) setQuotations(json.data.quotations)
    } finally {
      setLoading(false)
    }
  }, [])

  async function fetchCustomersAndProducts() {
    const [cRes, pRes] = await Promise.all([
      fetch('/api/customers', { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch('/api/products?status=approved', { headers: { Authorization: `Bearer ${getToken()}` } }),
    ])
    const cJson = await cRes.json()
    const pJson = await pRes.json()
    if (cJson.success) setCustomers(cJson.data.customers)
    if (pJson.success) setProducts(pJson.data.products)
  }

  useEffect(() => {
    fetchAll()
    fetchCustomersAndProducts()
    fetchCompanyInfo().then(setCompany)
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try { setUserRole(JSON.parse(userStr).role || '') } catch { /* ignore */ }
    }
  }, [fetchAll])

  function openAdd() {
    setEditingQuotation(null)
    setForm({ customerId: '', customerName: '', notes: '', validUntil: '', items: [{ ...emptyItem }] })
    setError('')
    setShowForm(true)
  }

  function openEdit(q) {
    setEditingQuotation(q)
    const matchedCustomer = customers.find(c => c.companyName === q.customerName)
    setForm({
      customerId: matchedCustomer?._id || '',
      customerName: q.customerName,
      notes: q.notes || '',
      validUntil: q.validUntil ? format(new Date(q.validUntil), 'yyyy-MM-dd') : '',
      items: q.items.length > 0 ? q.items.map(item => ({ ...item })) : [{ ...emptyItem }],
    })
    setError('')
    setShowForm(true)
  }

  function updateItem(index, field, value) {
    const items = [...form.items]
    const item = { ...items[index], [field]: value }
    if (field === 'productId') {
      const product = products.find((p) => p._id === value)
      if (product) {
        item.productName = product.name
        item.productCode = product.code
        item.unitPrice = product.basePrice
        item.taxRate = product.taxRate
      }
    }
    const lineTotal = Number(item.quantity) * Number(item.unitPrice)
    item.taxAmount = (lineTotal * Number(item.taxRate)) / 100
    item.total = lineTotal + item.taxAmount
    items[index] = item
    setForm({ ...form, items })
  }

  function addItem() { setForm({ ...form, items: [...form.items, { ...emptyItem }] }) }
  function removeItem(index) { setForm({ ...form, items: form.items.filter((_, i) => i !== index) }) }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const customer = customers.find((c) => c._id === form.customerId)
      const customerName = customer?.companyName || form.customerName || ''
      const url = editingQuotation ? `/api/quotations/${editingQuotation._id}` : '/api/quotations'
      const method = editingQuotation ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, customerName }),
      })
      const json = await res.json()
      if (json.success) {
        setShowForm(false)
        setEditingQuotation(null)
        fetchAll()
      } else {
        setError(json.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApprove(id, action) {
    const res = await fetch(`/api/quotations/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    if (json.success) fetchAll()
    else alert(json.message)
  }

  async function handleConvert(id) {
    if (!confirm('Convert this quotation to invoice?')) return
    const res = await fetch(`/api/quotations/${id}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({}),
    })
    const json = await res.json()
    if (json.success) {
      alert(`Invoice ${json.data.invoice.invoiceNumber} created successfully!`)
      fetchAll()
    } else {
      alert(json.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this quotation?')) return
    const res = await fetch(`/api/quotations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } })
    const json = await res.json()
    if (json.success) fetchAll()
    else alert(json.message)
  }

  async function handleDownloadPDF(quotation) {
    try {
      const info = company || await fetchCompanyInfo()
      const doc = await generatePDF(quotation, info)
      doc.save(`${quotation.quotationNumber}.pdf`)
    } catch {
      alert('Failed to generate PDF')
    }
  }

  function openEmailModal(q) {
    setEmailModal({ open: true, quotation: q })
    setEmailTab('compose')
    setEmailTo('')
    setEmailCc('')
    setEmailBcc('')
    setEmailSubject(`Quotation ${q.quotationNumber} from ${company?.name || 'Us'}`)
    setEmailMessage(`Dear ${q.customerName},\n\nPlease find attached your quotation ${q.quotationNumber} for ₹${q.grandTotal?.toLocaleString('en-IN')}.\n\nThis quotation is valid until ${q.validUntil ? format(new Date(q.validUntil), 'dd MMM yyyy') : 'the mentioned date'}.\n\nThank you.`)
    setEmailMsg(null)
    setEmailHistory([])
  }

  async function fetchEmailHistory(quotationNumber) {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/emails?documentType=quotation&search=${quotationNumber}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const json = await res.json()
      if (json.success) setEmailHistory(json.data.logs)
    } finally {
      setHistoryLoading(false)
    }
  }

  function switchToHistory() {
    setEmailTab('history')
    if (emailModal.quotation) fetchEmailHistory(emailModal.quotation.quotationNumber)
  }

  async function handleSendEmail() {
    if (!emailModal.quotation) return
    const toList = emailTo.split(',').map((e) => e.trim()).filter((e) => e.includes('@'))
    const ccList = emailCc.split(',').map((e) => e.trim()).filter((e) => e.includes('@'))
    const bccList = emailBcc.split(',').map((e) => e.trim()).filter((e) => e.includes('@'))
    if (toList.length === 0) {
      setEmailMsg({ type: 'error', text: 'Please enter at least one valid To email address' })
      return
    }
    setSendingEmail(true)
    setEmailMsg(null)
    try {
      const info = company || await fetchCompanyInfo()
      const doc = await generatePDF(emailModal.quotation, info)
      const pdfBase64 = doc.output('datauristring').split(',')[1]
      const res = await fetch(`/api/quotations/${emailModal.quotation._id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ emails: toList, cc: ccList, bcc: bccList, subject: emailSubject, message: emailMessage, pdfBase64 }),
      })
      const json = await res.json()
      setEmailMsg({ type: json.success ? 'success' : 'error', text: json.message })
    } catch {
      setEmailMsg({ type: 'error', text: 'Failed to send email' })
    } finally {
      setSendingEmail(false)
    }
  }

  const canApprove = ['admin', 'super_admin', 'manager'].includes(userRole)

  const columns = [
    { key: 'quotationNumber', label: 'Quotation #' },
    { key: 'customerName', label: 'Customer' },
    {
      key: 'grandTotal',
      label: 'Total',
      render: (v) => <span className="font-semibold">₹{Number(v).toLocaleString('en-IN')}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[v] || ''}`}>
          {v}
        </span>
      ),
    },
    {
      key: 'validUntil',
      label: 'Valid Until',
      render: (v) => v ? format(new Date(v), 'dd MMM yyyy') : <span className="text-gray-400">—</span>,
    },
    {
      key: '_id',
      label: 'Actions',
      sortable: false,
      render: (id, q) => (
        <div className="flex items-center gap-1">
          {['draft', 'pending'].includes(q.status) && (
            <button onClick={() => openEdit(q)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {canApprove && ['draft', 'pending'].includes(q.status) && (
            <>
              <button onClick={() => handleApprove(id, 'approve')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Approve">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleApprove(id, 'reject')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition" title="Reject">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {q.status === 'approved' && (
            <button onClick={() => handleConvert(id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Convert to Invoice">
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => handleDownloadPDF(q)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition" title="Download PDF">
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => openEmailModal(q)} className="p-1.5 text-violet-500 hover:bg-violet-50 rounded-lg transition" title="Send Email">
            <Mail className="w-3.5 h-3.5" />
          </button>
          {['draft', 'pending'].includes(q.status) && (
            <button onClick={() => handleDelete(id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ]

  const totals = form.items.reduce(
    (acc, item) => ({ subtotal: acc.subtotal + item.quantity * item.unitPrice, tax: acc.tax + item.taxAmount, grand: acc.grand + item.total }),
    { subtotal: 0, tax: 0, grand: 0 }
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage sales quotations</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Quotation
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            {editingQuotation ? 'Edit Quotation' : 'Create Quotation'}
          </h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer *</label>
                <select
                  required value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valid Until</label>
                <input
                  type="date" value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
                <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3 min-w-[160px]">Product</th>
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3 w-20">Qty</th>
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3 w-28">Unit Price</th>
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 pr-3 w-20">Tax %</th>
                      <th className="text-left text-xs font-medium text-gray-500 pb-2 w-28">Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((item, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="pr-3 py-2">
                          <select
                            required value={item.productId}
                            onChange={(e) => updateItem(i, 'productId', e.target.value)}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select product</option>
                            {products.map((p) => (
                              <option key={p._id} value={p._id}>{p.code} - {p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="pr-3 py-2">
                          <input type="number" min="1" required value={item.quantity}
                            onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="pr-3 py-2">
                          <input type="number" min="0" step="0.01" required value={item.unitPrice}
                            onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="pr-3 py-2">
                          <input type="number" min="0" max="100" value={item.taxRate}
                            onChange={(e) => updateItem(i, 'taxRate', Number(e.target.value))}
                            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-2 text-gray-700 font-medium">₹{item.total.toFixed(2)}</td>
                        <td className="py-2">
                          {form.items.length > 1 && (
                            <button type="button" onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex justify-end">
                <div className="text-sm space-y-1 text-right bg-gray-50 rounded-lg px-4 py-3">
                  <p className="text-gray-500">Subtotal: <span className="text-gray-800 font-medium">₹{totals.subtotal.toFixed(2)}</span></p>
                  <p className="text-gray-500">Tax: <span className="text-gray-800 font-medium">₹{totals.tax.toFixed(2)}</span></p>
                  <p className="text-gray-700 font-bold text-base">Grand Total: ₹{totals.grand.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
                {submitting ? 'Saving...' : editingQuotation ? 'Update Quotation' : 'Create Quotation'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingQuotation(null) }} className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-5 py-2 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <DataTable columns={columns} data={quotations} loading={loading} />
      </div>

      {/* ── Email Modal ── */}
      {emailModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Send Quotation</h3>
                <p className="text-xs text-gray-400 mt-0.5">{emailModal.quotation?.quotationNumber} · {emailModal.quotation?.customerName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={emailTab === 'compose' ? switchToHistory : () => setEmailTab('compose')}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
                >
                  <History className="w-3.5 h-3.5" />
                  {emailTab === 'compose' ? 'History' : 'Compose'}
                </button>
                <button onClick={() => setEmailModal({ open: false, quotation: null })} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {emailTab === 'compose' ? (
              <div className="p-6 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">To *</label>
                  <input value={emailTo} onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="recipient@example.com, another@example.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">CC</label>
                    <input value={emailCc} onChange={(e) => setEmailCc(e.target.value)} placeholder="cc@example.com"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">BCC</label>
                    <input value={emailBcc} onChange={(e) => setEmailBcc(e.target.value)} placeholder="bcc@example.com"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
                  <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Message</label>
                  <textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} rows={4}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none resize-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <FileText className="w-3.5 h-3.5" />
                  PDF will be attached automatically
                </div>
                {emailMsg && (
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm ${emailMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {emailMsg.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                    {emailMsg.text}
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <button onClick={handleSendEmail} disabled={sendingEmail}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
                  >
                    <Mail className="w-4 h-4" />
                    {sendingEmail ? 'Sending...' : 'Send Email'}
                  </button>
                  <button onClick={() => setEmailModal({ open: false, quotation: null })}
                    className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Email History</h4>
                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : emailHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No emails sent for this quotation yet.</div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {emailHistory.map((log) => (
                      <div key={log._id} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{log.subject}</p>
                            <p className="text-xs text-gray-500 mt-0.5">To: {log.to.join(', ')}</p>
                            {log.cc && log.cc.length > 0 && <p className="text-xs text-gray-400">CC: {log.cc.join(', ')}</p>}
                            <p className="text-xs text-gray-400 mt-1">{format(new Date(log.createdAt), 'dd MMM yyyy, hh:mm a')} · {log.sentByName}</p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
