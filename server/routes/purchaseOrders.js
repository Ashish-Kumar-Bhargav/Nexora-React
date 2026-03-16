import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectCompanyDB } from '../lib/mongodb.js'
import { getPurchaseOrderModel } from '../models/company/PurchaseOrder.js'
import { getInventoryModel } from '../models/company/Inventory.js'
import { getActivityLogModel } from '../models/company/ActivityLog.js'
import { getEmailLogModel } from '../models/company/EmailLog.js'
import { ROLE_HIERARCHY } from '../lib/permissions.js'
import { sendEmailWithAttachment, buildEmailTemplate } from '../lib/email.js'
import { getCompanySmtpConfig } from '../lib/getSmtpConfig.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const { status, page = 1, limit = 50 } = req.query
    const companyConn = await connectCompanyDB(req.user.dbName)
    const POModel = getPurchaseOrderModel(companyConn)
    const query = {}; if (status) query.status = status
    const [purchaseOrders, total] = await Promise.all([
      POModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      POModel.countDocuments(query),
    ])
    return res.json({ success: true, data: { purchaseOrders, total, page: Number(page), limit: Number(limit) } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required' })
    const { supplierId, supplierName, items, notes, expectedDelivery } = req.body
    if (!supplierId || !supplierName || !items?.length) return res.status(400).json({ success: false, message: 'supplierId, supplierName, and items are required' })

    let subtotal = 0, taxTotal = 0
    const processedItems = items.map(item => {
      const lineTotal = item.quantity * item.unitPrice
      const taxAmount = (lineTotal * (item.taxRate || 0)) / 100
      subtotal += lineTotal; taxTotal += taxAmount
      return { ...item, taxAmount, total: lineTotal + taxAmount, receivedQty: 0 }
    })

    const companyConn = await connectCompanyDB(req.user.dbName)
    const POModel = getPurchaseOrderModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)

    const po = await POModel.create({
      supplierId, supplierName, items: processedItems, subtotal, taxTotal, grandTotal: subtotal + taxTotal,
      notes, expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : undefined,
      createdBy: req.user.userId, createdByName: req.user.name || req.user.email,
    })
    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'CREATE', module: 'purchase-orders', details: { poNumber: po.poNumber, supplierName } })
    return res.status(201).json({ success: true, message: 'Purchase order created', data: { purchaseOrder: po } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const POModel = getPurchaseOrderModel(companyConn)
    const po = await POModel.findById(req.params.id).lean()
    if (!po) return res.status(404).json({ success: false, message: 'Not found' })
    return res.json({ success: true, data: { purchaseOrder: po } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required' })
    const { status: newStatus, notes, expectedDelivery, receivedItems, supplierId, supplierName, items: editItems } = req.body

    const companyConn = await connectCompanyDB(req.user.dbName)
    const POModel = getPurchaseOrderModel(companyConn)
    const InventoryModel = getInventoryModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)

    const po = await POModel.findById(req.params.id)
    if (!po) return res.status(404).json({ success: false, message: 'Not found' })
    if (po.status === 'cancelled') return res.status(400).json({ success: false, message: 'Cannot update cancelled PO' })

    const updates = {}
    if (notes !== undefined) updates.notes = notes
    if (expectedDelivery) updates.expectedDelivery = new Date(expectedDelivery)

    if (po.status === 'draft' && editItems && Array.isArray(editItems)) {
      let subtotal = 0, taxTotal = 0
      const processed = editItems.map(item => {
        const lineTotal = item.quantity * item.unitPrice
        const taxAmount = (lineTotal * (item.taxRate || 0)) / 100
        subtotal += lineTotal; taxTotal += taxAmount
        return { ...item, taxAmount, total: lineTotal + taxAmount, receivedQty: 0 }
      })
      updates.items = processed; updates.subtotal = subtotal; updates.taxTotal = taxTotal; updates.grandTotal = subtotal + taxTotal
    }
    if (po.status === 'draft' && supplierId) { updates.supplierId = supplierId; updates.supplierName = supplierName || po.supplierName }

    let becameReceived = false
    if (newStatus && ['draft', 'sent', 'partial', 'received', 'cancelled'].includes(newStatus)) {
      updates.status = newStatus
      if (newStatus === 'received') { updates.receivedAt = new Date(); becameReceived = true }
    }

    if (receivedItems && Array.isArray(receivedItems)) {
      const updatedItems = po.items.map((item, idx) => {
        const recv = receivedItems[idx]
        if (recv && recv.receivedQty !== undefined) {
          return { ...item.toObject(), receivedQty: Math.min(item.receivedQty + Number(recv.receivedQty), item.quantity) }
        }
        return item.toObject()
      })
      updates.items = updatedItems
      const allReceived = updatedItems.every(i => i.receivedQty >= i.quantity)
      const anyReceived = updatedItems.some(i => i.receivedQty > 0)
      if (!updates.status) {
        if (allReceived) { updates.status = 'received'; updates.receivedAt = new Date(); becameReceived = true }
        else if (anyReceived) updates.status = 'partial'
      }
    }

    const updated = await POModel.findByIdAndUpdate(req.params.id, updates, { new: true })

    if (becameReceived && po.status !== 'received') {
      for (const item of po.items) {
        if (!item.productId) continue
        const lastRecord = await InventoryModel.findOne({ productId: item.productId }).sort({ createdAt: -1 })
        const previousStock = lastRecord?.currentStock || 0
        await InventoryModel.create({
          productId: item.productId, productName: item.productName, productCode: item.productCode || '',
          type: 'stock_in', quantity: item.quantity, previousStock, currentStock: previousStock + item.quantity,
          reference: po.poNumber, notes: 'Auto stock-in from purchase order',
          createdBy: req.user.userId, createdByName: req.user.name || req.user.email,
        })
      }
    }

    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'UPDATE', module: 'purchase-orders', details: { poId: req.params.id, newStatus } })
    return res.json({ success: true, message: 'Purchase order updated', data: { purchaseOrder: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const POModel = getPurchaseOrderModel(companyConn)
    const po = await POModel.findById(req.params.id)
    if (!po) return res.status(404).json({ success: false, message: 'Not found' })
    if (po.status === 'received') return res.status(400).json({ success: false, message: 'Cannot delete a received PO' })
    await POModel.findByIdAndDelete(req.params.id)
    return res.json({ success: true, message: 'Purchase order deleted' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/:id/email', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company database' })
    const { emails, cc, bcc, subject, message, pdfBase64 } = req.body
    const toEmails = (Array.isArray(emails) ? emails : []).map(e => e.trim()).filter(e => e.includes('@'))
    const ccEmails = (Array.isArray(cc) ? cc : []).map(e => e.trim()).filter(e => e.includes('@'))
    const bccEmails = (Array.isArray(bcc) ? bcc : []).map(e => e.trim()).filter(e => e.includes('@'))
    if (toEmails.length === 0) return res.status(400).json({ success: false, message: 'At least one valid To email is required' })

    const companyConn = await connectCompanyDB(req.user.dbName)
    const POModel = getPurchaseOrderModel(companyConn)
    const EmailLogModel = getEmailLogModel(companyConn)
    const po = await POModel.findById(req.params.id).lean()
    if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' })

    const emailSubject = subject || `Purchase Order ${po.poNumber} from ${req.user.companyName}`
    const htmlBody = buildEmailTemplate({
      title: 'PURCHASE ORDER', documentNumber: po.poNumber, customerName: po.supplierName,
      companyName: req.user.companyName || 'Nexora ERP', message,
      details: [
        { label: 'PO Number', value: po.poNumber },
        { label: 'Supplier', value: po.supplierName },
        { label: 'Total Amount', value: `₹${po.grandTotal?.toLocaleString('en-IN')}` },
        ...(po.expectedDelivery ? [{ label: 'Expected Delivery', value: new Date(po.expectedDelivery).toLocaleDateString('en-IN') }] : []),
        { label: 'Status', value: po.status.charAt(0).toUpperCase() + po.status.slice(1) },
      ],
    })
    const attachments = pdfBase64 ? [{ filename: `${po.poNumber}.pdf`, content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }] : []
    const smtpConfig = await getCompanySmtpConfig(req.user.companyId)
    let emailStatus = 'sent', emailError
    try { await sendEmailWithAttachment({ to: toEmails, cc: ccEmails, bcc: bccEmails, subject: emailSubject, html: htmlBody, attachments, smtpConfig }) }
    catch (err) { emailStatus = 'failed'; emailError = err.message }

    await EmailLogModel.create({
      documentType: 'purchase-order', documentId: po._id, documentNumber: po.poNumber,
      to: toEmails, cc: ccEmails, bcc: bccEmails, subject: emailSubject, message: message || '',
      sentBy: req.user.userId, sentByName: req.user.name || req.user.email, status: emailStatus, error: emailError,
    })
    if (emailStatus === 'failed') return res.status(500).json({ success: false, message: `Failed to send email: ${emailError}` })
    return res.json({ success: true, message: `Email sent to ${toEmails.join(', ')}` })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
