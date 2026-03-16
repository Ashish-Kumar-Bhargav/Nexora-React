import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectMasterDB } from '../lib/mongodb.js'
import Company from '../models/master/Company.js'
import User from '../models/master/User.js'
import { ALL_PAGE_KEYS, ALWAYS_ALLOWED_PAGES, ROLE_HIERARCHY } from '../lib/permissions.js'

const router = Router()
router.use(authenticate)

// GET /api/permissions/my — returns effective page permissions for the current user
router.get('/my', async (req, res) => {
  try {
    // Super admin always has full access to all pages
    if (req.user.role === 'super_admin') {
      return res.json({ success: true, data: { allowedPages: ALL_PAGE_KEYS, isFullAccess: true } })
    }

    await connectMasterDB()
    const company = await Company.findById(req.user.companyId).select('allowedPages').lean()

    // Company-level allowed pages: empty = all pages allowed
    const companyAllowed = (company?.allowedPages?.length > 0)
      ? company.allowedPages
      : [...ALL_PAGE_KEYS]

    // Admin gets all company-allowed pages — still subject to company-level restrictions
    if (ROLE_HIERARCHY[req.user.role] >= ROLE_HIERARCHY['admin']) {
      const result = [...new Set([...ALWAYS_ALLOWED_PAGES, ...companyAllowed])]
      return res.json({ success: true, data: { allowedPages: result, isFullAccess: false } })
    }

    // Manager / User: further restricted by their per-company pagePermissions
    const user = await User.findById(req.user.userId).select('companies').lean()
    const assignment = user?.companies?.find(
      (c) => c.companyId?.toString() === req.user.companyId?.toString()
    )
    const userPages = assignment?.pagePermissions

    let effective
    if (userPages && userPages.length > 0) {
      // Intersection: user's selected pages that are also company-allowed
      effective = companyAllowed.filter((p) => userPages.includes(p))
    } else {
      effective = companyAllowed
    }

    // Always include always-allowed pages
    const result = [...new Set([...ALWAYS_ALLOWED_PAGES, ...effective])]

    return res.json({ success: true, data: { allowedPages: result, isFullAccess: false } })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

export default router
