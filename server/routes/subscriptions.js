import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectMasterDB } from '../lib/mongodb.js'
import Company from '../models/master/Company.js'
import { PLAN_DETAILS, PLAN_PAGES, ROLE_HIERARCHY } from '../lib/permissions.js'

const router = Router()

// GET /api/subscriptions/plans — public, returns all plan info
router.get('/plans', (_req, res) => {
  const plans = Object.entries(PLAN_DETAILS).map(([id, p]) => ({ id, ...p }))
  return res.json({ success: true, data: { plans } })
})

// All routes below require authentication
router.use(authenticate)

// GET /api/subscriptions/current — current company's subscription
router.get('/current', async (req, res) => {
  try {
    if (!req.user.companyId) return res.status(400).json({ success: false, message: 'No company associated' })
    await connectMasterDB()
    const company = await Company.findById(req.user.companyId).select('subscription allowedPages name').lean()
    if (!company) return res.status(404).json({ success: false, message: 'Company not found' })

    const planKey = company.subscription?.plan || 'free'
    return res.json({
      success: true,
      data: {
        subscription: {
          ...(company.subscription || {}),
          plan: planKey,
          planInfo: PLAN_DETAILS[planKey],
        },
        companyName: company.name,
      },
    })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/subscriptions/upgrade — admin upgrades their own company's plan (dummy payment)
router.post('/upgrade', async (req, res) => {
  try {
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }
    if (!req.user.companyId) return res.status(400).json({ success: false, message: 'No company associated' })

    const { plan } = req.body
    if (!plan || !PLAN_DETAILS[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' })
    }

    await connectMasterDB()

    const subscription = {
      plan,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      transactionId: `TXN${Date.now()}`,
    }

    const updated = await Company.findByIdAndUpdate(
      req.user.companyId,
      { subscription, allowedPages: PLAN_PAGES[plan] },
      { new: true }
    ).select('subscription allowedPages name').lean()

    if (!updated) return res.status(404).json({ success: false, message: 'Company not found' })

    return res.json({
      success: true,
      message: `Successfully upgraded to ${PLAN_DETAILS[plan].name} plan`,
      data: {
        subscription: { ...updated.subscription, planInfo: PLAN_DETAILS[plan] },
        allowedPages: updated.allowedPages,
      },
    })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/subscriptions/upgrade/:companyId — super_admin upgrades any company
router.post('/upgrade/:companyId', async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super admin access required' })
    }

    const { plan } = req.body
    if (!plan || !PLAN_DETAILS[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' })
    }

    await connectMasterDB()

    const subscription = {
      plan,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      transactionId: `TXN${Date.now()}`,
    }

    const updated = await Company.findByIdAndUpdate(
      req.params.companyId,
      { subscription, allowedPages: PLAN_PAGES[plan] },
      { new: true }
    ).select('subscription allowedPages name').lean()

    if (!updated) return res.status(404).json({ success: false, message: 'Company not found' })

    return res.json({
      success: true,
      message: `${updated.name} upgraded to ${PLAN_DETAILS[plan].name} plan`,
      data: {
        subscription: { ...updated.subscription, planInfo: PLAN_DETAILS[plan] },
        allowedPages: updated.allowedPages,
      },
    })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
