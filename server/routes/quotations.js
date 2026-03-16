import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectCompanyDB } from '../lib/mongodb.js'
import { getQuotationModel } from '../models/company/Quotation.js'
import { getInvoiceModel } from '../models/company/Invoice.js'
import { getInventoryModel } from '../models/company/Inventory.js'
import { getActivityLogModel } from '../models/company/ActivityLog.js'
import { getEmailLogModel } from '../models/company/EmailLog.js'
import { ROLE_HIERARCHY, canApprove } from '../lib/permissions.js'
import { sendEmailWithAttachment, buildEmailTemplate } from '../lib/email.js'
import { getCompanySmtpConfig } from '../lib/getSmtpConfig.js'

const router = Router()
router.use(authenticate)

function calcItems(items) {
  let subtotal = 0, taxTotal = 0
  const processed = items.map(item => {
    const lineTotal = item.quantity * item.unitPrice
    const taxAmount = (lineTotal * (item.taxRate || 0)) / 100
    subtotal += lineTotal; taxTotal += taxAmount
    return { ...item, taxAmount, total: lineTotal + taxAmount }
  })
  return { processed, subtotal, taxTotal, grandTotal: subtotal + taxTotal }
}

router.get('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const { status, page = 1, limit = 50 } = req.query
    const companyConn = await connectCompanyDB(req.user.dbName)
    const QuotationModel = getQuotationModel(companyConn)
    const query = {}; if (status) query.status = status
    const [quotations, total] = await Promise.all([
      QuotationModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      QuotationModel.countDocuments(query),
    ])
    return res.json({ success: true, message: 'Quotations retrieved', data: { quotations, total, page: Number(page), limit: Number(limit) } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const { customerId, customerName, items, notes, validUntil, customFields } = req.body
    if (!customerId || !customerName) return res.status(400).json({ success: false, message: 'Customer is required' })
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'At least one item is required' })

    const { processed, subtotal, taxTotal, grandTotal } = calcItems(items)
    const companyConn = await connectCompanyDB(req.user.dbName)
    const QuotationModel = getQuotationModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)

    const quotation = await QuotationModel.create({
      customerId, customerName, items: processed, subtotal, taxTotal, grandTotal, notes,
      validUntil: validUntil ? new Date(validUntil) : undefined, customFields: customFields || {},
      status: 'draft', createdBy: req.user.userId, createdByName: req.user.name || req.user.email,
    })
    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'CREATE', module: 'quotations', details: { quotationNumber: quotation.quotationNumber, customerName } })
    return res.status(201).json({ success: true, message: 'Quotation created', data: { quotation } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const QuotationModel = getQuotationModel(companyConn)
    const quotation = await QuotationModel.findById(req.params.id).lean()
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' })
    return res.json({ success: true, message: 'Quotation retrieved', data: { quotation } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const QuotationModel = getQuotationModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)
    const { items, notes, validUntil, customerId, customerName } = req.body

    const quotation = await QuotationModel.findById(req.params.id)
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' })
    if (['approved', 'converted'].includes(quotation.status)) return res.status(400).json({ success: false, message: 'Cannot edit an approved or converted quotation' })

    const updates = {}
    if (notes !== undefined) updates.notes = notes
    if (validUntil !== undefined) updates.validUntil = new Date(validUntil)
    if (customerId !== undefined) updates.customerId = customerId
    if (customerName !== undefined) updates.customerName = customerName
    if (items && items.length > 0) {
      const { processed, subtotal, taxTotal, grandTotal } = calcItems(items)
      updates.items = processed; updates.subtotal = subtotal; updates.taxTotal = taxTotal; updates.grandTotal = grandTotal
    }

    const updated = await QuotationModel.findByIdAndUpdate(req.params.id, updates, { new: true })
    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'UPDATE', module: 'quotations', details: { quotationId: req.params.id } })
    return res.json({ success: true, message: 'Quotation updated', data: { quotation: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required to delete quotations' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const QuotationModel = getQuotationModel(companyConn)
    const quotation = await QuotationModel.findById(req.params.id)
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' })
    if (quotation.status === 'converted') return res.status(400).json({ success: false, message: 'Cannot delete a converted quotation' })
    await QuotationModel.findByIdAndDelete(req.params.id)
    return res.json({ success: true, message: 'Quotation deleted' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/quotations/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    if (!canApprove(req.user.role)) return res.status(403).json({ success: false, message: 'You do not have permission to approve quotations' })
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const { action, notes } = req.body
    if (!action || !['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject"' })

    const companyConn = await connectCompanyDB(req.user.dbName)
    const QuotationModel = getQuotationModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)
    const InventoryModel = getInventoryModel(companyConn)

    const quotation = await QuotationModel.findById(req.params.id)
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' })
    if (!['draft', 'pending'].includes(quotation.status)) return res.status(400).json({ success: false, message: 'Quotation cannot be approved in its current state' })

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updated = await QuotationModel.findByIdAndUpdate(req.params.id, {
      status: newStatus, approvedBy: req.user.userId, approvedByName: req.user.name || req.user.email,
      notes: notes || quotation.notes,
    }, { new: true })

    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'APPROVE', module: 'quotations', details: { quotationId: req.params.id, action: newStatus, notes } })

    if (newStatus === 'approved') {
      for (const item of quotation.items) {
        if (!item.productId) continue
        const lastRecord = await InventoryModel.findOne({ productId: item.productId }).sort({ createdAt: -1 })
        const previousStock = lastRecord?.currentStock ?? 0
        if (previousStock > 0) {
          const reserveQty = Math.min(item.quantity, previousStock)
          await InventoryModel.create({
            productId: item.productId, productName: item.productName, productCode: item.productCode || '',
            type: 'stock_out', quantity: reserveQty, previousStock, currentStock: previousStock - reserveQty,
            reference: quotation.quotationNumber, notes: 'Reserved on quotation approval',
            createdBy: req.user.userId, createdByName: req.user.name || req.user.email,
          })
        }
      }
    }

    return res.json({ success: true, message: `Quotation ${newStatus}`, data: { quotation: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/quotations/:id/convert
router.post('/:id/convert', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required to convert quotations' })

    const companyConn = await connectCompanyDB(req.user.dbName)
    const QuotationModel = getQuotationModel(companyConn)
    const InvoiceModel = getInvoiceModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)

    const quotation = await QuotationModel.findById(req.params.id)
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' })
    if (quotation.status !== 'approved') return res.status(400).json({ success: false, message: 'Only approved quotations can be converted to invoice' })

    const { dueDate } = req.body || {}
    const invoice = await InvoiceModel.create({
      quotationId: quotation._id, customerId: quotation.customerId, customerName: quotation.customerName,
      items: quotation.items, subtotal: quotation.subtotal, taxTotal: quotation.taxTotal, grandTotal: quotation.grandTotal,
      status: 'draft', dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: req.user.userId, createdByName: req.user.name || req.user.email,
    })
    await QuotationModel.findByIdAndUpdate(req.params.id, { status: 'converted' })
    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'CREATE', module: 'invoices', details: { invoiceNumber: invoice.invoiceNumber, fromQuotation: quotation.quotationNumber } })

    return res.json({ success: true, message: 'Quotation converted to invoice', data: { invoice } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/quotations/:id/email
router.post('/:id/email', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company database' })
    const { emails, cc, bcc, subject, message, pdfBase64 } = req.body
    const toEmails = (Array.isArray(emails) ? emails : []).map(e => e.trim()).filter(e => e.includes('@'))
    const ccEmails = (Array.isArray(cc) ? cc : []).map(e => e.trim()).filter(e => e.includes('@'))
    const bccEmails = (Array.isArray(bcc) ? bcc : []).map(e => e.trim()).filter(e => e.includes('@'))
    if (toEmails.length === 0) return res.status(400).json({ success: false, message: 'At least one valid To email is required' })

    const companyConn = await connectCompanyDB(req.user.dbName)
    const QuotationModel = getQuotationModel(companyConn)
    const EmailLogModel = getEmailLogModel(companyConn)
    const quotation = await QuotationModel.findById(req.params.id).lean()
    if (!quotation) return res.status(404).json({ success: false, message: 'Quotation not found' })

    const emailSubject = subject || `Quotation ${quotation.quotationNumber} from ${req.user.companyName}`
    const htmlBody = buildEmailTemplate({
      title: 'QUOTATION', documentNumber: quotation.quotationNumber, customerName: quotation.customerName,
      companyName: req.user.companyName || 'SmartBilling', message,
      details: [
        { label: 'Quotation Number', value: quotation.quotationNumber },
        { label: 'Total Amount', value: `₹${quotation.grandTotal?.toLocaleString('en-IN')}` },
        ...(quotation.validUntil ? [{ label: 'Valid Until', value: new Date(quotation.validUntil).toLocaleDateString('en-IN') }] : []),
        { label: 'Status', value: quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1) },
      ],
    })
    const attachments = pdfBase64 ? [{ filename: `${quotation.quotationNumber}.pdf`, content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }] : []
    const smtpConfig = await getCompanySmtpConfig(req.user.companyId)
    let emailStatus = 'sent', emailError
    try { await sendEmailWithAttachment({ to: toEmails, cc: ccEmails, bcc: bccEmails, subject: emailSubject, html: htmlBody, attachments, smtpConfig }) }
    catch (err) { emailStatus = 'failed'; emailError = err.message }

    await EmailLogModel.create({
      documentType: 'quotation', documentId: quotation._id, documentNumber: quotation.quotationNumber,
      to: toEmails, cc: ccEmails, bcc: bccEmails, subject: emailSubject, message: message || '',
      sentBy: req.user.userId, sentByName: req.user.name || req.user.email, status: emailStatus, error: emailError,
    })
    if (emailStatus === 'failed') return res.status(500).json({ success: false, message: `Failed to send email: ${emailError}` })
    return res.json({ success: true, message: `Email sent successfully to ${toEmails.join(', ')}` })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
