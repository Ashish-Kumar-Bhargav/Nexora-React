import mongoose from 'mongoose'

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    dbName: { type: String, required: true, unique: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    logo: { type: String, default: '' },
    signature: { type: String, default: '' },
    currency: { type: String, default: 'INR' },
    lowStockThreshold: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
    smtpHost: String,
    smtpPort: Number,
    smtpUser: String,
    smtpPass: String,
    smtpFrom: String,
    smtpFromName: String,
  },
  { timestamps: true }
)

export default mongoose.models.Company || mongoose.model('Company', companySchema)
