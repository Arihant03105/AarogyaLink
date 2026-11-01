import { Platform } from 'react-native';

// expo-sqlite is NOT available on web — lazy-load only on native
let SQLite = null;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

let db = null;
let initPromise = null;

export const getDB = async () => {
  if (Platform.OS === 'web') return null;
  if (!db) {
    db = await SQLite.openDatabaseAsync('aarogya_link.db');
  }
  return db;
};

export const initDatabase = async () => {
  if (Platform.OS === 'web') return null;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const database = await getDB();

    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
    `);

  // Users / auth cache
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      name TEXT NOT NULL,
      mobile TEXT,
      email TEXT,
      role TEXT NOT NULL,
      state TEXT,
      district TEXT,
      village TEXT,
      profile_data TEXT,
      is_verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'synced'
    );
  `);

  // Patients
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      user_id TEXT,
      asha_id TEXT,
      name TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      mobile TEXT,
      village TEXT,
      district TEXT,
      state TEXT,
      blood_group TEXT,
      allergies TEXT,
      medical_history TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      consent INTEGER DEFAULT 0,
      patient_code TEXT,
      profile_data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'pending',
      sync_retry INTEGER DEFAULT 0
    );
  `);

  // Symptoms
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS symptoms (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      patient_id TEXT NOT NULL,
      submitted_by TEXT,
      symptoms TEXT NOT NULL,
      duration TEXT,
      medical_history TEXT,
      image_uris TEXT,
      audio_uri TEXT,
      notes TEXT,
      status TEXT DEFAULT 'submitted',
      doctor_response TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'pending',
      sync_retry INTEGER DEFAULT 0
    );
  `);

  // Appointments
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      status TEXT DEFAULT 'requested',
      scheduled_at TEXT,
      notes TEXT,
      consultation_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'pending',
      sync_retry INTEGER DEFAULT 0
    );
  `);

  // Prescriptions
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      patient_id TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      appointment_id TEXT,
      medicines TEXT NOT NULL,
      instructions TEXT,
      is_draft INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'pending',
      sync_retry INTEGER DEFAULT 0
    );
  `);

  // Medicine reminders
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS medicine_reminders (
      id TEXT PRIMARY KEY,
      prescription_id TEXT,
      patient_id TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      dosage TEXT,
      times TEXT,
      taken_log TEXT DEFAULT '[]',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Referrals
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      patient_id TEXT NOT NULL,
      from_doctor_id TEXT,
      to_doctor_id TEXT,
      hospital_name TEXT,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      follow_up_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'pending',
      sync_retry INTEGER DEFAULT 0
    );
  `);

  // Pharmacy inventory
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      pharmacy_id TEXT NOT NULL,
      name TEXT NOT NULL,
      generic_name TEXT,
      category TEXT,
      price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      expiry_date TEXT,
      description TEXT,
      status TEXT DEFAULT 'available',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'pending',
      sync_retry INTEGER DEFAULT 0
    );
  `);

  // Sync queue — offline operation queue
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      record_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      table_name TEXT NOT NULL,
      local_timestamp TEXT NOT NULL,
      updated_timestamp TEXT NOT NULL,
      sync_status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      payload TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Health records
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS health_records (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      patient_id TEXT NOT NULL,
      record_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_uri TEXT,
      data TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sync_status TEXT DEFAULT 'pending'
    );
  `);

  // ASHA visits / follow-ups
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      server_id TEXT,
      patient_id TEXT NOT NULL,
      asha_id TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      vitals TEXT,
      observations TEXT,
      next_visit_date TEXT,
      status TEXT DEFAULT 'completed',
      sync_status TEXT DEFAULT 'pending',
      sync_retry INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Notifications cache
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      data TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Pre-seed local starter records if empty so screens load in 0ms without waiting for network
  try {
    const patientCheck = await database.getFirstAsync('SELECT COUNT(*) as count FROM patients');
    if (!patientCheck || patientCheck.count === 0) {
      await database.execAsync(`
        INSERT OR IGNORE INTO patients (id, name, age, gender, village, district, state, blood_group, allergies, medical_history, emergency_phone, consent, patient_code, sync_status)
        VALUES 
          ('pat_01', 'Ramesh Das', 46, 'male', 'Kalyanpur', 'Kamrup Rural', 'Assam', 'O+', 'None', 'Mild Hypertension', '9000000001', 1, 'AL-KAM-001', 'synced'),
          ('pat_02', 'Bina Kalita', 34, 'female', 'Kalyanpur', 'Kamrup Rural', 'Assam', 'B+', 'Penicillin', 'Post-natal care', '9000000012', 1, 'AL-KAM-002', 'synced'),
          ('pat_03', 'Sunita Nath', 28, 'female', 'Rangia', 'Kamrup Rural', 'Assam', 'A+', 'None', 'First Trimester Checkup', '9000000013', 1, 'AL-KAM-003', 'synced');

        INSERT OR IGNORE INTO medicines (id, pharmacy_id, name, generic_name, category, price, stock, min_stock, expiry_date, status, sync_status)
        VALUES
          ('med_01', 'pharma_kalyan_01', 'Paracetamol 650mg', 'Acetaminophen', 'Analgesic', 18.0, 120, 15, '2027-12-31', 'available', 'synced'),
          ('med_02', 'pharma_kalyan_01', 'Amoxicillin 500mg', 'Amoxicillin', 'Antibiotic', 65.0, 45, 10, '2026-08-31', 'available', 'synced'),
          ('med_03', 'pharma_kalyan_01', 'Cetirizine 10mg', 'Cetirizine HCl', 'Antihistamine', 12.5, 3, 10, '2027-04-30', 'low_stock', 'synced'),
          ('med_04', 'pharma_kalyan_01', 'ORS Sachets WHO', 'Electrolytes', 'Rehydration', 21.0, 0, 20, '2028-01-31', 'out_of_stock', 'synced'),
          ('med_05', 'pharma_kalyan_01', 'Metformin 500mg', 'Metformin HCl', 'Antidiabetic', 28.0, 80, 15, '2027-09-30', 'available', 'synced');

        INSERT OR IGNORE INTO medicine_reminders (id, prescription_id, patient_id, medicine_name, dosage, times, taken_log, active)
        VALUES
          ('rem_01', 'rx_01', 'demo_patient_01', 'Paracetamol 650mg', '1 Tablet', '09:00 AM, 09:00 PM', '[]', 1),
          ('rem_02', 'rx_01', 'demo_patient_01', 'Vitamin C 500mg', '1 Chewable Tablet', '01:00 PM', '[]', 1);

        INSERT OR IGNORE INTO appointments (id, patient_id, doctor_id, status, scheduled_at, notes, sync_status)
        VALUES
          ('appt_demo_01', 'demo_patient_01', 'doc_anita_01', 'accepted', datetime('now', '+1 day'), 'Routine BP and Vitals followup', 'synced');
      `);
    }
  } catch (seedErr) {
    console.log('SQLite initial seeding note:', seedErr.message);
  }

    console.log('✅ Database initialized');
    return database;
  })();

  return initPromise;
};

// Generic helpers — always await initDatabase before executing
// Returns null/[] on web (no SQLite available)
export const dbRun = async (sql, params = []) => {
  if (Platform.OS === 'web') return null;
  await initDatabase();
  const database = await getDB();
  return database.runAsync(sql, params);
};

export const dbGet = async (sql, params = []) => {
  if (Platform.OS === 'web') return null;
  await initDatabase();
  const database = await getDB();
  return database.getFirstAsync(sql, params);
};

export const dbAll = async (sql, params = []) => {
  if (Platform.OS === 'web') return [];
  await initDatabase();
  const database = await getDB();
  return database.getAllAsync(sql, params);
};
