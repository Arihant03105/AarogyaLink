const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const HealthRecord = require('../models/HealthRecord');
const Prescription = require('../models/Prescription');
const { verifyToken } = require('../middleware/auth');

// GET /api/patients
router.get('/', verifyToken, async (req, res) => {
  try {
    const { ashaId, doctorId, village } = req.query;
    const filter = {};
    if (ashaId) filter.ashaId = ashaId;
    if (village) filter.village = new RegExp(village, 'i');

    const patients = await Patient.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, patients });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/patients
router.post('/', verifyToken, async (req, res) => {
  try {
    const patientData = req.body;
    const patient = new Patient(patientData);
    await patient.save();
    return res.status(201).json({ success: true, patient });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
    return res.json({ success: true, patient });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/:id/health-records
router.get('/:id/health-records', verifyToken, async (req, res) => {
  try {
    const records = await HealthRecord.find({ patientId: req.params.id }).sort({ createdAt: -1 });
    return res.json({ success: true, records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/patients/:id/prescriptions
router.get('/:id/prescriptions', verifyToken, async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ patientId: req.params.id }).sort({ createdAt: -1 });
    return res.json({ success: true, prescriptions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

