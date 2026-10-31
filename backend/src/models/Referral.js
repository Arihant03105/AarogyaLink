const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  patientId: { type: String, required: true },
  patientName: { type: String },
  fromDoctorId: { type: String, required: true },
  toDoctorId: { type: String },
  toDoctorName: { type: String },
  hospitalName: { type: String, default: 'District Hospital' },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
  },
  notes: { type: String, default: '' },
  followUpDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Referral', referralSchema);

