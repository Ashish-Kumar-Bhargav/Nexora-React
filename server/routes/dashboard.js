import { Router } from 'express'
import mongoose from 'mongoose'
import { authenticate } from '../lib/auth.js'
import { connectMasterDB, connectCompanyDB } from '../lib/mongodb.js'
import Product from '../models/master/Product.js'
import { getInventoryModel } from '../models/company/Inventory.js'
import { getCustomerModel } from '../models/company/Customer.js'
import { getQuotationModel } from '../models/company/Quotation.js'
import { getInvoiceModel } from '../models/company/Invoice.js'
import { getActivityLogModel } from '../models/company/ActivityLog.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    await connectMasterDB()
    const productFilter = req.user.companyId ? { companyId: new mongoose.Types.ObjectId(req.user.companyId) } : {}
    const [totalProducts, pendingApprovals, approvedProducts] = await Promise.all([
      Product.countDocuments(productFilter),
      Product.countDocuments({ ...productFilter, status: 'pending' }),
      Product.countDocuments({ ...productFilter, status: 'approved' }),
    ])

    let companyStats = { totalCustomers: 0, totalQuotations: 0, quotationsByStatus: {}, totalInvoices: 0, invoicesByStatus: {}, recentInventory: [], recentActivity: [], totalInventoryItems: 0 }

    if (req.user.dbName) {
      const companyConn = await connectCompanyDB(req.user.dbName)
      const InventoryModel = getInventoryModel(companyConn)
      const CustomerModel = getCustomerModel(companyConn)
      const QuotationModel = getQuotationModel(companyConn)
      const InvoiceModel = getInvoiceModel(companyConn)
      const ActivityLogModel = getActivityLogModel(companyConn)

      const [totalCustomers, totalInventoryItems, totalQuotations, totalInvoices, recentInventory, recentActivity, quotationAgg, invoiceAgg] = await Promise.all([
        CustomerModel.countDocuments({ isActive: true }),
        InventoryModel.countDocuments(),
        QuotationModel.countDocuments(),
        InvoiceModel.countDocuments(),
        InventoryModel.find().sort({ createdAt: -1 }).limit(10).lean(),
        ActivityLogModel.find().sort({ createdAt: -1 }).limit(10).lean(),
        QuotationModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        InvoiceModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      ])

      const quotationsByStatus = quotationAgg.reduce((acc, item) => { acc[item._id] = item.count; return acc }, {})
      const invoicesByStatus = invoiceAgg.reduce((acc, item) => { acc[item._id] = item.count; return acc }, {})

      companyStats = { totalCustomers, totalInventoryItems, totalQuotations, quotationsByStatus, totalInvoices, invoicesByStatus, recentInventory, recentActivity }
    }

    return res.json({
      success: true,
      message: 'Dashboard data retrieved',
      data: { totalProducts, pendingApprovals, approvedProducts, ...companyStats },
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    return res.status(500).json({ success: false, message: err.message })
  }
})

export default router
