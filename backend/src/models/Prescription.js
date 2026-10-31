const mongoose = require('mongoose');

const medicineItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, default: '' },
  frequency: { type: String, default: 'Once daily' },
  duration: { type: String, default: '5 days' },
  instructions: { type: String, default: 'After food' },
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  doctorId: { type: String, required: true },
  doctorName: { type: String },
  patientName: { type: String },
  appointmentId: { type: String },
  medicines: [medicineItemSchema],
  instructions: { type: String, default: '' },
  isDraft: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);

