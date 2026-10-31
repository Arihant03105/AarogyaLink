# AAROGYA LINK — Closing the Rural Diagnosis-to-Care Gap

<p align="center">
  <img src="mobile/assets/images/icon.png" width="120" alt="Aarogya Link Logo"/>
</p>

<p align="center">
  <strong>An offline-first rural healthcare mobile application</strong><br/>
  Connecting patients, ASHA workers, doctors, pharmacies & administrators
</p>

---

## Overview

**AAROGYA LINK** is a production-ready Android mobile application built with **React Native + Expo** to bridge the rural diagnosis-to-care gap in Northeast India (Assam focus). It works fully offline using Expo SQLite, syncing data automatically when connectivity is restored.

### Key Features

- 🏥 **5 Role-Based Portals** — Patient, ASHA Worker, Doctor, Pharmacy, Admin
- 🔐 **Dual Authentication** — Mobile/Password + Google Sign-In with instant role selection
- 📶 **Offline-First & Resilient** — Works seamlessly without internet; offline fallback for demo/local users
- 🗣️ **Voice Input** — Hindi/Assamese voice symptom intake for ASHA workers
- 💊 **Medicine Reminders** — Scheduled reminders with adherence tracking
- 📋 **Digital Prescriptions** — Draft-enforced offline prescriptions synced when online
- 🔗 **Referral Tracking** — End-to-end patient referral workflow
- 🆘 **Emergency Assistance** — National helplines + GPS location sharing
- 📅 **Doctor Appointments with Visual Calendar** — Interactive month/day calendar picker, convenient time slots & preloaded specialist doctors
- 🌐 **9 Indian Languages (i18n)** — English, Hindi (हिंदी), Assamese (অসমীয়া), Bengali (বাংলা), Bodo (बड़ो), Odia (ଓଡ଼ିଆ), Marathi (मराठी), Telugu (తెలుగు), Tamil (தமிழ்)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native + Expo SDK 58 |
| Navigation | Expo Router (file-based) |
| Local DB | Expo SQLite |
| State | React Context (Auth, Sync, i18n) |
| API | Axios + JWT (SecureStore) |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcrypt |

---

## Design System & Color Palette

| Color Role | Hex Code | Usage |
|------------|----------|-------|
| **Primary Green** | `#168B68` | Primary CTA buttons, active tab links, key accents |
| **Dark Green** | `#106E53` | Header backgrounds, hover effects, dark active states |
| **Mint Green** | `#E3F6ED` | Card backgrounds, pill tags, badge highlights |
| **Light Mint** | `#F0FBF6` | Main screen background |
| **Dark Navy** | `#152B43` | Headings, primary titles, high-emphasis text |
| **Soft Gray** | `#627873` | Paragraphs, subtitles, secondary captions |
| **White** | `#FFFFFF` | Cards, input fields, modal containers |

---

## Project Structure

```
AaroyaLink/
├── mobile/                    # React Native app
│   ├── app/                   # Expo Router screens
│   │   ├── (auth)/            # Welcome, Login, Signup, Forgot Password
│   │   └── (app)/             # Role-based portals
│   │       ├── patient/       # Patient portal (5 tabs + extras)
│   │       ├── asha/          # ASHA worker portal (5 tabs + register-patient)
│   │       ├── doctor/        # Doctor portal (6 tabs)
│   │       ├── pharmacy/      # Pharmacy portal (4 tabs)
│   │       └── admin/         # Admin portal (5 tabs)
│   ├── components/ui/         # Reusable components (Button, Card, Input, etc.)
│   ├── src/
│   │   ├── database/          # Expo SQLite setup + helpers
│   │   ├── services/api.js    # Axios API client
│   │   ├── store/             # AuthContext, SyncContext
│   │   ├── theme/             # Design tokens (colors, fonts, spacing)
│   │   └── i18n/              # Translations (EN, HI, AS)
│   └── package.json
│
└── backend/                   # Express API server
    ├── src/
    │   ├── models/            # Mongoose models
    │   ├── routes/            # REST API routes
    │   ├── middleware/        # JWT auth middleware
    │   └── app.js
    ├── scripts/seed.js        # Demo data seeder
    └── server.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm / npx
- MongoDB (local or Atlas)
- Expo CLI (`npm install -g expo-cli`)
- Android emulator or physical device with Expo Go

---

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env → set MONGODB_URI, JWT_SECRET

# Seed demo data
node scripts/seed.js

# Start server
npm run dev
```

Backend runs on `http://localhost:5000`.

---

