import { Router } from 'express'
import crypto from 'crypto'
import { connectMasterDB } from '../lib/mongodb.js'
import User from '../models/master/User.js'
import Company from '../models/master/Company.js'
import { comparePassword, hashPassword, signToken, authenticate } from '../lib/auth.js'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    await connectMasterDB()
    const { identifier, password, companyId } = req.body

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Email/phone and password required' })
    }

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
      isActive: true,
    })
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' })

    const isValid = await comparePassword(password, user.password)
    if (!isValid) return res.status(401).json({ success: false, message: 'Invalid credentials' })

    const userCompanies = user.companies?.filter(c => c.isActive) || []
    let selectedCompany = null
    let companyDbName = ''
    let companyRole = user.role

    if (user.role === 'super_admin') {
      selectedCompany = companyId
        ? await Company.findById(companyId)
        : await Company.findOne({ isActive: true }).sort({ createdAt: 1 })
      if (selectedCompany) companyDbName = selectedCompany.dbName || ''
      companyRole = 'super_admin'
    } else {
      if (userCompanies.length === 0) {
        return res.status(403).json({ success: false, message: 'No company access assigned' })
      }
      const targetMapping = companyId
        ? userCompanies.find(c => c.companyId.toString() === companyId)
        : userCompanies[0]
      if (!targetMapping) {
        return res.status(403).json({ success: false, message: 'Company access denied' })
      }
      selectedCompany = await Company.findById(targetMapping.companyId)
      if (!selectedCompany || !selectedCompany.isActive) {
        return res.status(404).json({ success: false, message: 'Company not found or inactive' })
      }
      companyDbName = selectedCompany.dbName
      companyRole = targetMapping.role || user.role
    }

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() })

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: companyRole,
      companyId: selectedCompany?._id?.toString() || '',
      companyName: selectedCompany?.name || 'Master',
      dbName: companyDbName,
    }
    const token = signToken(tokenPayload)

    let companiesList = []
    if (user.role === 'super_admin') {
      const all = await Company.find({ isActive: true }, { _id: 1, name: 1 }).lean()
      companiesList = all.map(c => ({ companyId: c._id, name: c.name }))
    } else {
      companiesList = await Promise.all(
        userCompanies.map(async c => {
          const comp = await Company.findById(c.companyId, { name: 1 }).lean()
          return { companyId: c.companyId, name: comp?.name || '', role: c.role }
        })
      )
    }

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: companyRole,
          companyId: selectedCompany?._id || null,
          companyName: selectedCompany?.name || 'Master',
          companiesCount: companiesList.length,
        },
        companies: companiesList,
        requireCompanySelect: false,
      },
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
})

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    await connectMasterDB()
    const { companyName, companyCode, companyEmail, companyPhone, companyAddress, gstNumber, logo, signature,
      adminName, adminEmail, adminPhone, adminPassword } = req.body

    if (!companyName || !companyCode || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, message: 'Company name, code, admin name, email and password are required' })
    }
    if (adminPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })
    }

    const code = companyCode.toUpperCase().replace(/\s+/g, '').slice(0, 10)

    const existing = await Company.findOne({ code })
    if (existing) return res.status(409).json({ success: false, message: `Company code "${code}" is already taken.` })

    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() })
    if (existingUser) return res.status(409).json({ success: false, message: 'An account with this email already exists.' })

    const dbName = `nexora_${code.toLowerCase()}`
    const company = await Company.create({
      name: companyName.trim(), code, dbName,
      address: companyAddress?.trim() || '', phone: companyPhone?.trim() || '',
      email: companyEmail?.trim().toLowerCase() || '', gstNumber: gstNumber?.trim() || '',
      logo: logo || undefined, signature: signature || undefined, isActive: true,
    })

    const hashedPassword = await hashPassword(adminPassword)
    const user = await User.create({
      name: adminName.trim(), email: adminEmail.trim().toLowerCase(),
      phone: adminPhone?.trim() || undefined, password: hashedPassword,
      role: 'admin',
      companies: [{ companyId: company._id, role: 'admin', permissions: {}, isActive: true }],
      isActive: true,
    })

    return res.status(201).json({
      success: true,
      message: 'Company registered successfully! You can now log in.',
      data: {
        company: { id: company._id, name: company.name, code: company.code },
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      },
    })
  } catch (err) {
    console.error('Register error:', err)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0]
      return res.status(409).json({ success: false, message: `${field === 'code' ? 'Company code' : 'Email'} already exists.` })
    }
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    await connectMasterDB()
    const user = await User.findById(req.user.userId).select('-password')
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    return res.json({
      success: true,
      message: 'User info retrieved',
      data: {
        id: user._id, name: user.name, email: user.email, phone: user.phone,
        role: req.user.role, companyId: req.user.companyId,
        companyName: req.user.companyName, dbName: req.user.dbName,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/auth/logout  GET /api/auth/logout
const logout = (req, res) => {
  res.cookie('token', '', { httpOnly: true, maxAge: 0, path: '/' })
  return res.json({ success: true, message: 'Logged out successfully' })
}
router.post('/logout', logout)
router.get('/logout', logout)

// POST /api/auth/switch-company
router.post('/switch-company', authenticate, async (req, res) => {
  try {
    const { targetCompanyId } = req.body
    if (!targetCompanyId) return res.status(400).json({ success: false, message: 'targetCompanyId is required' })

    await connectMasterDB()
    const user = await User.findById(req.user.userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    let companyRole = req.user.role
    let targetCompany

    if (user.role === 'super_admin') {
      targetCompany = await Company.findOne({ _id: targetCompanyId, isActive: true })
      companyRole = 'super_admin'
    } else {
      const userCompanies = user.companies?.filter(c => c.isActive) || []
      const mapping = userCompanies.find(c => c.companyId.toString() === targetCompanyId)
      if (!mapping) return res.status(403).json({ success: false, message: 'Access denied to this company' })
      targetCompany = await Company.findOne({ _id: targetCompanyId, isActive: true })
      companyRole = mapping.role || user.role
    }

    if (!targetCompany) return res.status(404).json({ success: false, message: 'Company not found or inactive' })

    let companiesList = []
    if (user.role === 'super_admin') {
      const all = await Company.find({ isActive: true }, { _id: 1, name: 1 }).lean()
      companiesList = all.map(c => ({ companyId: c._id, name: c.name }))
    } else {
      const userCompanies = user.companies?.filter(c => c.isActive) || []
      companiesList = await Promise.all(
        userCompanies.map(async c => {
          const comp = await Company.findById(c.companyId, { name: 1 }).lean()
          return { companyId: c.companyId, name: comp?.name || '', role: c.role }
        })
      )
    }

    const newToken = signToken({
      userId: user._id.toString(), email: user.email, name: user.name,
      role: companyRole, companyId: targetCompany._id.toString(),
      companyName: targetCompany.name, dbName: targetCompany.dbName,
    })

    res.cookie('token', newToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    return res.json({
      success: true,
      message: 'Company switched successfully',
      data: {
        token: newToken,
        user: { id: user._id, name: user.name, email: user.email, role: companyRole, companyId: targetCompany._id, companyName: targetCompany.name, companiesCount: companiesList.length },
        companies: companiesList,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' })

    await connectMasterDB()
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000)
    await User.findByIdAndUpdate(user._id, { resetToken: token, resetTokenExpiry: expiry })

    const baseUrl = process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 5173}`
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    const devData = process.env.NODE_ENV !== 'production' ? { resetToken: token, resetUrl } : undefined

    return res.json({
      success: true,
      message: 'If that email exists, a reset link has been sent.',
      ...(devData && { dev: devData }),
    })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token and password are required' })
    if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' })

    await connectMasterDB()
    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } })
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset link' })

    const hashed = await hashPassword(password)
    await User.findByIdAndUpdate(user._id, { password: hashed, $unset: { resetToken: '', resetTokenExpiry: '' } })

    return res.json({ success: true, message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

export default router
