import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { authAPI } from '../services/api';
import { dbGet, dbRun } from '../database';
import { safeStorage } from '../utils/storage';

const AuthContext = createContext(null);

// Built-in Demo Stakeholder Accounts (Assam Rural Healthcare Model)
const DEMO_ACCOUNTS = {
  '9000000001': {
    _id: 'demo_patient_01',
    id: 'demo_patient_01',
    name: 'Ramesh Das',
    mobile: '9000000001',
    role: 'patient',
    state: 'Assam',
    district: 'Kamrup Rural',
    village: 'Kalyanpur',
    isVerified: true,
    verificationStatus: 'approved',
    profileData: { bloodGroup: 'O+', allergies: 'None' },
  },
  '9000000002': {
    _id: 'demo_asha_01',
    id: 'demo_asha_01',
    name: 'Manju Devi',
    mobile: '9000000002',
    role: 'asha',
    state: 'Assam',
    district: 'Kamrup Rural',
    village: 'Kalyanpur',
    isVerified: true,
    verificationStatus: 'approved',
    profileData: { jurisdiction: 'Sub-Centre East' },
  },
  '9000000003': {
    _id: 'demo_doctor_01',
    id: 'demo_doctor_01',
    name: 'Dr. Anita Sharma',
    mobile: '9000000003',
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
  '9000000004': {
    _id: 'demo_pharma_01',
    id: 'demo_pharma_01',
    name: 'Kalyan Jan Aushadhi Kendra',
    mobile: '9000000004',
    role: 'pharmacy',
    state: 'Assam',
    district: 'Kamrup Rural',
    village: 'Kalyanpur',
    isVerified: true,
    verificationStatus: 'approved',
    profileData: { licenseNumber: 'AS-DRUG-2024-0142' },
  },
  '9000000005': {
    _id: 'demo_admin_01',
    id: 'demo_admin_01',
    name: 'System Administrator',
    mobile: '9000000005',
    role: 'admin',
    state: 'Assam',
    district: 'Kamrup Rural',
    village: 'District HQ',
    isVerified: true,
    verificationStatus: 'approved',
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await safeStorage.getItem('authToken');
      const storedUser = await safeStorage.getItem('userData');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.log('Auth load error', e);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token: newToken, user: userData } = response.data;
      await safeStorage.setItem('authToken', newToken);
      await safeStorage.setItem('userData', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return userData;
    } catch (err) {
      const isNetworkFail = !err.response || err.code === 'ECONNABORTED' || err.message?.includes('Network Error') || err.message?.includes('unavailable');

      if (isNetworkFail) {
        // Fallback: Check built-in demo credentials
        const demo = DEMO_ACCOUNTS[credentials.identifier];
        if (demo) {
          const offlineToken = `offline_jwt_${demo.role}_${Date.now()}`;
          await safeStorage.setItem('authToken', offlineToken);
          await safeStorage.setItem('userData', JSON.stringify(demo));
          setToken(offlineToken);
          setUser(demo);
          return { ...demo, isOfflineLogin: true };
        }

        // Fallback: Check local SQLite database (native only)
        if (Platform.OS !== 'web') {
          try {
            const localRow = await dbGet(
              'SELECT * FROM users WHERE mobile = ? OR email = ?',
              [credentials.identifier, credentials.identifier]
            );
            if (localRow) {
              const localUser = {
                ...localRow,
                _id: localRow.id,
                profileData: localRow.profile_data ? JSON.parse(localRow.profile_data) : {},
              };
              const offlineToken = `offline_jwt_${localUser.role}_${Date.now()}`;
              await safeStorage.setItem('authToken', offlineToken);
              await safeStorage.setItem('userData', JSON.stringify(localUser));
              setToken(offlineToken);
              setUser(localUser);
              return { ...localUser, isOfflineLogin: true };
            }
          } catch (dbErr) {
            console.log('Local DB user search error', dbErr);
          }
        }
      }

      throw err;
    }
  };

  const signup = async (data) => {
    try {
      const response = await authAPI.signup(data);
      const { token: newToken, user: userData } = response.data;
      await safeStorage.setItem('authToken', newToken);
      await safeStorage.setItem('userData', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return userData;
    } catch (err) {
      const isNetworkFail = !err.response || err.code === 'ECONNABORTED' || err.message?.includes('Network Error') || err.message?.includes('unavailable');

      if (isNetworkFail) {
        const localId = `local_usr_${Date.now()}`;
        const isDocOrPharma = data.role === 'doctor' || data.role === 'pharmacy';
        const localUserData = {
          _id: localId,
          id: localId,
          name: data.name,
          mobile: data.mobile,
          email: data.email || '',
          role: data.role,
          state: data.state || 'Assam',
          district: data.district || '',
          village: data.village || '',
          isVerified: !isDocOrPharma,
          verificationStatus: isDocOrPharma ? 'pending' : 'approved',
          profileData: { consentGiven: data.consent },
          isOfflineRegistration: true,
        };

        if (Platform.OS !== 'web') {
          try {
            await dbRun(
              `INSERT INTO users (id, name, mobile, email, role, state, district, village, profile_data, is_verified, sync_status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
              [
                localId,
                data.name,
                data.mobile,
                data.email || '',
                data.role,
                data.state || 'Assam',
                data.district || '',
                data.village || '',
                JSON.stringify(localUserData.profileData),
                isDocOrPharma ? 0 : 1,
              ]
            );
          } catch (dbErr) {
            console.log('Save local user to sqlite error', dbErr);
          }
        }

        const offlineToken = `offline_jwt_${data.role}_${Date.now()}`;
        await safeStorage.setItem('authToken', offlineToken);
        await safeStorage.setItem('userData', JSON.stringify(localUserData));
        setToken(offlineToken);
        setUser(localUserData);
        return localUserData;
      }

      throw err;
    }
  };

  const loginWithGoogle = async (googleData) => {
    try {
      const response = await authAPI.googleAuth(googleData);
      const { token: newToken, user: userData } = response.data;
      await safeStorage.setItem('authToken', newToken);
      await safeStorage.setItem('userData', JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      return userData;
    } catch (err) {
      const localId = `google_usr_${googleData.googleId || Date.now()}`;
      const isDocOrPharma = googleData.role === 'doctor' || googleData.role === 'pharmacy';
      const localGoogleUser = {
        _id: localId,
        id: localId,
        name: googleData.name || 'Google User',
        email: googleData.email || 'user@gmail.com',
        role: googleData.role || 'patient',
        state: 'Assam',
        district: 'Kamrup Rural',
        village: 'Kalyanpur',
        avatar: googleData.photo || null,
        isVerified: !isDocOrPharma,
        verificationStatus: isDocOrPharma ? 'pending' : 'approved',
        authProvider: 'google',
        isOfflineSession: true,
      };

      const offlineToken = `offline_jwt_google_${Date.now()}`;
      await safeStorage.setItem('authToken', offlineToken);
      await safeStorage.setItem('userData', JSON.stringify(localGoogleUser));
      setToken(offlineToken);
      setUser(localGoogleUser);
      return localGoogleUser;
    }
  };

  const logout = async () => {
    await safeStorage.deleteItem('authToken');
    await safeStorage.deleteItem('userData');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updated) => {
    const merged = { ...user, ...updated };
    await safeStorage.setItem('userData', JSON.stringify(merged));
    setUser(merged);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      signup,
      loginWithGoogle,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
