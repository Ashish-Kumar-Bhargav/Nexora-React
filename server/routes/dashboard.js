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
import { getPurchaseOrderModel } from '../models/company/PurchaseOrder.js'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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

    let companyStats = {
      totalCustomers: 0, totalQuotations: 0, quotationsByStatus: {},
      totalInvoices: 0, invoicesByStatus: {}, recentInventory: [], recentActivity: [],
      totalInventoryItems: 0,
      totalRevenue: 0, todayRevenue: 0, monthRevenue: 0, outstandingAmount: 0,
      totalPurchaseOrders: 0, totalPOValue: 0,
      recentInvoices: [], lowStockItems: [], monthlyRevenue: [],
    }

    if (req.user.dbName) {
      const companyConn = await connectCompanyDB(req.user.dbName)
      const InventoryModel = getInventoryModel(companyConn)
      const CustomerModel = getCustomerModel(companyConn)
      const QuotationModel = getQuotationModel(companyConn)
      const InvoiceModel = getInvoiceModel(companyConn)
      const ActivityLogModel = getActivityLogModel(companyConn)
      const POModel = getPurchaseOrderModel(companyConn)

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd = new Date(todayStart.getTime() + 86400000)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

      const [
        totalCustomers, totalInventoryItems, totalQuotations, totalInvoices,
        recentInventory, recentActivity, quotationAgg, invoiceAgg,
        totalRevenueAgg, todayRevenueAgg, monthRevenueAgg, outstandingAgg,
        totalPurchaseOrders, poValueAgg, recentInvoices, monthlyRevenueAgg,
      ] = await Promise.all([
        CustomerModel.countDocuments({ isActive: true }),
        InventoryModel.countDocuments(),
        QuotationModel.countDocuments(),
        InvoiceModel.countDocuments(),
        InventoryModel.find().sort({ createdAt: -1 }).limit(6).lean(),
        ActivityLogModel.find().sort({ createdAt: -1 }).limit(6).lean(),
        QuotationModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        InvoiceModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        // All-time paid revenue
        InvoiceModel.aggregate([
          { $match: { status: 'paid' } },
          { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        // Today's revenue (any invoice updated today, paid)
        InvoiceModel.aggregate([
          { $match: { status: 'paid', updatedAt: { $gte: todayStart, $lt: todayEnd } } },
          { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        // This month revenue
        InvoiceModel.aggregate([
          { $match: { status: 'paid', updatedAt: { $gte: monthStart } } },
          { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        // Outstanding = grandTotal - paidAmount for non-paid, non-cancelled
        InvoiceModel.aggregate([
          { $match: { status: { $in: ['draft', 'partially_paid'] } } },
          { $group: { _id: null, total: { $sum: { $subtract: ['$grandTotal', '$paidAmount'] } } } },
        ]),
        POModel.countDocuments(),
        POModel.aggregate([
          { $match: { status: { $nin: ['cancelled'] } } },
          { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        // Recent invoices with amount
        InvoiceModel.find().sort({ createdAt: -1 }).limit(7).select('invoiceNumber customerName grandTotal status createdAt dueDate').lean(),
        // Monthly revenue last 6 months
        InvoiceModel.aggregate([
          { $match: { status: 'paid', createdAt: { $gte: sixMonthsAgo } } },
          { $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            revenue: { $sum: '$grandTotal' },
            count: { $sum: 1 },
          }},
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
      ])

      const quotationsByStatus = quotationAgg.reduce((acc, i) => { acc[i._id] = i.count; return acc }, {})
      const invoicesByStatus = invoiceAgg.reduce((acc, i) => { acc[i._id] = i.count; return acc }, {})

      // Build 6-month trend with zeros for missing months
      const monthlyRevenue = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const y = d.getFullYear(); const m = d.getMonth() + 1
        const found = monthlyRevenueAgg.find(r => r._id.year === y && r._id.month === m)
        monthlyRevenue.push({ month: MONTH_NAMES[m - 1], revenue: found?.revenue || 0, count: found?.count || 0 })
      }

      // Low stock: get latest stock per product and filter < 15
      const stockAgg = await InventoryModel.aggregate([
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$productId', productName: { $first: '$productName' }, productCode: { $first: '$productCode' }, currentStock: { $first: '$currentStock' } } },
        { $match: { currentStock: { $lt: 15 } } },
        { $sort: { currentStock: 1 } },
        { $limit: 6 },
      ])

      companyStats = {
        totalCustomers, totalInventoryItems, totalQuotations, quotationsByStatus,
        totalInvoices, invoicesByStatus, recentInventory, recentActivity,
        totalRevenue: totalRevenueAgg[0]?.total || 0,
        todayRevenue: todayRevenueAgg[0]?.total || 0,
        monthRevenue: monthRevenueAgg[0]?.total || 0,
        outstandingAmount: outstandingAgg[0]?.total || 0,
        totalPurchaseOrders, totalPOValue: poValueAgg[0]?.total || 0,
        recentInvoices, lowStockItems: stockAgg, monthlyRevenue,
      }
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
