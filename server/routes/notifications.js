import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectMasterDB, connectCompanyDB } from '../lib/mongodb.js'
import Product from '../models/master/Product.js'
import Company from '../models/master/Company.js'
import { getQuotationModel } from '../models/company/Quotation.js'
import { getInventoryModel } from '../models/company/Inventory.js'
import { getCustomerModel } from '../models/company/Customer.js'
import { ROLE_HIERARCHY } from '../lib/permissions.js'
import { sendEmailWithAttachment } from '../lib/email.js'
import { getCompanySmtpConfig } from '../lib/getSmtpConfig.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    await connectMasterDB()
    const notifications = []

    const pendingProducts = await Product.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5).lean()
    for (const p of pendingProducts) {
      notifications.push({ id: p._id.toString(), type: 'warning', title: 'Product Pending Approval', message: `"${p.name}" is waiting for approval`, module: 'products', href: '/products', createdAt: p.createdAt })
    }

    if (req.user.dbName) {
      const companyConn = await connectCompanyDB(req.user.dbName)
      const QuotationModel = getQuotationModel(companyConn)
      const pendingQuotations = await QuotationModel.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5).lean()
      for (const q of pendingQuotations) {
        notifications.push({ id: q._id.toString(), type: 'info', title: 'Quotation Pending Approval', message: `${q.quotationNumber} for ${q.customerName} needs approval`, module: 'quotations', href: '/quotations', createdAt: q.createdAt })
      }

      const companyDoc = req.user.companyId ? await Company.findById(req.user.companyId).select('lowStockThreshold').lean() : null
      const lowStockThreshold = companyDoc?.lowStockThreshold ?? 10
      const InventoryModel = getInventoryModel(companyConn)
      const stockSummary = await InventoryModel.aggregate([
        { $sort: { createdAt: 1 } },
        { $group: { _id: '$productId', productName: { $last: '$productName' }, currentStock: { $last: '$currentStock' } } },
        { $match: { currentStock: { $lt: lowStockThreshold, $gte: 0 } } },
      ])
      for (const s of stockSummary.slice(0, 3)) {
        notifications.push({ id: s._id.toString(), type: 'danger', title: 'Low Stock Alert', message: `${s.productName} has only ${s.currentStock} units left`, module: 'inventory', href: '/inventory', createdAt: new Date() })
      }

      const CustomerModel = getCustomerModel(companyConn)
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const newCustomers = await CustomerModel.find({ createdAt: { $gte: threeDaysAgo } }).sort({ createdAt: -1 }).limit(3).lean()
      for (const c of newCustomers) {
        notifications.push({ id: c._id.toString(), type: 'success', title: 'New Customer Added', message: `${c.companyName} was added as a customer`, module: 'customers', href: '/customers', createdAt: c.createdAt })
      }
    }

    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return res.json({ success: true, data: { notifications: notifications.slice(0, 15), total: notifications.length } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/notifications/low-stock-email
router.post('/low-stock-email', async (req, res) => {
  try {
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required' })
    if (!req.user.dbName || !req.user.companyId) return res.status(400).json({ success: false, message: 'No company database' })

    await connectMasterDB()
    const company = await Company.findById(req.user.companyId).select('name email lowStockThreshold smtpHost smtpPort smtpUser smtpPass smtpFrom smtpFromName').lean()
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' })

    const { to: bodyTo } = req.body || {}
    const recipientEmail = bodyTo || company.email || ''
    if (!recipientEmail) return res.status(400).json({ success: false, message: 'No recipient email. Set a company email or provide a To address.' })

    const lowStockThreshold = company.lowStockThreshold ?? 10
    const companyConn = await connectCompanyDB(req.user.dbName)
    const InventoryModel = getInventoryModel(companyConn)

    const [stockSummary, outOfStock] = await Promise.all([
      InventoryModel.aggregate([{ $sort: { createdAt: 1 } }, { $group: { _id: '$productId', productName: { $last: '$productName' }, productCode: { $last: '$productCode' }, currentStock: { $last: '$currentStock' } } }, { $match: { currentStock: { $lt: lowStockThreshold, $gte: 0 } } }, { $sort: { currentStock: 1 } }]),
      InventoryModel.aggregate([{ $sort: { createdAt: 1 } }, { $group: { _id: '$productId', productName: { $last: '$productName' }, productCode: { $last: '$productCode' }, currentStock: { $last: '$currentStock' } } }, { $match: { currentStock: { $eq: 0 } } }, { $sort: { productName: 1 } }]),
    ])

    if (stockSummary.length === 0 && outOfStock.length === 0) return res.json({ success: false, message: 'No low stock items found. All products are above the threshold.' })

    const rows = [...outOfStock.map(s => `<tr><td>${s.productName}</td><td>${s.productCode || '—'}</td><td style="color:#dc2626;font-weight:700;">OUT OF STOCK</td></tr>`), ...stockSummary.map(s => `<tr><td>${s.productName}</td><td>${s.productCode || '—'}</td><td style="color:#d97706;font-weight:700;">${s.currentStock} units</td></tr>`)].join('')

    const html = `<html><body style="font-family:Arial,sans-serif;"><h2 style="color:#dc2626;">Low Stock Alert — ${company.name}</h2><p>The following products are below the threshold of <strong>${lowStockThreshold} units</strong>:</p><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;"><thead><tr><th>Product</th><th>Code</th><th>Stock</th></tr></thead><tbody>${rows}</tbody></table></body></html>`

    const smtpConfig = await getCompanySmtpConfig(req.user.companyId)
    if (!smtpConfig) return res.status(400).json({ success: false, message: 'SMTP not configured. Please save SMTP settings first.' })

    await sendEmailWithAttachment({ to: [recipientEmail], subject: `Low Stock Alert — ${stockSummary.length + outOfStock.length} item(s) need attention | ${company.name}`, html, smtpConfig })
    return res.json({ success: true, message: `Low stock alert sent to ${recipientEmail}. ${outOfStock.length} out of stock, ${stockSummary.length} low stock items reported.` })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
