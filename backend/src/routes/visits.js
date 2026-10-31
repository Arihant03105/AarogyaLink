const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');
const { verifyToken } = require('../middleware/auth');

// GET /api/visits
router.get('/', verifyToken, async (req, res) => {
  try {
    const { ashaId, patientId } = req.query;
    const filter = {};
    if (ashaId) filter.ashaId = ashaId;
    if (patientId) filter.patientId = patientId;

    const visits = await Visit.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, visits });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/visits
router.post('/', verifyToken, async (req, res) => {
  try {
    const visit = new Visit(req.body);
    await visit.save();
    return res.status(201).json({ success: true, visit });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

