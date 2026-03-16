import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectCompanyDB } from '../lib/mongodb.js'
import { getActivityLogModel } from '../models/company/ActivityLog.js'
import { ROLE_HIERARCHY } from '../lib/permissions.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company DB' })
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['manager']) return res.status(403).json({ success: false, message: 'Manager access required' })

    const { page = 1, limit = 50, module, action, search, startDate, endDate } = req.query
    const companyConn = await connectCompanyDB(req.user.dbName)
    const ActivityLogModel = getActivityLogModel(companyConn)

    const query = {}
    if (module) query.module = module
    if (action) query.action = action
    if (search) query.userName = { $regex: search, $options: 'i' }
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) query.createdAt.$gte = new Date(startDate)
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); query.createdAt.$lte = end }
    }

    const [logs, total] = await Promise.all([
      ActivityLogModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      ActivityLogModel.countDocuments(query),
    ])
    return res.json({ success: true, data: { logs, total, page: Number(page), limit: Number(limit) } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