### 2. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Create .env
echo EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api > .env
# For iOS simulator: http://localhost:5000/api
# For physical device: http://<your-machine-ip>:5000/api

# Start Expo
npx expo start
```

Scan the QR code with **Expo Go** or press `a` for Android emulator.

---

## Demo Credentials

| Role | Mobile | Password |
|------|--------|----------|
| Patient | 9000000001 | patient123 |
| ASHA Worker | 9000000002 | asha123 |
| Doctor | 9000000003 | doctor123 |
| Pharmacy | 9000000004 | pharma123 |
| Admin | 9000000005 | admin123 |

> Run `node scripts/seed.js` in the backend folder to create these accounts.

---

## Environment Variables

### Backend (`.env`)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aarogya_link
JWT_SECRET=your_super_secret_key_change_in_production
NODE_ENV=development
```

### Mobile (`.env`)

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
```

---

## Offline-First Architecture

```
User Action
    │
    ▼
Save to SQLite (always first)
    │
    ├── Online? ──YES──► POST to Backend API ──Success──► Mark synced
    │                                          └─Fail───► Enqueue to sync_queue
    │
    └── Offline? ──────────────────────────────────────► Enqueue to sync_queue
                                                              │
                                                    Network comes back
                                                              │
                                                    Auto-trigger sync
```

- **sync_queue** table in SQLite tracks all pending operations
- `SyncContext.enqueue()` adds items; `SyncContext.triggerSync()` processes them
- Unsynced offline prescriptions are always marked `isDraft = true`
- Sync status shown in profile screens and ASHA dashboard

---

## User Roles & Permissions

| Feature | Patient | ASHA | Doctor | Pharmacy | Admin |
|---------|---------|------|--------|----------|-------|
| Self-register | ✅ | ✅ | ✅ | ✅ | ❌ |
| Register patients | ❌ | ✅ | ❌ | ❌ | ❌ |
| Submit symptoms | ✅ | ✅ | ❌ | ❌ | ❌ |
| Issue prescriptions | ❌ | ❌ | ✅ | ❌ | ❌ |
| Manage inventory | ❌ | ❌ | ❌ | ✅ | ❌ |
| Verify doctors/pharmacy | ❌ | ❌ | ❌ | ❌ | ✅ |
| View all users | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## API Endpoints

All endpoints prefixed with `/api/`.

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /auth/signup`, `POST /auth/login`, `GET/PUT /auth/me`, `POST /auth/forgot-password` |
| Patients | `GET/POST /patients`, `GET/PUT /patients/:id`, `/patients/:id/health-records`, `/patients/:id/prescriptions` |
| Appointments | `GET/POST /appointments`, `GET/PUT /appointments/:id` |
| Symptoms | `GET/POST /symptoms`, `GET/PUT /symptoms/:id` |
| Prescriptions | `GET/POST /prescriptions`, `GET/PUT /prescriptions/:id` |
| Referrals | `GET/POST /referrals`, `GET/PUT /referrals/:id` |
| Medicines | `GET/POST /medicines`, `GET/PUT/DELETE /medicines/:id` |
| Visits | `GET/POST /visits`, `GET/PUT /visits/:id` |
| Doctors | `GET /doctors`, `GET /doctors/:id` |
| Pharmacies | `GET /pharmacies`, `GET /pharmacies/:id` |
| Admin | `GET /admin/analytics`, `GET/PUT /admin/users`, `PUT /admin/doctors/:id/verify`, `PUT /admin/pharmacies/:id/verify`, `GET /admin/audit-logs` |
| Sync | `POST /sync/push`, `GET /sync/pull` |
| Notifications | `GET /notifications`, `PUT /notifications/:id/read` |

---

## Building APK (EAS)

```bash
cd mobile

# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build preview APK (no store signing needed)
eas build --platform android --profile preview
```

---

## Important Constraints

1. **Admin signup is blocked** — Admins cannot be created via public signup (`/api/auth/signup` returns 403 for `role=admin`)
2. **Draft prescriptions** — Offline prescriptions are always `isDraft=true` until synced online
3. **Pharmacy verification** — Only `isVerified=true` pharmacies appear as verified providers
4. **No AI diagnosis** — AI is used only for transcription/summarization, never for clinical decisions
5. **Location sharing** — GPS is requested only with explicit user permission for emergency features

---

## Disclaimer

AAROGYA LINK is a healthcare aid platform. It is **not** a medical device and does not provide clinical diagnoses or replace professional medical advice. All clinical decisions are made by licensed healthcare professionals using the platform.

---

## License

MIT License — See [LICENSE](mobile/LICENSE)

