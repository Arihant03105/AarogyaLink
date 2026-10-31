const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String },
  doctorName: { type: String },
  scheduledAt: { type: Date },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'requested',
  },
  notes: { type: String, default: '' },
  consultationNotes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);

