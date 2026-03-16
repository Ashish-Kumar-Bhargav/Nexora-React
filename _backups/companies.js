import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectMasterDB } from '../lib/mongodb.js'
import Company from '../models/master/Company.js'
import { ROLE_HIERARCHY, ALL_PAGE_KEYS } from '../lib/permissions.js'

const router = Router()
router.use(authenticate)

// GET /api/companies/list — lightweight list for company assignment (includes allowedPages)
router.get('/list', async (req, res) => {
  try {
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    await connectMasterDB()
    const companies = await Company.find({ isActive: true }).sort({ name: 1 }).select('_id name code allowedPages').lean()
    return res.json({ success: true, data: { companies } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// GET /api/companies/me — current company settings
router.get('/me', async (req, res) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ success: false, message: 'No company associated' })
    await connectMasterDB()
    const company = await Company.findById(req.user.companyId).lean()
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' })
    return res.json({ success: true, data: { company } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/companies/me — update current company settings
router.put('/me', async (req, res) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ success: false, message: 'No company associated' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    await connectMasterDB()
    const allowed = ['name', 'address', 'phone', 'email', 'gstNumber', 'logo', 'signature', 'currency', 'lowStockThreshold', 'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpFrom', 'smtpFromName']
    const updates = {}
    for (const key of allowed) { if (key in req.body) updates[key] = req.body[key] }
    const updated = await Company.findByIdAndUpdate(req.user.companyId, updates, { new: true }).lean()
    return res.json({ success: true, message: 'Settings saved', data: { company: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.get('/', async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin access required' })
    await connectMasterDB()
    const { page = 1, limit = 50, search, isActive } = req.query
    const query = {}
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]
    if (isActive !== undefined) query.isActive = isActive === 'true'
    const [companies, total] = await Promise.all([
      Company.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      Company.countDocuments(query),
    ])
    return res.json({ success: true, message: 'Companies retrieved', data: { companies, total, page: Number(page), limit: Number(limit) } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin access required' })
    await connectMasterDB()
    const { name, code, address, phone, email, gstNumber, logo, signature } = req.body
    if (!name || !code) return res.status(400).json({ success: false, message: 'Name and code are required' })
    const upperCode = code.toUpperCase().replace(/\s+/g, '_')
    const dbName = `nexora_${upperCode.toLowerCase()}`
    const existing = await Company.findOne({ $or: [{ code: upperCode }, { dbName }] })
    if (existing) return res.status(409).json({ success: false, message: 'Company with this code already exists' })
    const company = await Company.create({ name, code: upperCode, dbName, address, phone, email, gstNumber, logo: logo || '', signature: signature || '' })
    return res.status(201).json({ success: true, message: 'Company created', data: { company } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin access required' })
    await connectMasterDB()
    const company = await Company.findById(req.params.id).lean()
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' })
    return res.json({ success: true, message: 'Company retrieved', data: { company } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin access required' })
    await connectMasterDB()
    const { name, address, phone, email, gstNumber, isActive, logo, signature } = req.body
    const updates = {}
    if (name !== undefined) updates.name = name
    if (address !== undefined) updates.address = address
    if (phone !== undefined) updates.phone = phone
    if (email !== undefined) updates.email = email
    if (gstNumber !== undefined) updates.gstNumber = gstNumber
    if (isActive !== undefined) updates.isActive = isActive
    if (logo !== undefined) updates.logo = logo
    if (signature !== undefined) updates.signature = signature
    const updated = await Company.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!updated) return res.status(404).json({ success: false, message: 'Company not found' })
    return res.json({ success: true, message: 'Company updated', data: { company: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// PUT /api/companies/:id/pages — set which pages this company is allowed to access (super_admin only)
router.put('/:id/pages', async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin access required' })
    await connectMasterDB()
    const { allowedPages } = req.body
    if (!Array.isArray(allowedPages)) return res.status(400).json({ success: false, message: 'allowedPages must be an array' })
    // Validate: only known page keys are accepted
    const valid = allowedPages.filter((p) => ALL_PAGE_KEYS.includes(p))
    const updated = await Company.findByIdAndUpdate(req.params.id, { allowedPages: valid }, { new: true })
    if (!updated) return res.status(404).json({ success: false, message: 'Company not found' })
    return res.json({ success: true, message: 'Page permissions updated', data: { company: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin access required' })
    await connectMasterDB()
    const deleted = await Company.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ success: false, message: 'Company not found' })
    return res.json({ success: true, message: 'Company deleted' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
