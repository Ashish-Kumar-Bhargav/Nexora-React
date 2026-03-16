import mongoose from 'mongoose'

const supplierSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true },
    contactPerson: String,
    phone: String,
    email: String,
    address: String,
    gstNumber: String,
    bankAccount: String,
    bankIfsc: String,
    paymentTerms: String,
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export default mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema)
