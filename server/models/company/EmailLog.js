import mongoose from 'mongoose'

const emailLogSchema = new mongoose.Schema(
  {
    documentType: { type: String, enum: ['invoice', 'quotation', 'purchase-order', 'credit-note'], required: true },
    documentId: mongoose.Schema.Types.ObjectId,
    documentNumber: String,
    to: [String],
    cc: [String],
    bcc: [String],
    subject: String,
    message: String,
    sentBy: String,
    sentByName: String,
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    error: String,
  },
  { timestamps: true }
)

export function getEmailLogModel(connection) {
  return connection.models.EmailLog || connection.model('EmailLog', emailLogSchema)
}
