import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    code: { type: String },
    category: { type: String, required: true },
    description: { type: String },
    unit: { type: String, default: 'pcs' },
    basePrice: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 },
    status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'draft' },
    requiresApproval: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalNotes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

productSchema.pre('save', async function (next) {
  if (this.code) return next()
  const count = await mongoose.model('Product').countDocuments({ companyId: this.companyId })
  this.code = `PRD${String(count + 1).padStart(6, '0')}`
  next()
})

export default mongoose.models.Product || mongoose.model('Product', productSchema)
