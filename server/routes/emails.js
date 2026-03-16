import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectCompanyDB, connectMasterDB } from '../lib/mongodb.js'
import { getEmailLogModel } from '../models/company/EmailLog.js'
import Company from '../models/master/Company.js'
import { ROLE_HIERARCHY } from '../lib/permissions.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    if (!req.user.dbName) return res.status(400).json({ success: false, message: 'No company database' })
    const { page = 1, limit = 20, documentType, search } = req.query
    const companyConn = await connectCompanyDB(req.user.dbName)
    const EmailLogModel = getEmailLogModel(companyConn)
    const query = {}
    if (documentType) query.documentType = documentType
    if (search) query.$or = [{ documentNumber: { $regex: search, $options: 'i' } }, { subject: { $regex: search, $options: 'i' } }, { to: { $elemMatch: { $regex: search, $options: 'i' } } }]
    const [logs, total] = await Promise.all([
      EmailLogModel.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean(),
      EmailLogModel.countDocuments(query),
    ])
    return res.json({ success: true, message: 'Email logs retrieved', data: { logs, total, page: Number(page), limit: Number(limit) } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

// POST /api/emails/test
router.post('/test', async (req, res) => {
  try {
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY['admin']) return res.status(403).json({ success: false, message: 'Admin access required' })
    if (!req.user.companyId) return res.status(400).json({ success: false, message: 'No company' })
    const { to } = req.body
    if (!to) return res.status(400).json({ success: false, message: 'Recipient email required' })
    await connectMasterDB()
    const company = await Company.findById(req.user.companyId).lean()
    if (!company?.smtpHost || !company?.smtpUser || !company?.smtpPass) return res.status(400).json({ success: false, message: 'SMTP not configured. Save settings first.' })

    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      host: company.smtpHost, port: company.smtpPort || 587, secure: (company.smtpPort || 587) === 465,
      auth: { user: company.smtpUser, pass: company.smtpPass },
    })
    await transporter.verify()
    await transporter.sendMail({
      from: `"${company.smtpFromName || company.name}" <${company.smtpFrom || company.smtpUser}>`,
      to, subject: 'SmartBilling — SMTP Test',
      html: `<p>This is a test email from <strong>${company.name}</strong> via SmartBilling.</p><p>Your SMTP configuration is working correctly!</p>`,
    })
    return res.json({ success: true, message: `Test email sent to ${to}` })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
