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

const recurringInvoiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    items: [itemSchema],
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'], required: true },
    dayOfMonth: Number,
    startDate: { type: Date, required: true },
    endDate: Date,
    nextRunDate: Date,
    lastGeneratedAt: Date,
    invoicesGenerated: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    notes: String,
    currency: { type: String, default: 'INR' },
    createdBy: String,
    createdByName: String,
  },
  { timestamps: true }
)

export function getRecurringInvoiceModel(connection) {
  return connection.models.RecurringInvoice || connection.model('RecurringInvoice', recurringInvoiceSchema)
}
