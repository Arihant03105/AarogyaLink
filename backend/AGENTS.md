# AAROGYA LINK — Backend AGENTS.md

## Project Overview

Node.js + Express REST API backend for the AAROGYA LINK rural healthcare mobile application. Connects to MongoDB via Mongoose. All routes are mounted under `/api/`.

## Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 4.x
- **Database**: MongoDB + Mongoose
- **Auth**: JWT (jsonwebtoken) + bcrypt
- **Environment**: dotenv

## Directory Structure

```
backend/
├── server.js              # Entry point — MongoDB connect + listen
├── src/
│   ├── app.js             # Express app — middleware + route mounting
│   ├── middleware/
│   │   └── auth.js        # verifyToken, requireRole middleware
│   ├── models/
│   │   ├── User.js        # All 5 roles; bcrypt hashing; verificationStatus
│   │   ├── Patient.js     # patientCode auto-gen; linked to User
│   │   ├── Appointment.js # status: pending/confirmed/cancelled/completed
│   │   ├── Symptom.js     # Symptom submissions from patients/ASHA
│   │   ├── Prescription.js # isDraft field; only finalized when synced
│   │   ├── Referral.js    # Inter-doctor/hospital referrals
│   │   ├── Medicine.js    # Auto-status from stock vs minStock
│   │   ├── Visit.js       # ASHA community visit records + vitals
│   │   ├── HealthRecord.js # Uploaded reports and documents
│   │   └── AuditLog.js    # Admin audit trail
│   └── routes/
│       ├── auth.js        # signup (blocks admin), login, /me GET/PUT
│       ├── patients.js    # CRUD + sub-routes for health-records, prescriptions
│       ├── appointments.js
│       ├── symptoms.js
│       ├── prescriptions.js
│       ├── referrals.js
│       ├── doctors.js     # List verified doctors only
│       ├── pharmacies.js  # List verified pharmacies only
│       ├── medicines.js   # CRUD + name search
│       ├── visits.js
│       ├── admin.js       # analytics, users, verify-doctor/pharmacy, audit-logs
│       ├── sync.js        # POST /push (idempotent batch), GET /pull (since timestamp)
│       └── notifications.js # Stub
├── scripts/
│   └── seed.js            # Seeds 5 demo users + sample medicines
└── .env                   # PORT, MONGODB_URI, JWT_SECRET
```

## Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aarogya_link
JWT_SECRET=your_super_secret_key_change_in_production
NODE_ENV=development
```

## API Response Format

All routes return consistent JSON:

```json
// Success
{ "success": true, "data": { ... } }
{ "success": true, "data": [ ... ] }

// Error
{ "success": false, "message": "Description of error" }
```

## Authentication

- `POST /api/auth/signup` — public; role=admin blocked with 403
- `POST /api/auth/login` — returns `{ token, user }`
- `GET/PUT /api/auth/me` — requires Bearer token
- All other routes require `Authorization: Bearer <token>` header

Middleware:
- `verifyToken` — validates JWT, sets `req.user`
- `requireRole(...roles)` — checks `req.user.role` against allowed roles

## Role-Based Access

| Role | Can Access |
|------|-----------|
| patient | own profile, appointments, prescriptions, referrals, symptoms |
| asha | patients (all), visits, referrals, register patients |
| doctor | assigned patients, consultations, prescriptions (create), referrals |
| pharmacy | medicine inventory, requests |
| admin | all admin routes, user management, verifications |

## Key Business Rules

1. **Admin signup is blocked** — `POST /api/auth/signup` returns 403 if `role === 'admin'`
2. **Doctor/pharmacy verification** — `isVerified: false` by default; Admin must call `PUT /api/admin/doctors/:id/verify` or `PUT /api/admin/pharmacies/:id/verify`
3. **Verified providers only** — `GET /api/doctors` and `GET /api/pharmacies` return only `isVerified: true` records
4. **Draft prescriptions** — `isDraft` field on Prescription; offline prescriptions remain draft until synced
5. **Audit logging** — Admin actions are recorded in AuditLog collection

## Sync API

`POST /api/sync/push`
- Body: `{ operations: [{ id, user_id, record_id, operation_type, table_name, payload }] }`
- Idempotent — uses record_id + operation_type to prevent duplicates
- Returns: `{ results: [{ id, success, conflict, error }] }`

`GET /api/sync/pull?since=<ISO timestamp>`
- Returns all records updated after the given timestamp for the authenticated user

## Demo Credentials (after running seed.js)

| Role | Mobile | Password |
|------|--------|----------|
| Patient | 9000000001 | patient123 |
| ASHA Worker | 9000000002 | asha123 |
| Doctor | 9000000003 | doctor123 |
| Pharmacy | 9000000004 | pharma123 |
| Admin | 9000000005 | admin123 |

## Running Locally

```bash
npm install
node scripts/seed.js      # seed demo data
npm run dev               # starts with nodemon on PORT=5000
```

## Common Agent Tasks

- **Add a new route**: Create `src/routes/<name>.js`, mount in `src/app.js` as `app.use('/api/<name>', <router>)`
- **Add a new model**: Create `src/models/<Name>.js` with Mongoose schema; export as default
- **Add admin-only route**: Use `verifyToken, requireRole('admin')` middleware chain
- **Debug auth issues**: Check `Authorization` header format (`Bearer <token>`) and JWT_SECRET in .env

