const express = require('express');
const router = express.Router();
const Symptom = require('../models/Symptom');
const { verifyToken } = require('../middleware/auth');

// GET /api/symptoms
router.get('/', verifyToken, async (req, res) => {
  try {
    const { patientId, status } = req.query;
    const filter = {};
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;

    const symptoms = await Symptom.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, symptoms });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/symptoms
router.post('/', verifyToken, async (req, res) => {
  try {
    const symptom = new Symptom(req.body);
    await symptom.save();
    return res.status(201).json({ success: true, symptom });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/symptoms/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updated = await Symptom.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, symptom: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

