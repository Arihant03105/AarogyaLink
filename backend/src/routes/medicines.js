const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const { verifyToken } = require('../middleware/auth');

// GET /api/medicines
router.get('/', verifyToken, async (req, res) => {
  try {
    const { pharmacyId, name, status } = req.query;
    const filter = {};
    if (pharmacyId) filter.pharmacyId = pharmacyId;
    if (name) {
      filter.$or = [
        { name: new RegExp(name, 'i') },
        { genericName: new RegExp(name, 'i') },
      ];
    }
    if (status) filter.status = status;

    const medicines = await Medicine.find(filter).sort({ name: 1 });
    return res.json({ success: true, medicines });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/medicines
router.post('/', verifyToken, async (req, res) => {
  try {
    const medicine = new Medicine(req.body);
    await medicine.save();
    return res.status(201).json({ success: true, medicine });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/medicines/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updated = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, medicine: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/medicines/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Medicine.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

