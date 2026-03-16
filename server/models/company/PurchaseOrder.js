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
  receivedQty: { type: Number, default: 0 },
}, { _id: false })

const poSchema = new mongoose.Schema(
  {
    poNumber: String,
    supplierId: { type: String, required: true },
    supplierName: { type: String, required: true },
    items: [itemSchema],
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'sent', 'partial', 'received', 'cancelled'], default: 'draft' },
    expectedDelivery: Date,
    receivedAt: Date,
    notes: String,
    createdBy: String,
    createdByName: String,
  },
  { timestamps: true }
)

poSchema.pre('save', async function (next) {
  if (this.poNumber) return next()
  const count = await this.constructor.countDocuments()
  this.poNumber = `PO${String(count + 1).padStart(6, '0')}`
  next()
})

export function getPurchaseOrderModel(connection) {
  return connection.models.PurchaseOrder || connection.model('PurchaseOrder', poSchema)
}
