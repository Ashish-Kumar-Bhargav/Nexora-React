import mongoose from 'mongoose'

const creditNoteSchema = new mongoose.Schema(
  {
    creditNoteNumber: String,
    invoiceId: { type: mongoose.Schema.Types.ObjectId },
    invoiceNumber: String,
    customerId: String,
    customerName: String,
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    notes: String,
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['draft', 'issued', 'applied'], default: 'draft' },
    issuedAt: Date,
    createdBy: String,
    createdByName: String,
  },
  { timestamps: true }
)

creditNoteSchema.pre('save', async function (next) {
  if (this.creditNoteNumber) return next()
  const count = await this.constructor.countDocuments()
  this.creditNoteNumber = `CN${String(count + 1).padStart(6, '0')}`
  next()
})

export function getCreditNoteModel(connection) {
  return connection.models.CreditNote || connection.model('CreditNote', creditNoteSchema)
}
