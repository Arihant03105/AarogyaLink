const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// GET /api/notifications
router.get('/', verifyToken, async (req, res) => {
  return res.json({
    success: true,
    notifications: [
      {
        id: 'notif_1',
        title: 'Welcome to AAROGYA LINK',
        body: 'Your digital healthcare and community assistance connection is active.',
        createdAt: new Date().toISOString(),
        isRead: false,
      },
      {
        id: 'notif_2',
        title: 'Offline Sync Ready',
        body: 'SQLite local storage is initialized. You can work without internet in remote villages.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        isRead: true,
      },
    ],
  });
});

module.exports = router;

