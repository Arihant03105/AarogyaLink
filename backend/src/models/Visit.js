const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  patientName: { type: String },
  ashaId: { type: String, required: true },
  visitDate: { type: String, required: true },
  vitals: { type: mongoose.Schema.Types.Mixed, default: {} },
  observations: { type: String, required: true },
  nextVisitDate: { type: String },
  status: { type: String, default: 'completed' },
}, { timestamps: true });

module.exports = mongoose.model('Visit', visitSchema);

