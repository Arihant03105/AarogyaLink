const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Referral = require('../models/Referral');
const AuditLog = require('../models/AuditLog');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/admin/analytics
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const [totalUsers, patients, doctors, ashas, pharmacies, appointments, prescriptions, referrals] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      User.countDocuments({ role: 'asha' }),
      User.countDocuments({ role: 'pharmacy' }),
      Appointment.countDocuments(),
      Prescription.countDocuments(),
      Referral.countDocuments(),
    ]);

    const pendingVerifications = await User.countDocuments({
      role: { $in: ['doctor', 'pharmacy'] },
      isVerified: false,
    });

    return res.json({
      success: true,
      analytics: {
        totalUsers,
        patients,
        doctors,
        ashas,
        pharmacies,
        pendingVerifications,
        totalConsultations: appointments,
        prescriptionsTotal: prescriptions,
        referralsTotal: referrals,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users
router.get('/users', verifyToken, async (req, res) => {
  try {
    const { role, isVerified } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';

    const users = await User.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, user: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/doctors/:id/verify
router.put('/doctors/:id/verify', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { isVerified, verificationStatus, reason } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified, verificationStatus, 'profileData.rejectionReason': reason },
      { new: true }
    );
    return res.json({ success: true, doctor: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/pharmacies/:id/verify
router.put('/pharmacies/:id/verify', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { isVerified, verificationStatus, reason } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified, verificationStatus, 'profileData.rejectionReason': reason },
      { new: true }
    );
    return res.json({ success: true, pharmacy: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', verifyToken, async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(20);
    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

