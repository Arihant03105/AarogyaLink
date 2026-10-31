const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: String },
  user: { type: String, default: 'System' },
  action: { type: String, required: true },
  details: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);

