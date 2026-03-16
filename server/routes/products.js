import { Router } from 'express'
import mongoose from 'mongoose'
import { authenticate } from '../lib/auth.js'
import { connectMasterDB } from '../lib/mongodb.js'
import Product from '../models/master/Product.js'
import { ROLE_HIERARCHY, canApprove } from '../lib/permissions.js'

const router = Router()
router.use(authenticate)

const configSchema = new mongoose.Schema({ key: { type: String, unique: true }, values: [String] })
function getConfigModel() {
  return mongoose.models.ProductConfig || mongoose.model('ProductConfig', configSchema)
}
const DEFAULT_CATEGORIES = ['Electronics', 'Furniture', 'Stationery', 'Software', 'Networking', 'Hardware', 'Services', 'Other']
const DEFAULT_UNITS = ['pcs', 'kg', 'ltr', 'box', 'set', 'pair', 'meter', 'sqft', 'ream', 'license', 'unit']

// GET /api/products/categories
router.get('/categories', async (req, res) => {
  try {
    await connectMasterDB()
    const ConfigModel = getConfigModel()
    let catConfig = await ConfigModel.findOne({ key: 'categories' })
    if (!catConfig) catConfig = await ConfigModel.create({ key: 'categories', values: DEFAULT_CATEGORIES })
    let unitConfig = await ConfigModel.findOne({ key: 'units' })
    if (!unitConfig) unitConfig = await ConfigModel.create({ key: 'units', values: DEFAULT_UNITS })
    return res.json({ success: true, data: { categories: catConfig.values, units: unitConfig.values } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/categories', async (req, res) => {
  try {
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    await connectMasterDB()
    const ConfigModel = getConfigModel()
    const { type, value } = req.body
    if (!type || !value) return res.status(400).json({ success: false, message: 'type and value required' })
    const key = type === 'category' ? 'categories' : 'units'
    await ConfigModel.findOneAndUpdate({ key }, { $addToSet: { values: value.trim() } }, { upsert: true })
    return res.json({ success: true, message: `${type} added` })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/categories', async (req, res) => {
  try {
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    await connectMasterDB()
    const ConfigModel = getConfigModel()
    const { type, value } = req.body
    const key = type === 'category' ? 'categories' : 'units'
    await ConfigModel.findOneAndUpdate({ key }, { $pull: { values: value } })
    return res.json({ success: true, message: `${type} removed` })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.get('/', async (req, res) => {
  try {
    await connectMasterDB()
    const { status, search, page = 1, limit = 50 } = req.query
    if (!req.user.companyId) return res.status(400).json({ success: false, message: 'No company associated with this session' })
    const query = { companyId: new mongoose.Types.ObjectId(req.user.companyId) }
    if (status) query.status = status
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }, { category: { $regex: search, $options: 'i' } }]
    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      Product.countDocuments(query),
    ])
    return res.json({ success: true, message: 'Products retrieved', data: { products, total, page: Number(page), limit: Number(limit) } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    await connectMasterDB()
    const { name, category, description, unit, basePrice, taxRate, requiresApproval } = req.body
    if (!name || !category) return res.status(400).json({ success: false, message: 'Name and category are required' })
    if (!req.user.companyId) return res.status(400).json({ success: false, message: 'No company associated with this session.' })
    const product = await Product.create({
      companyId: new mongoose.Types.ObjectId(req.user.companyId), name, category, description,
      unit: unit || 'pcs', basePrice: Number(basePrice) || 0, taxRate: Number(taxRate) || 18,
      requiresApproval: Boolean(requiresApproval), status: requiresApproval ? 'pending' : 'draft',
      createdBy: req.user.userId,
    })
    return res.status(201).json({ success: true, message: 'Product created successfully', data: { product } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    await connectMasterDB()
    const product = await Product.findById(req.params.id).lean()
    if (!product || product.companyId?.toString() !== req.user.companyId) return res.status(404).json({ success: false, message: 'Product not found' })
    return res.json({ success: true, message: 'Product retrieved', data: { product } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    await connectMasterDB()
    const { name, category, description, unit, basePrice, taxRate, requiresApproval } = req.body
    const product = await Product.findById(req.params.id)
    if (!product || product.companyId?.toString() !== req.user.companyId) return res.status(404).json({ success: false, message: 'Product not found' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin'] && !['draft', 'rejected'].includes(product.status)) {
      return res.status(403).json({ success: false, message: 'Cannot edit an approved or pending product' })
    }
    const updates = {}
    if (name !== undefined) updates.name = name
    if (category !== undefined) updates.category = category
    if (description !== undefined) updates.description = description
    if (unit !== undefined) updates.unit = unit
    if (basePrice !== undefined) updates.basePrice = Number(basePrice)
    if (taxRate !== undefined) updates.taxRate = Number(taxRate)
    if (requiresApproval !== undefined) updates.requiresApproval = Boolean(requiresApproval)
    const updated = await Product.findByIdAndUpdate(req.params.id, updates, { new: true })
    return res.json({ success: true, message: 'Product updated', data: { product: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await connectMasterDB()
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    const product = await Product.findById(req.params.id)
    if (!product || product.companyId?.toString() !== req.user.companyId) return res.status(404).json({ success: false, message: 'Product not found' })
    await Product.findByIdAndDelete(req.params.id)
    return res.json({ success: true, message: 'Product deleted' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/products/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    await connectMasterDB()
    if (!canApprove(req.user.role)) return res.status(403).json({ success: false, message: 'You do not have permission to approve products' })
    const { action, notes } = req.body
    if (!action || !['approve', 'reject'].includes(action)) return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject"' })
    const product = await Product.findById(req.params.id)
    if (!product || product.companyId?.toString() !== req.user.companyId) return res.status(404).json({ success: false, message: 'Product not found' })
    if (product.status !== 'pending') return res.status(400).json({ success: false, message: 'Only pending products can be approved or rejected' })
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updated = await Product.findByIdAndUpdate(req.params.id, { status: newStatus, approvedBy: req.user.userId, approvalNotes: notes || '' }, { new: true })
    return res.json({ success: true, message: `Product ${newStatus} successfully`, data: { product: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
