require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aarogya_link';

console.log('Connecting to MongoDB database at:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB cloud / local database');
  })
  .catch((err) => {
    console.warn('⚠️ MongoDB connection warning (app will run with in-memory or offline handling if local DB unavailable):', err.message);
  });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 AAROGYA LINK Backend running on http://0.0.0.0:${PORT}`);
});

