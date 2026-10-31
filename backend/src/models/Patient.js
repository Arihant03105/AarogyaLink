const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ashaId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, default: 'Other' },
  mobile: { type: String },
  village: { type: String, required: true },
  district: { type: String },
  state: { type: String, default: 'Assam' },
  bloodGroup: { type: String, default: 'Unknown' },
  allergies: { type: String, default: '' },
  medicalHistory: { type: String, default: '' },
  emergencyContact: { type: String, default: '' },
  emergencyPhone: { type: String, default: '' },
  consent: { type: Boolean, default: true },
  patientCode: { type: String, unique: true },
  profileData: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

patientSchema.pre('save', function (next) {
  if (!this.patientCode) {
    this.patientCode = `AAPL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }
  next();
});

module.exports = mongoose.model('Patient', patientSchema);

