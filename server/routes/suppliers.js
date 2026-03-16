import { Router } from 'express'
import mongoose from 'mongoose'
import { authenticate } from '../lib/auth.js'
import { connectMasterDB } from '../lib/mongodb.js'
import Supplier from '../models/master/Supplier.js'
import { ROLE_HIERARCHY } from '../lib/permissions.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ success: false, message: 'No company' })
    await connectMasterDB()
    const { page = 1, limit = 50, search } = req.query
    const query = { companyId: new mongoose.Types.ObjectId(req.user.companyId), isActive: true }
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]
    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort({ name: 1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      Supplier.countDocuments(query),
    ])
    return res.json({ success: true, data: { suppliers, total, page: Number(page), limit: Number(limit) } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ success: false, message: 'No company' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required' })
    await connectMasterDB()
    const { name, contactPerson, phone, email, address, gstNumber, bankAccount, bankIfsc, paymentTerms } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Supplier name is required' })
    const supplier = await Supplier.create({
      companyId: new mongoose.Types.ObjectId(req.user.companyId), name, contactPerson, phone, email,
      address, gstNumber, bankAccount, bankIfsc, paymentTerms,
      createdBy: new mongoose.Types.ObjectId(req.user.userId),
    })
    return res.status(201).json({ success: true, message: 'Supplier created', data: { supplier } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required' })
    await connectMasterDB()
    const allowed = ['name', 'contactPerson', 'phone', 'email', 'address', 'gstNumber', 'bankAccount', 'bankIfsc', 'paymentTerms', 'isActive']
    const updates = {}
    for (const k of allowed) { if (k in req.body) updates[k] = req.body[k] }
    const updated = await Supplier.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' })
    return res.json({ success: true, message: 'Supplier updated', data: { supplier: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    await connectMasterDB()
    const updated = await Supplier.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' })
    return res.json({ success: true, message: 'Supplier removed' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
