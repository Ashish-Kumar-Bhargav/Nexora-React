import mongoose from 'mongoose'

const activityLogSchema = new mongoose.Schema(
  {
    userId: String,
    userName: String,
    action: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'BULK_UPLOAD'], required: true },
    module: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export function getActivityLogModel(connection) {
  return connection.models.ActivityLog || connection.model('ActivityLog', activityLogSchema)
}
