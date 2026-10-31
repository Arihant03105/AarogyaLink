const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  pharmacyId: { type: String, required: true },
  pharmacyName: { type: String },
  name: { type: String, required: true },
  genericName: { type: String, default: '' },
  category: { type: String, default: 'General' },
  price: { type: Number, required: true, default: 0 },
  stock: { type: Number, required: true, default: 0 },
  minStock: { type: Number, default: 5 },
  expiryDate: { type: String },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: ['available', 'low_stock', 'out_of_stock'],
    default: 'available',
  },
  isLiveVerified: { type: Boolean, default: false },
}, { timestamps: true });

medicineSchema.pre('save', function (next) {
  if (this.stock === 0) {
    this.status = 'out_of_stock';
  } else if (this.stock <= this.minStock) {
    this.status = 'low_stock';
  } else {
    this.status = 'available';
  }
  next();
});

module.exports = mongoose.model('Medicine', medicineSchema);

