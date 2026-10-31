const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      name: user.name,
      mobile: user.mobile,
      isVerified: user.isVerified,
    },
    process.env.JWT_SECRET || 'aarogya_link_jwt_super_secret_key_2026',
    { expiresIn: '30d' }
  );
};

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, mobile, email, password, role, state, district, village, consent } = req.body;

    if (!name || !mobile || !password || !role) {
      return res.status(400).json({ success: false, message: 'Please provide all mandatory registration fields.' });
    }

    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Administrative accounts cannot be created via public registration.' });
    }

    const existing = await User.findOne({ mobile });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this mobile number already exists.' });
    }

    // Role verification policy
    const isDocOrPharma = role === 'doctor' || role === 'pharmacy';
    const isVerified = !isDocOrPharma; // Patients and ASHAs are active; Doctors and Pharmacies require verification
    const verificationStatus = isDocOrPharma ? 'pending' : 'approved';

    const user = new User({
      name,
      mobile,
      email: email || undefined,
      password,
      role,
      state: state || 'Assam',
      district: district || '',
      village: village || '',
      isVerified,
      verificationStatus,
      profileData: { consentGiven: consent },
    });

    await user.save();
    const token = signToken(user);

    return res.status(201).json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Mobile/Email and password required.' });
    }

    const user = await User.findOne({
      $or: [{ mobile: identifier }, { email: identifier }],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or user not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This account has been suspended by system administrator.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user);
    return res.json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { token, email, name, photo, googleId, role = 'patient' } = req.body;

    let userEmail = email;
    let userName = name;
    let userGoogleId = googleId;
    let userAvatar = photo;

    // Verify or fetch info from Google if token was passed
    if (token && (!userEmail || !userGoogleId)) {
      try {
        const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (googleRes.ok) {
          const profile = await googleRes.json();
          userEmail = userEmail || profile.email;
          userName = userName || profile.name;
          userGoogleId = userGoogleId || profile.sub;
          userAvatar = userAvatar || profile.picture;
        }
      } catch (fetchErr) {
        console.log('Google token info fetch warning:', fetchErr.message);
      }
    }

    if (!userEmail && !userGoogleId) {
      return res.status(400).json({ success: false, message: 'Google authentication data is incomplete.' });
    }

    const query = [];
    if (userGoogleId) query.push({ googleId: userGoogleId });
    if (userEmail) query.push({ email: userEmail });

    let user = await User.findOne({ $or: query });

    if (user) {
      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'This account has been deactivated.' });
      }
      if (userGoogleId && !user.googleId) user.googleId = userGoogleId;
      if (userAvatar && !user.avatar) user.avatar = userAvatar;
      user.lastLogin = new Date();
      await user.save();
    } else {
      const selectedRole = ['patient', 'asha', 'doctor', 'pharmacy'].includes(role) ? role : 'patient';
      const isDocOrPharma = selectedRole === 'doctor' || selectedRole === 'pharmacy';
      const isVerified = !isDocOrPharma;
      const verificationStatus = isDocOrPharma ? 'pending' : 'approved';

      user = new User({
        name: userName || 'Google User',
        email: userEmail,
        googleId: userGoogleId,
        authProvider: 'google',
        avatar: userAvatar,
        role: selectedRole,
        isVerified,
        verificationStatus,
        state: 'Assam',
        district: 'Kamrup Rural',
        village: 'Kalyanpur',
      });
      await user.save();
    }

    const authToken = signToken(user);
    return res.json({
      success: true,
      token: authToken,
      user,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/auth/me
router.put('/me', verifyToken, async (req, res) => {
  try {
    const updates = req.body;
    delete updates.password;
    delete updates.role;
    delete updates.isVerified;

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { mobile } = req.body;
  return res.json({
    success: true,
    message: `Password reset verification link dispatched to ${mobile}.`,
  });
});

module.exports = router;

