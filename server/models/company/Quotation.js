import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema({
  productId: String,
  productName: String,
  productCode: String,
  quantity: Number,
  unitPrice: Number,
  taxRate: { type: Number, default: 0 },
  taxAmount: Number,
  total: Number,
}, { _id: false })

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: String,
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    items: [itemSchema],
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected', 'converted'], default: 'draft' },
    validUntil: Date,
    notes: String,
    customFields: { type: Map, of: String, default: {} },
    approvedBy: String,
    approvedByName: String,
    createdBy: String,
    createdByName: String,
  },
  { timestamps: true }
)

quotationSchema.pre('save', async function (next) {
  if (this.quotationNumber) return next()
  const count = await this.constructor.countDocuments()
  this.quotationNumber = `QT${String(count + 1).padStart(6, '0')}`
  next()
})

export function getQuotationModel(connection) {
  return connection.models.Quotation || connection.model('Quotation', quotationSchema)
}
