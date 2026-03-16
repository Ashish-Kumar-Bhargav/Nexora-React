import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectCompanyDB } from '../lib/mongodb.js'
import { getRecurringInvoiceModel } from '../models/company/RecurringInvoice.js'
import { getInvoiceModel } from '../models/company/Invoice.js'
import { getActivityLogModel } from '../models/company/ActivityLog.js'
import { ROLE_HIERARCHY } from '../lib/permissions.js'

const router = Router()
router.use(authenticate)

function calcNextRun(frequency, from, dayOfMonth) {
  const d = new Date(from)
  switch (frequency) {
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
  }
  if (dayOfMonth && frequency !== 'weekly') d.setDate(dayOfMonth)
  return d
}

router.get('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const { page = 1, limit = 50 } = req.query
    const companyConn = await connectCompanyDB(req.user.dbName)
    const Model = getRecurringInvoiceModel(companyConn)
    const [recurringInvoices, total] = await Promise.all([
      Model.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      Model.countDocuments(),
    ])
    return res.json({ success: true, data: { recurringInvoices, total, page: Number(page), limit: Number(limit) } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required' })
    const { name, customerId, customerName, items, notes, frequency, dayOfMonth, startDate, endDate } = req.body
    if (!name || !customerId || !customerName || !items?.length || !frequency || !startDate) return res.status(400).json({ success: false, message: 'Required fields missing' })

    let subtotal = 0, taxTotal = 0
    const processedItems = items.map(item => {
      const lineTotal = item.quantity * item.unitPrice
      const taxAmount = (lineTotal * (item.taxRate || 0)) / 100
      subtotal += lineTotal; taxTotal += taxAmount
      return { ...item, taxAmount, total: lineTotal + taxAmount }
    })
    const start = new Date(startDate)
    const nextRunDate = calcNextRun(frequency, start, dayOfMonth)

    const companyConn = await connectCompanyDB(req.user.dbName)
    const Model = getRecurringInvoiceModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)

    const rec = await Model.create({
      name, customerId, customerName, items: processedItems, subtotal, taxTotal, grandTotal: subtotal + taxTotal,
      frequency, dayOfMonth, startDate: start, endDate: endDate ? new Date(endDate) : undefined,
      nextRunDate, notes, createdBy: req.user.userId, createdByName: req.user.name || req.user.email,
    })
    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'CREATE', module: 'recurring-invoices', details: { name, customerName, frequency } })
    return res.status(201).json({ success: true, message: 'Recurring invoice created', data: { recurringInvoice: rec } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/recurring-invoices — manually generate invoice
router.put('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required' })
    const { id } = req.body
    if (!id) return res.status(400).json({ success: false, message: 'id required' })

    const companyConn = await connectCompanyDB(req.user.dbName)
    const RecModel = getRecurringInvoiceModel(companyConn)
    const InvoiceModel = getInvoiceModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)

    const rec = await RecModel.findById(id)
    if (!rec) return res.status(404).json({ success: false, message: 'Recurring invoice not found' })

    const daysUntilDue = rec.frequency === 'weekly' ? 7 : rec.frequency === 'monthly' ? 30 : rec.frequency === 'quarterly' ? 90 : 365
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + daysUntilDue)

    const invoice = await InvoiceModel.create({
      customerId: rec.customerId, customerName: rec.customerName, items: rec.items,
      subtotal: rec.subtotal, taxTotal: rec.taxTotal, grandTotal: rec.grandTotal,
      notes: rec.notes, dueDate, currency: rec.currency,
      createdBy: req.user.userId, createdByName: req.user.name || req.user.email,
    })

    const nextRunDate = calcNextRun(rec.frequency, new Date(), rec.dayOfMonth)
    await RecModel.findByIdAndUpdate(id, { lastGeneratedAt: new Date(), nextRunDate, $inc: { invoicesGenerated: 1 } })
    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'CREATE', module: 'invoices', details: { invoiceNumber: invoice.invoiceNumber, fromRecurring: rec.name } })

    return res.json({ success: true, message: `Invoice ${invoice.invoiceNumber} generated`, data: { invoice } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const Model = getRecurringInvoiceModel(companyConn)
    const allowed = ['name', 'isActive', 'endDate', 'notes', 'dayOfMonth']
    const updates = {}
    for (const k of allowed) { if (k in req.body) updates[k] = req.body[k] }
    const updated = await Model.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' })
    return res.json({ success: true, message: 'Updated', data: { recurringInvoice: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const Model = getRecurringInvoiceModel(companyConn)
    const deleted = await Model.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' })
    return res.json({ success: true, message: 'Recurring invoice deleted' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
