const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const Symptom = require('../models/Symptom');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Referral = require('../models/Referral');
const Medicine = require('../models/Medicine');
const Visit = require('../models/Visit');
const { verifyToken } = require('../middleware/auth');

// Map table_name from SQLite sync_queue to Mongoose Models
const MODEL_MAP = {
  patients: Patient,
  symptoms: Symptom,
  appointments: Appointment,
  prescriptions: Prescription,
  referrals: Referral,
  medicines: Medicine,
  visits: Visit,
};

// POST /api/sync/push
router.post('/push', verifyToken, async (req, res) => {
  try {
    const { operations } = req.body;
    if (!Array.isArray(operations)) {
      return res.status(400).json({ success: false, message: 'Invalid payload. Array of operations required.' });
    }

    const results = [];

    for (const op of operations) {
      const { id, operation_type, table_name, payload, record_id } = op;
      const Model = MODEL_MAP[table_name];

      if (!Model) {
        results.push({ id, success: false, error: `Unknown model table: ${table_name}` });
        continue;
      }

      try {
        if (operation_type === 'CREATE') {
          // Idempotent upsert by local id or payload ID
          const existing = await Model.findOne({
            $or: [{ _id: payload._id || record_id }, { id: record_id }],
          });

          if (!existing) {
            const doc = new Model(payload);
            await doc.save();
          }
          results.push({ id, success: true });
        } else if (operation_type === 'UPDATE') {
          await Model.findOneAndUpdate(
            { $or: [{ _id: record_id }, { id: record_id }] },
            payload,
            { new: true }
          );
          results.push({ id, success: true });
        } else {
          results.push({ id, success: true });
        }
      } catch (opErr) {
        results.push({ id, success: false, error: opErr.message });
      }
    }

    return res.json({ success: true, results });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/sync/pull
router.get('/pull', verifyToken, async (req, res) => {
  try {
    const { since } = req.query;
    const dateFilter = since ? { updatedAt: { $gt: new Date(since) } } : {};

    const [patients, appointments, prescriptions, medicines, referrals] = await Promise.all([
      Patient.find(dateFilter),
      Appointment.find(dateFilter),
      Prescription.find(dateFilter),
      Medicine.find(dateFilter),
      Referral.find(dateFilter),
    ]);

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        patients,
        appointments,
        prescriptions,
        medicines,
        referrals,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

