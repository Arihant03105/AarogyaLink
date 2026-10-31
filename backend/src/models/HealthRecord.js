const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  recordType: { type: String, default: 'Clinical Observation' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  fileUri: { type: String },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdBy: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);

