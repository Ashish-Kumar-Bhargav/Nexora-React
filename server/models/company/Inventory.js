import mongoose from 'mongoose'

const inventorySchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    productCode: { type: String, default: '' },
    type: { type: String, enum: ['stock_in', 'stock_out', 'transfer'], required: true },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    reference: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: String,
    createdByName: String,
  },
  { timestamps: true }
)

export function getInventoryModel(connection) {
  return connection.models.Inventory || connection.model('Inventory', inventorySchema)
}
