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

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String },
    quotationId: { type: mongoose.Schema.Types.ObjectId },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    items: [itemSchema],
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'partially_paid', 'paid', 'cancelled'], default: 'draft' },
    dueDate: Date,
    paidAt: Date,
    notes: String,
    currency: { type: String, default: 'INR' },
    customFields: { type: Map, of: String, default: {} },
    createdBy: String,
    createdByName: String,
  },
  { timestamps: true }
)

invoiceSchema.pre('save', async function (next) {
  if (this.invoiceNumber) return next()
  const count = await this.constructor.countDocuments()
  this.invoiceNumber = `INV${String(count + 1).padStart(6, '0')}`
  next()
})

export function getInvoiceModel(connection) {
  return connection.models.Invoice || connection.model('Invoice', invoiceSchema)
}
