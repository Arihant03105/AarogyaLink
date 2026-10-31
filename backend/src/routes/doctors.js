const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// GET /api/doctors
router.get('/', verifyToken, async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor', isVerified: true });
    return res.json({ success: true, doctors });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

