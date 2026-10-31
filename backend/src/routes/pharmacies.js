const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// GET /api/pharmacies
router.get('/', verifyToken, async (req, res) => {
  try {
    const pharmacies = await User.find({ role: 'pharmacy', isVerified: true });
    return res.json({ success: true, pharmacies });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

