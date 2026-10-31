const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const { verifyToken } = require('../middleware/auth');

// GET /api/appointments
router.get('/', verifyToken, async (req, res) => {
  try {
    const { doctorId, patientId, status } = req.query;
    const filter = {};
    if (doctorId) filter.doctorId = doctorId;
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;

    const appointments = await Appointment.find(filter).sort({ createdAt: -1 });
    return res.json({ success: true, appointments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/appointments
router.post('/', verifyToken, async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    await appointment.save();
    return res.status(201).json({ success: true, appointment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/appointments/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updated = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, appointment: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

