const express = require('express');
const router = express.Router();
const Referral = require('../models/Referral');
const { verifyToken } = require('../middleware/auth');

// GET /api/referrals
router.get('/', verifyToken, async (req, res) => {
  try {
    const { patientId, toDoctorId, ashaId, status } = req.query;
    const filter = {};
    if (patientId) filter.patientId = patientId;
    if (toDoctorId) filter.toDoctorId = toDoctorId;
    if (ashaId) filter.fromDoctorId = ashaId;
    if (status) filter.status = status;

    const referrals = await Referral.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, referrals });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/referrals
router.post('/', verifyToken, async (req, res) => {
  try {
    const referral = new Referral(req.body);
    await referral.save();
    return res.status(201).json({ success: true, referral });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/referrals/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updated = await Referral.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, referral: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

