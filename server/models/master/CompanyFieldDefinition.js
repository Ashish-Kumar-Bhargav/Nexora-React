import mongoose from 'mongoose'

const fieldDefSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true },
    module: { type: String, required: true },
    fieldKey: { type: String, required: true },
    fieldLabel: { type: String, required: true },
    fieldType: { type: String, enum: ['text', 'number', 'date', 'select', 'textarea'], default: 'text' },
    options: [String],
    required: { type: Boolean, default: false },
    showInPdf: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

fieldDefSchema.index({ companyId: 1, module: 1, fieldKey: 1 }, { unique: true })

export default mongoose.models.CompanyFieldDefinition ||
  mongoose.model('CompanyFieldDefinition', fieldDefSchema)
