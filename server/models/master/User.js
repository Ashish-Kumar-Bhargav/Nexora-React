import mongoose from 'mongoose'

const userCompanySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  role: { type: String, enum: ['user', 'manager', 'admin', 'super_admin'], default: 'user' },
  permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
}, { _id: false })

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'manager', 'admin', 'super_admin'], default: 'user' },
    companies: [userCompanySchema],
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.models.User || mongoose.model('User', userSchema)
