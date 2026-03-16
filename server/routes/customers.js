import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectCompanyDB } from '../lib/mongodb.js'
import { getCustomerModel } from '../models/company/Customer.js'
import { getActivityLogModel } from '../models/company/ActivityLog.js'
import { ROLE_HIERARCHY } from '../lib/permissions.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company database' })
    const { search, page = 1, limit = 50 } = req.query
    const companyConn = await connectCompanyDB(req.user.dbName)
    const CustomerModel = getCustomerModel(companyConn)
    const query = {}
    if (search) query.$or = [{ companyName: { $regex: search, $options: 'i' } }, { contactPerson: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]
    const [customers, total] = await Promise.all([
      CustomerModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      CustomerModel.countDocuments(query),
    ])
    return res.json({ success: true, message: 'Customers retrieved', data: { customers, total, page: Number(page), limit: Number(limit) } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company database' })
    const { companyName, contactPerson, phone, email, address, gstNumber } = req.body
    if (!companyName) return res.status(400).json({ success: false, message: 'Company name is required' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const CustomerModel = getCustomerModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)
    const customer = await CustomerModel.create({ companyName, contactPerson, phone, email, address, gstNumber, createdBy: req.user.userId })
    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'CREATE', module: 'customers', details: { companyName } })
    return res.status(201).json({ success: true, message: 'Customer created', data: { customer } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const CustomerModel = getCustomerModel(companyConn)
    const customer = await CustomerModel.findById(req.params.id).lean()
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' })
    return res.json({ success: true, message: 'Customer retrieved', data: { customer } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const CustomerModel = getCustomerModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)
    const updated = await CustomerModel.findByIdAndUpdate(req.params.id, req.body, { new: true })
    if (!updated) return res.status(404).json({ success: false, message: 'Customer not found' })
    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'UPDATE', module: 'customers', details: { customerId: req.params.id } })
    return res.json({ success: true, message: 'Customer updated', data: { customer: updated } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    const companyConn = await connectCompanyDB(req.user.dbName)
    const CustomerModel = getCustomerModel(companyConn)
    const ActivityLogModel = getActivityLogModel(companyConn)
    const deleted = await CustomerModel.findByIdAndDelete(req.params.id)
    if (!deleted) return res.status(404).json({ success: false, message: 'Customer not found' })
    await ActivityLogModel.create({ userId: req.user.userId, userName: req.user.name || req.user.email, action: 'DELETE', module: 'customers', details: { customerId: req.params.id } })
    return res.json({ success: true, message: 'Customer deleted' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
