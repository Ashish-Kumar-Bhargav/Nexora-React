import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectCompanyDB } from '../lib/mongodb.js'
import { getCreditNoteModel } from '../models/company/CreditNote.js'
import { getInvoiceModel } from '../models/company/Invoice.js'
import { getActivityLogModel } from '../models/company/ActivityLog.js'
import { ROLE_HIERARCHY } from '../lib/permissions.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const { status, page = 1, limit = 50 } = req.query
    const companyConn = await connectCompanyDB(req.user.dbName)
    const CreditNoteModel = getCreditNoteModel(companyConn)
    const query = {}; if (status) query.status = status
    const [creditNotes, total] = await Promise.all([
      CreditNoteModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      CreditNoteModel.countDocuments(query),
    ])
    return res.json({ success: true, data: { creditNotes, total, page: Number(page), limit: Number(limit) } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required' })
    const { invoiceId, amount, reason, notes } = req.body
    if (!invoiceId || !amount || !reason) return res.status(400).json({ success: false, message: 'invoiceId, amount, and reason are required' })

    const companyConn = await connectCompanyDB(req.user.dbName)
    const CreditNoteModel = getCreditNoteModel(companyConn)
    const InvoiceModel = getInvoiceModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)

    const invoice = await InvoiceModel.findById(invoiceId).lean()
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' })
    if (invoice.status !== 'paid' && invoice.status !== 'partially_paid') return res.status(400).json({ success: false, message: 'Credit notes can only be issued for paid invoices' })
    if (Number(amount) > invoice.grandTotal) return res.status(400).json({ success: false, message: 'Credit note amount cannot exceed invoice total' })

    const cn = await CreditNoteModel.create({
      invoiceId, invoiceNumber: invoice.invoiceNumber, customerId: invoice.customerId,
      customerName: invoice.customerName, amount: Number(amount), reason, notes,
      currency: invoice.currency || 'INR', createdBy: req.user.userId, createdByName: req.user.name || req.user.email,
    })
    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'CREATE', module: 'credit-notes', details: { creditNoteNumber: cn.creditNoteNumber, invoiceNumber: invoice.invoiceNumber, amount } })
    return res.status(201).json({ success: true, message: 'Credit note created', data: { creditNote: cn } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const CreditNoteModel = getCreditNoteModel(companyConn)
    const { status } = req.body
    const updates = {}
    if (status && ['draft', 'issued', 'applied'].includes(status)) { updates.status = status; if (status === 'issued') updates.issuedAt = new Date() }
    const updated = await CreditNoteModel.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!updated) return res.status(404).json({ success: false, message: 'Credit note not found' })
    return res.json({ success: true, message: 'Credit note updated', data: { creditNote: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const CreditNoteModel = getCreditNoteModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)
    const cn = await CreditNoteModel.findById(req.params.id)
    if (!cn) return res.status(404).json({ success: false, message: 'Credit note not found' })
    if (cn.status === 'applied') return res.status(400).json({ success: false, message: 'Cannot delete an applied credit note' })
    await CreditNoteModel.findByIdAndDelete(req.params.id)
    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'DELETE', module: 'credit-notes', details: { creditNoteNumber: cn.creditNoteNumber } })
    return res.json({ success: true, message: 'Credit note deleted' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
