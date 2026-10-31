const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  submittedBy: { type: String },
  symptoms: { type: String, required: true },
  duration: { type: String },
  medicalHistory: { type: String, default: '' },
  imageUris: [{ type: String }],
  audioUri: { type: String },
  notes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'closed'],
    default: 'submitted',
  },
  doctorResponse: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Symptom', symptomSchema);

