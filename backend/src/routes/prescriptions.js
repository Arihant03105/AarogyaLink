const express = require('express');
const router = express.Router();
const Prescription = require('../models/Prescription');
const { verifyToken } = require('../middleware/auth');

// GET /api/prescriptions
router.get('/', verifyToken, async (req, res) => {
  try {
    const { doctorId, patientId } = req.query;
    const filter = {};
    if (doctorId) filter.doctorId = doctorId;
    if (patientId) filter.patientId = patientId;

    const prescriptions = await Prescription.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, prescriptions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/prescriptions
router.post('/', verifyToken, async (req, res) => {
  try {
    const prescription = new Prescription(req.body);
    await prescription.save();
    return res.status(201).json({ success: true, prescription });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

