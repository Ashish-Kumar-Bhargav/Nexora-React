import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectCompanyDB } from '../lib/mongodb.js'
import { getInvoiceModel } from '../models/company/Invoice.js'
import { getInventoryModel } from '../models/company/Inventory.js'
import { getActivityLogModel } from '../models/company/ActivityLog.js'
import { ROLE_HIERARCHY } from '../lib/permissions.js'

const router = Router()

router.use(authenticate)

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const { status, page = 1, limit = 50 } = req.query
    const companyConn = await connectCompanyDB(req.user.dbName)
    const InvoiceModel = getInvoiceModel(companyConn)
    const query = {}
    if (status) query.status = status
    const [invoices, total] = await Promise.all([
      InvoiceModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit))
        .select('invoiceNumber customerName grandTotal subtotal taxTotal paidAmount status dueDate paidAt notes createdByName customFields items createdAt').lean(),
      InvoiceModel.countDocuments(query),
    ])
    return res.json({ success: true, message: 'Invoices retrieved', data: { invoices, total, page: Number(page), limit: Number(limit) } })
  } catch (err) {
    return res.status(err.message?.includes('token') ? 401 : 500).json({ success: false, message: err.message })
  }
})

// POST /api/invoices
router.post('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const { customerId, customerName, items, dueDate, notes, customFields } = req.body
    if (!customerId || !customerName) return res.status(400).json({ success: false, message: 'Customer is required' })
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'At least one item is required' })

    const companyConn = await connectCompanyDB(req.user.dbName)
    const InvoiceModel = getInvoiceModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)

    let subtotal = 0, taxTotal = 0
    const processedItems = items.map(item => {
      const lineTotal = item.quantity * item.unitPrice
      const taxAmount = (lineTotal * (item.taxRate || 0)) / 100
      subtotal += lineTotal; taxTotal += taxAmount
      return { ...item, taxAmount, total: lineTotal + taxAmount }
    })

    const invoice = await InvoiceModel.create({
      customerId, customerName, items: processedItems, subtotal, taxTotal,
      grandTotal: subtotal + taxTotal, status: 'draft',
      dueDate: dueDate ? new Date(dueDate) : undefined, notes: notes || undefined,
      customFields: customFields || {}, createdBy: req.user.userId,
      createdByName: req.user.name || req.user.email,
    })

    await ActivityLogModel.create({
      userId: req.user.userId, userName: req.user.name || req.user.email,
      action: 'CREATE', module: 'invoices',
      details: { invoiceNumber: invoice.invoiceNumber, customerName },
    })

    return res.status(201).json({ success: true, message: 'Invoice created', data: { invoice } })
  } catch (err) {
    console.error('Create invoice error:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const InvoiceModel = getInvoiceModel(companyConn)
    const invoice = await InvoiceModel.findById(req.params.id).lean()
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' })
    return res.json({ success: true, message: 'Invoice retrieved', data: { invoice } })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/invoices/:id
router.put('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) {
      return res.status(403).json({ success: false, message: 'Manager access required to update invoices' })
    }
    const companyConn = await connectCompanyDB(req.user.dbName)
    const InvoiceModel = getInvoiceModel(companyConn)
    const InventoryModel = getInventoryModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)
    const { status: newStatus, dueDate, paidAt, paymentAmount } = req.body

    const invoice = await InvoiceModel.findById(req.params.id)
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' })
    if (invoice.status === 'cancelled') return res.status(400).json({ success: false, message: 'Cannot update a cancelled invoice' })

    const updates = {}
    let becameFullyPaid = false

    if (paymentAmount !== undefined && Number(paymentAmount) > 0) {
      const newPaid = (invoice.paidAmount || 0) + Number(paymentAmount)
      const capped = Math.min(newPaid, invoice.grandTotal)
      updates.paidAmount = capped
      if (capped >= invoice.grandTotal) { updates.status = 'paid'; updates.paidAt = new Date(); becameFullyPaid = true }
      else updates.status = 'partially_paid'
    } else if (newStatus && ['draft', 'partially_paid', 'paid', 'cancelled'].includes(newStatus)) {
      updates.status = newStatus
      if (newStatus === 'paid') { updates.paidAmount = invoice.grandTotal; updates.paidAt = paidAt ? new Date(paidAt) : new Date(); becameFullyPaid = true }
      else if (newStatus === 'draft') updates.paidAmount = 0
    }
    if (dueDate) updates.dueDate = new Date(dueDate)

    const updated = await InvoiceModel.findByIdAndUpdate(req.params.id, updates, { new: true })

    if (becameFullyPaid && invoice.status !== 'paid') {
      for (const item of invoice.items) {
        if (!item.productId) continue
        const lastRecord = await InventoryModel.findOne({ productId: item.productId }).sort({ createdAt: -1 })
        const previousStock = lastRecord ? lastRecord.currentStock : 0
        if (previousStock >= item.quantity) {
          await InventoryModel.create({
            productId: item.productId, productName: item.productName, productCode: item.productCode || '',
            type: 'stock_out', quantity: item.quantity, previousStock, currentStock: previousStock - item.quantity,
            reference: invoice.invoiceNumber, notes: 'Auto deducted on invoice payment',
            createdBy: req.user.userId, createdByName: req.user.name || req.user.email,
          })
        }
      }
    }

    await ActivityLogModel.create({
      userId: req.user.userId, userName: req.user.name || req.user.email,
      action: 'UPDATE', module: 'invoices', details: { invoiceId: req.params.id, newStatus },
    })

    return res.json({ success: true, message: 'Invoice updated', data: { invoice: updated } })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) {
      return res.status(403).json({ success: false, message: 'Admin access required to delete invoices' })
    }
    const companyConn = await connectCompanyDB(req.user.dbName)
    const InvoiceModel = getInvoiceModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)

    const invoice = await InvoiceModel.findById(req.params.id)
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' })
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Cannot delete a paid invoice' })

    await InvoiceModel.findByIdAndDelete(req.params.id)
    await ActivityLogModel.create({
      userId: req.user.userId, userName: req.user.name || req.user.email,
      action: 'DELETE', module: 'invoices', details: { invoiceId: req.params.id, invoiceNumber: invoice.invoiceNumber },
    })

    return res.json({ success: true, message: 'Invoice deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/invoices/:id/email
import { sendEmailWithAttachment, buildEmailTemplate } from '../lib/email.js'
import { getEmailLogModel } from '../models/company/EmailLog.js'
import { getCompanySmtpConfig } from '../lib/getSmtpConfig.js'

router.post('/:id/email', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company database' })
    const { emails, cc, bcc, subject, message, pdfBase64 } = req.body
    const toEmails = (Array.isArray(emails) ? emails : []).map(e => e.trim()).filter(e => e.includes('@'))
    const ccEmails = (Array.isArray(cc) ? cc : []).map(e => e.trim()).filter(e => e.includes('@'))
    const bccEmails = (Array.isArray(bcc) ? bcc : []).map(e => e.trim()).filter(e => e.includes('@'))
    if (toEmails.length === 0) return res.status(400).json({ success: false, message: 'At least one valid To email is required' })

    const companyConn = await connectCompanyDB(req.user.dbName)
    const InvoiceModel = getInvoiceModel(companyConn)
    const EmailLogModel = getEmailLogModel(companyConn)
    const invoice = await InvoiceModel.findById(req.params.id).lean()
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' })

    const emailSubject = subject || `Invoice ${invoice.invoiceNumber} from ${req.user.companyName}`
    const htmlBody = buildEmailTemplate({
      title: 'INVOICE', documentNumber: invoice.invoiceNumber, customerName: invoice.customerName,
      companyName: req.user.companyName || 'SmartBilling', message,
      details: [
        { label: 'Invoice Number', value: invoice.invoiceNumber },
        { label: 'Total Amount', value: `₹${invoice.grandTotal?.toLocaleString('en-IN')}` },
        ...(invoice.dueDate ? [{ label: 'Due Date', value: new Date(invoice.dueDate).toLocaleDateString('en-IN') }] : []),
        { label: 'Status', value: invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) },
      ],
    })
    const attachments = pdfBase64 ? [{ filename: `${invoice.invoiceNumber}.pdf`, content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }] : []
    const smtpConfig = await getCompanySmtpConfig(req.user.companyId)
    let emailStatus = 'sent', emailError
    try {
      await sendEmailWithAttachment({ to: toEmails, cc: ccEmails, bcc: bccEmails, subject: emailSubject, html: htmlBody, attachments, smtpConfig })
    } catch (err) { emailStatus = 'failed'; emailError = err.message }

    await EmailLogModel.create({
      documentType: 'invoice', documentId: invoice._id, documentNumber: invoice.invoiceNumber,
      to: toEmails, cc: ccEmails, bcc: bccEmails, subject: emailSubject, message: message || '',
      sentBy: req.user.userId, sentByName: req.user.name || req.user.email,
      status: emailStatus, error: emailError,
    })

    if (emailStatus === 'failed') return res.status(500).json({ success: false, message: `Failed to send email: ${emailError}` })
    return res.json({ success: true, message: `Email sent successfully to ${toEmails.join(', ')}` })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

export default router
