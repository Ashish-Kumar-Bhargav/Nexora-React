import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    contactPerson: String,
    phone: String,
    email: String,
    address: String,
    gstNumber: String,
    customFields: { type: Map, of: String, default: {} },
    isActive: { type: Boolean, default: true },
    createdBy: String,
  },
  { timestamps: true }
)

export function getCustomerModel(connection) {
  return connection.models.Customer || connection.model('Customer', customerSchema)
}
