import { Router } from 'express'
import mongoose from 'mongoose'
import { authenticate } from '../lib/auth.js'
import { connectCompanyDB, connectMasterDB } from '../lib/mongodb.js'
import { getInventoryModel } from '../models/company/Inventory.js'
import { getActivityLogModel } from '../models/company/ActivityLog.js'
import Product from '../models/master/Product.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company database' })
    const { productId, type, page = 1, limit = 50, aggregate, search } = req.query
    const companyConn = await connectCompanyDB(req.user.dbName)
    const InventoryModel = getInventoryModel(companyConn)

    if (aggregate === 'true') {
      const stockSummary = await InventoryModel.aggregate([
        { $group: { _id: '$productId', productName: { $last: '$productName' }, productCode: { $last: '$productCode' }, currentStock: { $last: '$currentStock' }, lastUpdated: { $max: '$createdAt' } } },
        { $sort: { productName: 1 } },
      ])
      return res.json({ success: true, message: 'Stock summary retrieved', data: { stockSummary } })
    }

    const query = {}
    if (productId) query.productId = productId
    if (type) query.type = type
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query.$or = [{ productName: regex }, { productCode: regex }]
    }
    const [records, total] = await Promise.all([
      InventoryModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      InventoryModel.countDocuments(query),
    ])
    return res.json({ success: true, message: 'Inventory retrieved', data: { records, total, page: Number(page), limit: Number(limit) } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company database' })
    const { productId, productName, productCode, type, quantity, reference, notes } = req.body
    if (!productId || !productName || !type || quantity === undefined) return res.status(400).json({ success: false, message: 'productId, productName, type, and quantity are required' })
    if (!['stock_in', 'stock_out', 'transfer'].includes(type)) return res.status(400).json({ success: false, message: 'Type must be stock_in, stock_out, or transfer' })

    const companyConn = await connectCompanyDB(req.user.dbName)
    const InventoryModel = getInventoryModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)

    const lastRecord = await InventoryModel.findOne({ productId }).sort({ createdAt: -1 })
    const previousStock = lastRecord ? lastRecord.currentStock : 0
    let currentStock = previousStock
    if (type === 'stock_in') currentStock = previousStock + Number(quantity)
    else if (type === 'stock_out') {
      if (previousStock < Number(quantity)) return res.status(400).json({ success: false, message: 'Insufficient stock' })
      currentStock = previousStock - Number(quantity)
    }

    const record = await InventoryModel.create({
      productId, productName, productCode: productCode || '', type, quantity: Number(quantity),
      previousStock, currentStock, reference: reference || '', notes: notes || '',
      createdBy: req.user.userId, createdByName: req.user.name || req.user.email,
    })
    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'CREATE', module: 'inventory', details: { type, productName, quantity, currentStock } })
    return res.status(201).json({ success: true, message: 'Inventory record created', data: { record } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company database' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const InventoryModel = getInventoryModel(companyConn)
    const record = await InventoryModel.findById(req.params.id).lean()
    if (!record) return res.status(404).json({ success: false, message: 'Inventory record not found' })
    return res.json({ success: true, message: 'Inventory record retrieved', data: { record } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/inventory/bulk
router.post('/bulk', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const { records } = req.body
    if (!records || records.length === 0) return res.status(400).json({ success: false, message: 'No records provided' })

    await connectMasterDB()
    const companyConn = await connectCompanyDB(req.user.dbName)
    const InventoryModel = getInventoryModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)

    const results = []
    let successCount = 0

    for (let i = 0; i < records.length; i++) {
      const rec = records[i]
      try {
        if (!rec.productCode || !rec.type || !rec.quantity) { results.push({ success: false, row: i + 1, productCode: rec.productCode || '', message: 'Missing required fields' }); continue }
        if (!['stock_in', 'stock_out'].includes(rec.type)) { results.push({ success: false, row: i + 1, productCode: rec.productCode, message: 'Type must be stock_in or stock_out' }); continue }
        if (Number(rec.quantity) <= 0) { results.push({ success: false, row: i + 1, productCode: rec.productCode, message: 'Quantity must be positive' }); continue }

        const product = await Product.findOne({ code: rec.productCode.trim(), companyId: new mongoose.Types.ObjectId(req.user.companyId) })
        if (!product) { results.push({ success: false, row: i + 1, productCode: rec.productCode, message: 'Product not found' }); continue }

        const lastRecord = await InventoryModel.findOne({ productId: product._id }).sort({ createdAt: -1 })
        const previousStock = lastRecord ? lastRecord.currentStock : 0
        let currentStock = previousStock
        if (rec.type === 'stock_in') currentStock = previousStock + Number(rec.quantity)
        else {
          if (previousStock < Number(rec.quantity)) { results.push({ success: false, row: i + 1, productCode: rec.productCode, message: `Insufficient stock (available: ${previousStock})` }); continue }
          currentStock = previousStock - Number(rec.quantity)
        }

        await InventoryModel.create({
          productId: product._id, productName: product.name, productCode: product.code,
          type: rec.type, quantity: Number(rec.quantity), previousStock, currentStock,
          reference: rec.reference || '', notes: rec.notes || 'Bulk upload',
          createdBy: req.user.userId, createdByName: req.user.name || req.user.email,
        })
        successCount++
        results.push({ success: true, row: i + 1, productCode: rec.productCode })
      } catch { results.push({ success: false, row: i + 1, productCode: rec.productCode || '', message: 'Processing error' }) }
    }

    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'BULK_UPLOAD', module: 'inventory', details: { totalRows: records.length, successCount, failCount: records.length - successCount } })
    return res.json({ success: true, message: `Processed ${records.length} rows: ${successCount} succeeded, ${records.length - successCount} failed`, data: { results, successCount, failCount: records.length - successCount } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
