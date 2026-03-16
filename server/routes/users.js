import { Router } from 'express'
import { authenticate, hashPassword } from '../lib/auth.js'
import { connectMasterDB } from '../lib/mongodb.js'
import User from '../models/master/User.js'
import { ROLE_HIERARCHY } from '../lib/permissions.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    await connectMasterDB()
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    const { page = 1, limit = 50, search } = req.query
    const query = {}
    if (req.user.role !== 'super_admin' && req.user.companyId) query['companies.companyId'] = req.user.companyId
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]
    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      User.countDocuments(query),
    ])
    return res.json({ success: true, message: 'Users retrieved', data: { users, total, page: Number(page), limit: Number(limit) } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    await connectMasterDB()
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    const { name, email, phone, password, role } = req.body
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required' })
    if (role === 'super_admin' && req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Cannot create super_admin user' })
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) return res.status(409).json({ success: false, message: 'Email already in use' })
    const hashedPassword = await hashPassword(password)
    const user = await User.create({ name, email: email.toLowerCase(), phone, password: hashedPassword, role: role || 'user' })
    const userObj = user.toObject(); delete userObj.password
    return res.status(201).json({ success: true, message: 'User created', data: { user: userObj } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    await connectMasterDB()
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin'] && req.user.userId !== req.params.id) return res.status(403).json({ success: false, message: 'Access denied' })
    const user = await User.findById(req.params.id).select('-password').lean()
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    return res.json({ success: true, message: 'User retrieved', data: { user } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    await connectMasterDB()
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin'] && req.user.userId !== req.params.id) return res.status(403).json({ success: false, message: 'Access denied' })
    const { name, phone, password, role, isActive, companies } = req.body
    const updates = {}
    if (name !== undefined) updates.name = name
    if (phone !== undefined) updates.phone = phone
    if (isActive !== undefined) updates.isActive = isActive
    if (companies !== undefined) updates.companies = companies
    if (role !== undefined && req.user.role === 'super_admin') updates.role = role
    if (password) updates.password = await hashPassword(password)
    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password')
    if (!updated) return res.status(404).json({ success: false, message: 'User not found' })
    return res.json({ success: true, message: 'User updated', data: { user: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await connectMasterDB()
    if (req.user.role !== 'super_admin') return res.status(403).json({ success: false, message: 'Super admin access required' })
    if (req.user.userId === req.params.id) return res.status(400).json({ success: false, message: 'Cannot delete yourself' })
    const deleted = await User.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ success: false, message: 'User not found' })
    return res.json({ success: true, message: 'User deleted' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
