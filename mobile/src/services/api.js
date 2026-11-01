import axios from 'axios';
import { Platform } from 'react-native';
import { safeStorage } from '../utils/storage';
import Constants from 'expo-constants';

// Smart host detection: Web -> localhost, Real Phone via Expo -> LAN IP, Android Emulator -> 10.0.2.2
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL && !process.env.EXPO_PUBLIC_API_URL.includes('10.0.2.2')) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }
  const hostUri = Constants?.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
};

const BASE_URL = getBaseUrl();

// Fast 2.5s timeout for snappy mobile experience
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 2500,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fast server availability tracking to prevent UI freeze
let isServerOnline = true;
let lastFailTimestamp = 0;
const RECHECK_COOLDOWN_MS = 15000;

export const checkServerHealth = () => {
  if (!isServerOnline && Date.now() - lastFailTimestamp < RECHECK_COOLDOWN_MS) {
    return false;
  }
  return true;
};

export const markServerOnline = () => {
  isServerOnline = true;
};

// Request interceptor — attach JWT & fail fast if server is known to be down
api.interceptors.request.use(
  async (config) => {
    // If server recently failed and request doesn't force recheck, fail fast to avoid 2.5s freeze
    if (!config.headers['X-Force-Check'] && !checkServerHealth()) {
      return Promise.reject(new Error('Server unavailable (fast cached fail)'));
    }

    try {
      const token = await safeStorage.getItem('authToken');
      if (token && !token.startsWith('offline_')) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle auth errors & track server health
api.interceptors.response.use(
  (response) => {
    isServerOnline = true;
    return response;
  },
  async (error) => {
    if (!error.response || error.code === 'ECONNABORTED' || error.message?.includes('Network Error')) {
      isServerOnline = false;
      lastFailTimestamp = Date.now();
    }
    if (error.response?.status === 401) {
      await safeStorage.deleteItem('authToken');
      await safeStorage.deleteItem('userData');
    }
    return Promise.reject(error);
  }
);

export default api;

// Named endpoint groups
export const authAPI = {
  login: (data) => api.post('/auth/login', data, { headers: { 'X-Force-Check': 'true' } }),
  signup: (data) => api.post('/auth/signup', data, { headers: { 'X-Force-Check': 'true' } }),
  googleAuth: (data) => api.post('/auth/google', data, { headers: { 'X-Force-Check': 'true' } }),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
};

export const patientAPI = {
  list: (params) => api.get('/patients', { params }),
  get: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  getHealthRecords: (id) => api.get(`/patients/${id}/health-records`),
  getPrescriptions: (id) => api.get(`/patients/${id}/prescriptions`),
};

export const appointmentAPI = {
  list: (params) => api.get('/appointments', { params }),
  get: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  cancel: (id) => api.put(`/appointments/${id}`, { status: 'cancelled' }),
};

export const symptomAPI = {
  submit: (data) => api.post('/symptoms', data),
  list: (params) => api.get('/symptoms', { params }),
  get: (id) => api.get(`/symptoms/${id}`),
  update: (id, data) => api.put(`/symptoms/${id}`, data),
};

export const prescriptionAPI = {
  create: (data) => api.post('/prescriptions', data),
  list: (params) => api.get('/prescriptions', { params }),
  get: (id) => api.get(`/prescriptions/${id}`),
  update: (id, data) => api.put(`/prescriptions/${id}`, data),
};

export const referralAPI = {
  create: (data) => api.post('/referrals', data),
  list: (params) => api.get('/referrals', { params }),
  get: (id) => api.get(`/referrals/${id}`),
  update: (id, data) => api.put(`/referrals/${id}`, data),
};

export const doctorAPI = {
  list: (params) => api.get('/doctors', { params }),
  get: (id) => api.get(`/doctors/${id}`),
  update: (id, data) => api.put(`/doctors/${id}`, data),
};

export const pharmacyAPI = {
  list: (params) => api.get('/pharmacies', { params }),
  get: (id) => api.get(`/pharmacies/${id}`),
  update: (id, data) => api.put(`/pharmacies/${id}`, data),
};

export const medicineAPI = {
  list: (params) => api.get('/medicines', { params }),
  get: (id) => api.get(`/medicines/${id}`),
  create: (data) => api.post('/medicines', data),
  update: (id, data) => api.put(`/medicines/${id}`, data),
  delete: (id) => api.delete(`/medicines/${id}`),
};

export const visitAPI = {
  create: (data) => api.post('/visits', data),
  list: (params) => api.get('/visits', { params }),
  get: (id) => api.get(`/visits/${id}`),
  update: (id, data) => api.put(`/visits/${id}`, data),
};

export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
  listUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  verifyDoctor: (id, data) => api.put(`/admin/doctors/${id}/verify`, data),
  verifyPharmacy: (id, data) => api.put(`/admin/pharmacies/${id}/verify`, data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

export const syncAPI = {
  push: (data) => api.post('/sync/push', data),
  pull: (params) => api.get('/sync/pull', { params }),
};

export const notificationAPI = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
};
