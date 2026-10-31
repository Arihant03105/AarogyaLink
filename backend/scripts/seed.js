require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Patient = require('../src/models/Patient');
const Medicine = require('../src/models/Medicine');
const Appointment = require('../src/models/Appointment');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aarogya_link';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB for seeding...');

  // Clean existing demo users
  await User.deleteMany({
    mobile: { $in: ['9000000001', '9000000002', '9000000003', '9000000004', '9000000005'] },
  });

  const users = [
    {
      name: 'Ramesh Das',
      mobile: '9000000001',
      password: 'patient123',
      role: 'patient',
      state: 'Assam',
      district: 'Kamrup Rural',
      village: 'Kalyanpur',
      isVerified: true,
      verificationStatus: 'approved',
      profileData: { bloodGroup: 'O+', allergies: 'None' },
    },
    {
      name: 'Manju Devi',
      mobile: '9000000002',
      password: 'asha123',
      role: 'asha',
      state: 'Assam',
      district: 'Kamrup Rural',
      village: 'Kalyanpur',
      isVerified: true,
      verificationStatus: 'approved',
      profileData: { jurisdiction: 'Sub-Centre East' },
    },
    {
      name: 'Dr. Anita Sharma',
      mobile: '9000000003',
      password: 'doctor123',
      role: 'doctor',
      state: 'Assam',
      district: 'Kamrup Rural',
      village: 'PHC Centre',
      isVerified: true,
      verificationStatus: 'approved',
      profileData: {
        specialization: 'MBBS, MD (Community Medicine)',
        regNumber: 'SMC-AS-19842',
        experience: '9 Years',
      },
    },
    {
      name: 'Kalyan Jan Aushadhi Kendra',
      mobile: '9000000004',
      password: 'pharma123',
      role: 'pharmacy',
      state: 'Assam',
      district: 'Kamrup Rural',
      village: 'Market Road',
      isVerified: true,
      verificationStatus: 'approved',
      profileData: {
        licenseNumber: 'DL-AS-2023-9091',
        pharmacistName: 'Kamal Nath (D.Pharm)',
      },
    },
    {
      name: 'System Administrator',
      mobile: '9000000005',
      password: 'admin123',
      role: 'admin',
      state: 'Assam',
      district: 'Kamrup Rural',
      village: 'District HQ',
      isVerified: true,
      verificationStatus: 'approved',
    },
  ];

  for (const u of users) {
    const user = new User(u);
    await user.save();
    console.log(`Created demo user: ${u.role} (${u.mobile})`);
  }

  // Seed sample medicines for pharmacy
  await Medicine.deleteMany({ pharmacyName: 'Kalyan Jan Aushadhi Kendra' });
  const sampleMedicines = [
    {
      pharmacyId: 'pharma_kalyan_01',
      pharmacyName: 'Kalyan Jan Aushadhi Kendra',
      name: 'Paracetamol 650mg',
      genericName: 'Acetaminophen',
      category: 'Analgesic / Antipyretic',
      price: 18.0,
      stock: 120,
      minStock: 10,
      expiryDate: '2027-11-30',
      status: 'available',
      isLiveVerified: true,
    },
    {
      pharmacyId: 'pharma_kalyan_01',
      pharmacyName: 'Kalyan Jan Aushadhi Kendra',
      name: 'Amoxicillin + Clavulanic Acid 625mg',
      genericName: 'Amoxicillin and Potassium Clavulanate',
      category: 'Antibiotic',
      price: 65.0,
      stock: 40,
      minStock: 8,
      expiryDate: '2026-08-31',
      status: 'available',
      isLiveVerified: true,
    },
    {
      pharmacyId: 'pharma_kalyan_01',
      pharmacyName: 'Kalyan Jan Aushadhi Kendra',
      name: 'Cetirizine 10mg Tablets',
      genericName: 'Cetirizine Hydrochloride',
      category: 'Antihistamine',
      price: 12.5,
      stock: 3,
      minStock: 10,
      expiryDate: '2027-04-30',
      status: 'low_stock',
      isLiveVerified: true,
    },
    {
      pharmacyId: 'pharma_kalyan_01',
      pharmacyName: 'Kalyan Jan Aushadhi Kendra',
      name: 'Oral Rehydration Salts (ORS) WHO Formula',
      genericName: 'Electrolytes & Glucose',
      category: 'Vitamins & Minerals',
      price: 21.0,
      stock: 0,
      minStock: 15,
      expiryDate: '2028-01-31',
      status: 'out_of_stock',
      isLiveVerified: true,
    },
  ];

  for (const m of sampleMedicines) {
    const med = new Medicine(m);
    await med.save();
  }
  console.log('Seeded sample medicines');

  console.log('✅ Database seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});

