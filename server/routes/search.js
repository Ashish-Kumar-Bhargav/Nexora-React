import { Router } from 'express'
import mongoose from 'mongoose'
import { authenticate } from '../lib/auth.js'
import { connectMasterDB, connectCompanyDB } from '../lib/mongodb.js'
import Product from '../models/master/Product.js'
import Supplier from '../models/master/Supplier.js'
import User from '../models/master/User.js'
import { getCustomerModel } from '../models/company/Customer.js'
import { getInvoiceModel } from '../models/company/Invoice.js'
import { getQuotationModel } from '../models/company/Quotation.js'
import { getCreditNoteModel } from '../models/company/CreditNote.js'
import { getPurchaseOrderModel } from '../models/company/PurchaseOrder.js'
import { getInventoryModel } from '../models/company/Inventory.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const q = req.query.q?.trim()
    if (!q || q.length < 2) return res.json({ success: true, data: { results: [] } })

    const re = { $regex: q, $options: 'i' }
    const results = []

    await connectMasterDB()
    const companyFilter = req.user.companyId ? { companyId: new mongoose.Types.ObjectId(req.user.companyId) } : {}
    const userCompanyFilter = req.user.companyId ? { 'companies.companyId': new mongoose.Types.ObjectId(req.user.companyId) } : {}

    const [products, suppliers, users] = await Promise.all([
      Product.find({ ...companyFilter, $or: [{ name: re }, { code: re }] }).limit(5).lean(),
      Supplier.find({ ...companyFilter, isActive: true, $or: [{ name: re }, { email: re }] }).limit(3).lean(),
      User.find({ ...userCompanyFilter, $or: [{ name: re }, { email: re }] }).limit(3).select('name email role').lean(),
    ])
    for (const p of products) results.push({ type: 'Product', id: p._id.toString(), title: p.name, subtitle: p.code, href: '/products' })
    for (const s of suppliers) results.push({ type: 'Supplier', id: s._id.toString(), title: s.name, subtitle: s.email, href: '/suppliers' })
    for (const u of users) results.push({ type: 'User', id: u._id.toString(), title: u.name, subtitle: u.email, href: '/users' })

    if (req.user.dbName) {
      const companyConn = await connectCompanyDB(req.user.dbName)
      const [customers, invoices, quotations, creditNotes, purchaseOrders, inventoryItems] = await Promise.all([
        getCustomerModel(companyConn).find({ $or: [{ companyName: re }, { email: re }, { phone: re }] }).limit(5).lean(),
        getInvoiceModel(companyConn).find({ $or: [{ invoiceNumber: re }, { customerName: re }] }).limit(5).lean(),
        getQuotationModel(companyConn).find({ $or: [{ quotationNumber: re }, { customerName: re }] }).limit(5).lean(),
        getCreditNoteModel(companyConn).find({ $or: [{ creditNoteNumber: re }, { customerName: re }] }).limit(3).lean(),
        getPurchaseOrderModel(companyConn).find({ $or: [{ poNumber: re }, { supplierName: re }] }).limit(3).lean(),
        getInventoryModel(companyConn).find({ $or: [{ productName: re }, { productCode: re }] }).limit(3).select('productName productCode type currentStock').lean(),
      ])
      for (const c of customers) results.push({ type: 'Customer', id: c._id.toString(), title: c.companyName, subtitle: c.email, href: '/customers' })
      for (const inv of invoices) results.push({ type: 'Invoice', id: inv._id.toString(), title: inv.invoiceNumber, subtitle: inv.customerName, href: '/invoices' })
      for (const qt of quotations) results.push({ type: 'Quotation', id: qt._id.toString(), title: qt.quotationNumber, subtitle: qt.customerName, href: '/quotations' })
      for (const cn of creditNotes) results.push({ type: 'Credit Note', id: cn._id.toString(), title: cn.creditNoteNumber, subtitle: cn.customerName, href: '/credit-notes' })
      for (const po of purchaseOrders) results.push({ type: 'Purchase Order', id: po._id.toString(), title: po.poNumber, subtitle: po.supplierName, href: '/purchase-orders' })
      for (const item of inventoryItems) results.push({ type: 'Inventory', id: item._id.toString(), title: item.productName, subtitle: `Stock: ${item.currentStock}`, href: '/inventory' })
    }

    return res.json({ success: true, data: { results } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
