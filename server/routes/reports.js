import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectCompanyDB, connectMasterDB } from '../lib/mongodb.js'
import { getInvoiceModel } from '../models/company/Invoice.js'
import { getInventoryModel } from '../models/company/Inventory.js'
import { getQuotationModel } from '../models/company/Quotation.js'
import Company from '../models/master/Company.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company database' })
    const { type = 'sales', startDate, endDate, customer, minAmount, maxAmount, stockSearch, stockStatus, module, fields: fieldsParam, paymentStatus } = req.query

    await connectMasterDB()
    const companyDoc = req.user.companyId ? await Company.findById(req.user.companyId).select('lowStockThreshold').lean() : null
    const lowStockThreshold = companyDoc?.lowStockThreshold ?? 10

    const companyConn = await connectCompanyDB(req.user.dbName)
    const InvoiceModel = getInvoiceModel(companyConn)
    const InventoryModel = getInventoryModel(companyConn)
    const QuotationModel = getQuotationModel(companyConn)

    const dateFilter = {}
    if (startDate) dateFilter.$gte = new Date(startDate)
    if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); dateFilter.$lte = end }

    if (type === 'sales') {
      const matchStage = { status: 'paid' }
      if (startDate || endDate) matchStage.paidAt = dateFilter
      if (customer) matchStage.customerName = { $regex: customer, $options: 'i' }
      if (minAmount || maxAmount) { const amtFilter = {}; if (minAmount) amtFilter.$gte = Number(minAmount); if (maxAmount) amtFilter.$lte = Number(maxAmount); matchStage.grandTotal = amtFilter }
      const [dailySales, summary] = await Promise.all([
        InvoiceModel.aggregate([{ $match: matchStage }, { $group: { _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' }, day: { $dayOfMonth: '$paidAt' } }, date: { $first: '$paidAt' }, revenue: { $sum: '$grandTotal' }, taxCollected: { $sum: '$taxTotal' }, invoiceCount: { $sum: 1 }, customers: { $addToSet: '$customerName' } } }, { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }]),
        InvoiceModel.aggregate([{ $match: matchStage }, { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' }, totalTax: { $sum: '$taxTotal' }, totalInvoices: { $sum: 1 } } }]),
      ])
      return res.json({ success: true, data: { dailySales: dailySales.map(d => ({ date: d.date, revenue: d.revenue, taxCollected: d.taxCollected, invoiceCount: d.invoiceCount, customerCount: d.customers.length })), summary: summary[0] || { totalRevenue: 0, totalTax: 0, totalInvoices: 0 } } })
    }

    if (type === 'profit') {
      const matchStage = { status: 'paid' }
      if (startDate || endDate) matchStage.paidAt = dateFilter
      const [monthlyProfit, topCustomers, overallSummary] = await Promise.all([
        InvoiceModel.aggregate([{ $match: matchStage }, { $group: { _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } }, revenue: { $sum: '$grandTotal' }, taxAmount: { $sum: '$taxTotal' }, subtotal: { $sum: '$subtotal' }, invoiceCount: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
        InvoiceModel.aggregate([{ $match: { status: 'paid', ...(startDate || endDate ? { paidAt: dateFilter } : {}) } }, { $group: { _id: '$customerName', revenue: { $sum: '$grandTotal' }, invoiceCount: { $sum: 1 } } }, { $sort: { revenue: -1 } }, { $limit: 5 }]),
        InvoiceModel.aggregate([{ $match: matchStage }, { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' }, totalTax: { $sum: '$taxTotal' }, totalSubtotal: { $sum: '$subtotal' }, count: { $sum: 1 } } }]),
      ])
      return res.json({ success: true, data: { monthlyProfit: monthlyProfit.map(m => ({ year: m._id.year, month: m._id.month, revenue: m.revenue, taxAmount: m.taxAmount, netRevenue: m.subtotal, invoiceCount: m.invoiceCount })), topCustomers: topCustomers.map(c => ({ customerName: c._id, revenue: c.revenue, invoiceCount: c.invoiceCount })), summary: overallSummary[0] || { totalRevenue: 0, totalTax: 0, totalSubtotal: 0, count: 0 } } })
    }

    if (type === 'stock') {
      const stockSummary = await InventoryModel.aggregate([
        { $sort: { createdAt: 1 } },
        { $group: { _id: '$productId', productName: { $last: '$productName' }, productCode: { $last: '$productCode' }, currentStock: { $last: '$currentStock' }, totalIn: { $sum: { $cond: [{ $eq: ['$type', 'stock_in'] }, '$quantity', 0] } }, totalOut: { $sum: { $cond: [{ $eq: ['$type', 'stock_out'] }, '$quantity', 0] } }, lastUpdated: { $max: '$createdAt' } } },
        { $sort: { productName: 1 } },
      ])
      let filteredStock = stockSummary
      if (stockSearch) { const re = new RegExp(stockSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); filteredStock = filteredStock.filter(s => re.test(s.productName) || re.test(s.productCode)) }
      if (stockStatus === 'out') filteredStock = filteredStock.filter(s => s.currentStock === 0)
      else if (stockStatus === 'low') filteredStock = filteredStock.filter(s => s.currentStock > 0 && s.currentStock < lowStockThreshold)
      else if (stockStatus === 'ok') filteredStock = filteredStock.filter(s => s.currentStock >= lowStockThreshold)
      const lowStockCount = filteredStock.filter(s => s.currentStock < lowStockThreshold).length
      const outOfStockCount = filteredStock.filter(s => s.currentStock === 0).length
      return res.json({ success: true, data: { stockSummary: filteredStock, lowStockThreshold, summary: { totalProducts: filteredStock.length, lowStockCount, outOfStockCount, healthyStockCount: filteredStock.length - lowStockCount } } })
    }

    if (type === 'payments') {
      const matchStage = {}
      if (startDate || endDate) matchStage.createdAt = dateFilter
      if (customer) matchStage.customerName = { $regex: customer, $options: 'i' }
      if (paymentStatus && paymentStatus !== 'all') matchStage.status = paymentStatus
      const invoices = await InvoiceModel.find(matchStage).sort({ createdAt: -1 }).select('invoiceNumber customerName grandTotal subtotal taxTotal status dueDate paidAt createdAt').lean()
      const payments = invoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber, customerName: inv.customerName, grandTotal: inv.grandTotal,
        paidAmount: inv.status === 'paid' ? inv.grandTotal : 0, pendingAmount: inv.status === 'paid' ? 0 : inv.grandTotal,
        status: inv.status, dueDate: inv.dueDate, paidAt: inv.paidAt, createdAt: inv.createdAt,
        isOverdue: inv.status === 'draft' && inv.dueDate && new Date(inv.dueDate) < new Date(),
      }))
      const summary = { totalInvoices: payments.length, totalBilled: payments.reduce((s, p) => s + p.grandTotal, 0), totalPaid: payments.reduce((s, p) => s + p.paidAmount, 0), totalPending: payments.reduce((s, p) => s + p.pendingAmount, 0), overdueCount: payments.filter(p => p.isOverdue).length }
      return res.json({ success: true, data: { payments, summary } })
    }

    if (type === 'dynamic') {
      const mod = module || 'invoices'
      const fields = (fieldsParam || '').split(',').filter(Boolean)
      if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields selected' })
      const matchStage = {}
      if (startDate || endDate) matchStage.createdAt = dateFilter
      const hasCustomFields = fields.some(f => f.startsWith('customFields.'))
      const standardFields = fields.filter(f => !f.startsWith('customFields.'))
      const projection = { _id: 0 }
      standardFields.forEach(f => { projection[f] = 1 })
      if (hasCustomFields) projection.customFields = 1
      const Model = mod === 'quotations' ? QuotationModel : InvoiceModel
      const records = await Model.find(matchStage).sort({ createdAt: -1 }).select(projection).lean()
      return res.json({ success: true, data: { records, fields } })
    }

    return res.status(400).json({ success: false, message: 'Invalid report type' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

export default router
