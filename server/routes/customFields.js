import { Router } from 'express'
import { authenticate } from '../lib/auth.js'
import { connectMasterDB } from '../lib/mongodb.js'
import CompanyFieldDefinition from '../models/master/CompanyFieldDefinition.js'

const router = Router()
router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { module } = req.query
    await connectMasterDB()
    const query = { companyId: req.user.companyId, isActive: true }
    if (module) query.module = module
    const fields = await CompanyFieldDefinition.find(query).sort({ sortOrder: 1, createdAt: 1 }).lean()
    return res.json({ success: true, data: { fields } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.post('/', async (req, res) => {
  try {
    if (!['super_admin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admin access required' })
    const { module, fieldLabel, fieldType, options, required, showInPdf, sortOrder } = req.body
    if (!module || !fieldLabel) return res.status(400).json({ success: false, message: 'Module and field label are required' })

    const fieldKey = fieldLabel.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    await connectMasterDB()

    const field = await CompanyFieldDefinition.create({
      companyId: req.user.companyId, module, fieldKey, fieldLabel,
      fieldType: fieldType || 'text',
      options: fieldType === 'select' ? (options || []) : [],
      required: required || false,
      showInPdf: showInPdf !== false,
      sortOrder: sortOrder || 0,
    })
    return res.status(201).json({ success: true, message: 'Custom field created', data: { field } })
  } catch (err) {
    if (err.message.includes('duplicate key') || err.message.includes('E11000')) return res.status(409).json({ success: false, message: 'A field with this name already exists for this module' })
    return res.status(500).json({ success: false, message: err.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    if (!['super_admin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admin access required' })
    await connectMasterDB()
    const { fieldLabel, fieldType, options, required, showInPdf, sortOrder, isActive } = req.body
    const field = await CompanyFieldDefinition.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      {
        ...(fieldLabel !== undefined && { fieldLabel }),
        ...(fieldType !== undefined && { fieldType }),
        ...(options !== undefined && { options }),
        ...(required !== undefined && { required }),
        ...(showInPdf !== undefined && { showInPdf }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true }
    )
    if (!field) return res.status(404).json({ success: false, message: 'Field not found' })
    return res.json({ success: true, message: 'Field updated', data: { field } })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    if (!['super_admin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, message: 'Admin access required' })
    await connectMasterDB()
    const field = await CompanyFieldDefinition.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { isActive: false },
      { new: true }
    )
    if (!field) return res.status(404).json({ success: false, message: 'Field not found' })
    return res.json({ success: true, message: 'Field removed' })
  } catch (err) { return res.status(500).json({ success: false, message: err.message }) }
})

export default router
