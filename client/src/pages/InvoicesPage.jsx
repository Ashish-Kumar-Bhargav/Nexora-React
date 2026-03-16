import { useEffect, useState, useCallback } from 'react'
import DataTable from '../components/DataTable'
import { format } from 'date-fns'
import { CheckCircle, XCircle, FileText, Mail, History, X, Plus, Trash2, DollarSign } from 'lucide-react'

const STATUS_STYLES = {
  draft: 'bg-blue-100 text-blue-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
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
    const res = await fetch('/api/companies/me', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
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

async function generatePDF(invoice, company, fieldDefs = []) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const accent = [30, 64, 175]
  const lightBg = [240, 245, 255]

  // ── Header band ──
  doc.setFillColor(...accent)
  doc.rect(0, 0, pageW, 38, 'F')

  const logoX = 14
  let textStartX = 14
  if (company?.logo) {
    try {
      doc.addImage(company.logo, getImgFormat(company.logo), logoX, 4, 24, 24)
      textStartX = 42
    } catch { /* ignore */ }
  }

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text((company?.name || 'Your Company').toUpperCase(), textStartX, 15)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 215, 255)
  const companyLines = []
  if (company?.address) companyLines.push(company.address)
  if (company?.phone) companyLines.push(`Ph: ${company.phone}`)
  if (company?.email) companyLines.push(company.email)
  if (company?.gstNumber) companyLines.push(`GSTIN: ${company.gstNumber}`)
  doc.text(companyLines.join('  |  '), textStartX, 23)

  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('INVOICE', pageW - 14, 15, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 215, 255)
  doc.text(invoice.invoiceNumber, pageW - 14, 22, { align: 'right' })

  const statusColor = invoice.status === 'paid' ? [16, 185, 129] : invoice.status === 'cancelled' ? [239, 68, 68] : [59, 130, 246]
  doc.setFillColor(...statusColor)
  doc.roundedRect(pageW - 45, 26, 31, 8, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(invoice.status.toUpperCase(), pageW - 29.5, 31.5, { align: 'center' })

  // ── Info section ──
  const infoY = 46
  doc.setFillColor(...lightBg)
  doc.roundedRect(14, infoY, 90, 32, 2, 2, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...accent)
  doc.text('BILL TO', 18, infoY + 7)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(invoice.customerName, 18, infoY + 14)

  doc.setFillColor(...lightBg)
  doc.roundedRect(pageW - 104, infoY, 90, 32, 2, 2, 'F')
  const detailX = pageW - 100
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...accent)
  doc.text('INVOICE DETAILS', detailX, infoY + 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text(`Invoice #:`, detailX, infoY + 14)
  doc.setFont('helvetica', 'bold')
  doc.text(invoice.invoiceNumber, detailX + 25, infoY + 14)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date:`, detailX, infoY + 20)
  doc.setFont('helvetica', 'bold')
  doc.text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), detailX + 25, infoY + 20)
  if (invoice.dueDate) {
    doc.setFont('helvetica', 'normal')
    doc.text(`Due Date:`, detailX, infoY + 26)
    doc.setFont('helvetica', 'bold')
    doc.text(new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), detailX + 25, infoY + 26)
  }

  // ── Items Table ──
  const tableStartY = infoY + 38
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 14, right: 14 },
    head: [['#', 'Product', 'HSN/Code', 'Qty', 'Unit Price', 'Tax %', 'Tax Amt', 'Total']],
    body: (invoice.items || []).map((item, i) => [
      i + 1, item.productName, item.productCode || '-', item.quantity,
      `₹${item.unitPrice.toLocaleString('en-IN')}`,
      `${item.taxRate}%`, `₹${item.taxAmount.toFixed(2)}`, `₹${item.total.toFixed(2)}`,
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

  // ── Totals ──
  const totalsX = pageW - 80
  doc.setFillColor(...lightBg)
  doc.roundedRect(totalsX - 6, finalY, 82, 38, 2, 2, 'F')

  const subtotal = invoice.subtotal || (invoice.grandTotal - invoice.taxTotal)
  const taxTotal = invoice.taxTotal || 0
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
  doc.text(`₹${invoice.grandTotal?.toFixed(2) || '0.00'}`, valueX, finalY + 34, { align: 'right' })

  // ── Custom Fields in PDF ──
  const pdfFields = fieldDefs.filter((f) => f.showInPdf)
  if (pdfFields.length > 0 && invoice.customFields) {
    let cfY = finalY + 46
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('Additional Information', 14, cfY)
    cfY += 6
    pdfFields.forEach((field) => {
      const value = invoice.customFields?.[field.fieldKey]
      if (value !== undefined && value !== null && value !== '') {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(71, 85, 105)
        doc.text(`${field.fieldLabel}:`, 14, cfY)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 116, 139)
        doc.text(String(value), 70, cfY)
        cfY += 6
      }
    })
  }

  // ── Notes ──
  if (invoice.notes) {
    const notesY = finalY + (pdfFields.length > 0 ? 46 + pdfFields.length * 6 + 4 : 46)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('Notes:', 14, notesY)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(invoice.notes, 14, notesY + 6)
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

  // ── Footer ──
  doc.setFillColor(...accent)
  doc.rect(0, footerY, pageW, 16, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 215, 255)
  doc.text('Thank you for your business!', pageW / 2, footerY + 6, { align: 'center' })
  doc.text('Generated by Nexora ERP  •  This is a computer-generated document.', pageW / 2, footerY + 11, { align: 'center' })

  return doc
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState(null)

  // Create form state
  const [showForm, setShowForm] = useState(false)
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [customFieldDefs, setCustomFieldDefs] = useState([])
  const [form, setForm] = useState({
    customerId: '',
    customerName: '',
    dueDate: '',
    notes: '',
    items: [{ ...emptyItem }],
    customFields: {},
  })

  // Partial payment modal state
  const [paymentModal, setPaymentModal] = useState({ open: false, invoice: null })
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  // Email modal state
  const [emailModal, setEmailModal] = useState({ open: false, invoice: null })
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

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/invoices', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const json = await res.json()
      if (json.success) setInvoices(json.data.invoices)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
    fetchCompanyInfo().then(setCompany)
  }, [fetchInvoices])

  async function openCreateForm() {
    setFormError('')
    setForm({ customerId: '', customerName: '', dueDate: '', notes: '', items: [{ ...emptyItem }], customFields: {} })
    setShowForm(true)

    const [cRes, pRes, cfRes] = await Promise.all([
      fetch('/api/customers', { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch('/api/products?status=approved', { headers: { Authorization: `Bearer ${getToken()}` } }),
      fetch('/api/custom-fields?module=invoices', { headers: { Authorization: `Bearer ${getToken()}` } }),
    ])
    const [cJson, pJson, cfJson] = await Promise.all([cRes.json(), pRes.json(), cfRes.json()])
    if (cJson.success) setCustomers(cJson.data.customers)
    if (pJson.success) setProducts(pJson.data.products)
    if (cfJson.success) setCustomFieldDefs(cfJson.data.fields)
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

  function setCustomField(key, value) {
    setForm((prev) => ({ ...prev, customFields: { ...prev.customFields, [key]: value } }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      const customer = customers.find((c) => c._id === form.customerId)
      const customerName = customer?.companyName || ''

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          customerId: form.customerId,
          customerName,
          items: form.items,
          dueDate: form.dueDate || undefined,
          notes: form.notes || undefined,
          customFields: form.customFields,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowForm(false)
        fetchInvoices()
      } else {
        setFormError(json.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const totals = form.items.reduce(
    (acc, item) => ({ subtotal: acc.subtotal + item.quantity * item.unitPrice, tax: acc.tax + item.taxAmount, grand: acc.grand + item.total }),
    { subtotal: 0, tax: 0, grand: 0 }
  )

  async function fetchEmailHistory(invoiceNumber) {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/emails?documentType=invoice&search=${invoiceNumber}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const json = await res.json()
      if (json.success) setEmailHistory(json.data.logs)
    } finally {
      setHistoryLoading(false)
    }
  }

  function openEmailModal(invoice) {
    setEmailModal({ open: true, invoice })
    setEmailTab('compose')
    setEmailTo('')
    setEmailCc('')
    setEmailBcc('')
    setEmailSubject(`Invoice ${invoice.invoiceNumber} from ${company?.name || 'Us'}`)
    setEmailMessage(`Dear ${invoice.customerName},\n\nPlease find attached your invoice ${invoice.invoiceNumber} for ₹${invoice.grandTotal?.toLocaleString('en-IN')}.\n\nThank you for your business.`)
    setEmailMsg(null)
    setEmailHistory([])
  }

  function switchToHistory() {
    setEmailTab('history')
    if (emailModal.invoice) fetchEmailHistory(emailModal.invoice.invoiceNumber)
  }

  async function handleStatusChange(id, status) {
    if (!confirm(`${status === 'paid' ? 'Mark as paid' : 'Cancel'} this invoice?`)) return
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status }),
    })
    const json = await res.json()
    if (json.success) fetchInvoices()
    else alert(json.message)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this invoice? This action cannot be undone.')) return
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const json = await res.json()
    if (json.success) fetchInvoices()
    else alert(json.message)
  }

  async function handlePartialPayment() {
    if (!paymentModal.invoice || !paymentAmount) return
    setPaymentSubmitting(true)
    setPaymentError('')
    try {
      const res = await fetch(`/api/invoices/${paymentModal.invoice._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ paymentAmount: Number(paymentAmount) }),
      })
      const json = await res.json()
      if (json.success) {
        setPaymentModal({ open: false, invoice: null })
        setPaymentAmount('')
        fetchInvoices()
      } else {
        setPaymentError(json.message)
      }
    } finally {
      setPaymentSubmitting(false)
    }
  }

  async function handleDownloadPDF(invoice) {
    try {
      const info = company || await fetchCompanyInfo()
      let defs = customFieldDefs
      if (defs.length === 0) {
        const cfRes = await fetch('/api/custom-fields?module=invoices', {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        const cfJson = await cfRes.json()
        if (cfJson.success) defs = cfJson.data.fields
      }
      const doc = await generatePDF(invoice, info, defs)
      doc.save(`${invoice.invoiceNumber}.pdf`)
    } catch {
      alert('Failed to generate PDF')
    }
  }

  async function handleSendEmail() {
    if (!emailModal.invoice) return
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
      let defs = customFieldDefs
      if (defs.length === 0) {
        const cfRes = await fetch('/api/custom-fields?module=invoices', { headers: { Authorization: `Bearer ${getToken()}` } })
        const cfJson = await cfRes.json()
        if (cfJson.success) defs = cfJson.data.fields
      }
      const doc = await generatePDF(emailModal.invoice, info, defs)
      const pdfBase64 = doc.output('datauristring').split(',')[1]

      const res = await fetch(`/api/invoices/${emailModal.invoice._id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ emails: toList, cc: ccList, bcc: bccList, subject: emailSubject, message: emailMessage, pdfBase64 }),
      })
      const json = await res.json()
      if (json.success) {
        setEmailMsg({ type: 'success', text: json.message })
      } else {
        setEmailMsg({ type: 'error', text: json.message })
      }
    } catch {
      setEmailMsg({ type: 'error', text: 'Failed to send email' })
    } finally {
      setSendingEmail(false)
    }
  }

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #' },
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
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[v] || ''}`}>
          {v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </span>
      ),
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (v) => v ? format(new Date(v), 'dd MMM yyyy') : <span className="text-gray-400">—</span>,
    },
    {
      key: '_id',
      label: 'Actions',
      sortable: false,
      render: (id, invoice) => (
        <div className="flex items-center gap-1">
          {(invoice.status === 'draft' || invoice.status === 'partially_paid') && (
            <>
              <button
                onClick={() => handleStatusChange(id, 'paid')}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 hover:bg-emerald-50 rounded-lg transition"
                title="Mark as Fully Paid"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Paid
              </button>
              <button
                onClick={() => { setPaymentModal({ open: true, invoice }); setPaymentAmount(''); setPaymentError('') }}
                className="flex items-center gap-1 text-xs text-yellow-600 hover:text-yellow-700 font-medium px-2 py-1 hover:bg-yellow-50 rounded-lg transition"
                title="Record Partial Payment"
              >
                <DollarSign className="w-3.5 h-3.5" /> Part Pay
              </button>
              <button
                onClick={() => handleStatusChange(id, 'cancelled')}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 hover:bg-red-50 rounded-lg transition"
                title="Cancel"
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel
              </button>
            </>
          )}
          <button
            onClick={() => handleDownloadPDF(invoice)}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition"
            title="Download PDF"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openEmailModal(invoice)}
            className="p-1.5 text-violet-500 hover:bg-violet-50 rounded-lg transition"
            title="Send Email"
          >
            <Mail className="w-3.5 h-3.5" />
          </button>
          {invoice.status !== 'paid' && (
            <button
              onClick={() => handleDelete(id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Delete Invoice"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and track all invoices</p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {['draft', 'partially_paid', 'paid', 'cancelled'].map((status) => {
          const count = invoices.filter((inv) => inv.status === status).length
          return (
            <div key={status} className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full shadow-sm ${STATUS_STYLES[status]}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}: {count}
            </div>
          )
        })}
      </div>

      {/* ── Create Invoice Form ── */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Create Invoice</h2>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 mb-4 text-sm">{formError}</div>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                <input
                  type="date" value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
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

            {/* Line Items */}
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
                              <Trash2 className="w-4 h-4" />
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

            {/* Custom Fields */}
            {customFieldDefs.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Additional Fields</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customFieldDefs.map((field) => (
                    <div key={field.fieldKey}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {field.fieldLabel}{field.required && ' *'}
                      </label>
                      {field.fieldType === 'select' ? (
                        <select
                          required={field.required}
                          value={String(form.customFields[field.fieldKey] || '')}
                          onChange={(e) => setCustomField(field.fieldKey, e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : field.fieldType === 'boolean' ? (
                        <select
                          value={String(form.customFields[field.fieldKey] ?? '')}
                          onChange={(e) => setCustomField(field.fieldKey, e.target.value === 'true')}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : (
                        <input
                          type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                          required={field.required}
                          value={String(form.customFields[field.fieldKey] || '')}
                          onChange={(e) => setCustomField(field.fieldKey, field.fieldType === 'number' ? Number(e.target.value) : e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
                {submitting ? 'Creating...' : 'Create Invoice'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-5 py-2 rounded-lg transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Partial Payment Modal */}
      {paymentModal.open && paymentModal.invoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">Record Payment</h3>
            <p className="text-sm text-gray-500 mb-4">
              {paymentModal.invoice.invoiceNumber} — {paymentModal.invoice.customerName}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Total: ₹{paymentModal.invoice.grandTotal.toLocaleString('en-IN')} ·{' '}
              Paid: ₹{(paymentModal.invoice.paidAmount || 0).toLocaleString('en-IN')} ·{' '}
              Remaining: ₹{(paymentModal.invoice.grandTotal - (paymentModal.invoice.paidAmount || 0)).toLocaleString('en-IN')}
            </p>
            {paymentError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-sm">{paymentError}</div>
            )}
            <input
              type="number" min="0.01" step="0.01"
              max={paymentModal.invoice.grandTotal - (paymentModal.invoice.paidAmount || 0)}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter payment amount"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <button
                onClick={handlePartialPayment}
                disabled={paymentSubmitting || !paymentAmount}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium py-2 rounded-lg transition"
              >
                {paymentSubmitting ? 'Recording...' : 'Record Payment'}
              </button>
              <button
                onClick={() => setPaymentModal({ open: false, invoice: null })}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <DataTable columns={columns} data={invoices} loading={loading} />
      </div>

      {/* ── Email Modal ── */}
      {emailModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Send Invoice</h3>
                <p className="text-xs text-gray-400 mt-0.5">{emailModal.invoice?.invoiceNumber} · {emailModal.invoice?.customerName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={emailTab === 'compose' ? switchToHistory : () => setEmailTab('compose')}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
                >
                  <History className="w-3.5 h-3.5" />
                  {emailTab === 'compose' ? 'History' : 'Compose'}
                </button>
                <button onClick={() => setEmailModal({ open: false, invoice: null })} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
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
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition">
                    <Mail className="w-4 h-4" />
                    {sendingEmail ? 'Sending...' : 'Send Email'}
                  </button>
                  <button onClick={() => setEmailModal({ open: false, invoice: null })}
                    className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
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
                  <div className="text-center py-8 text-gray-400 text-sm">No emails sent for this invoice yet.</div>
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
