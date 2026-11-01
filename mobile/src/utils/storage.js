import { Platform } from 'react-native';

// expo-secure-store has NO web support — lazy-load only on native
let SecureStore = null;
if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

export const safeStorage = {
  getItem: async (key) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, String(value));
        }
        return;
      }
      await SecureStore.setItemAsync(key, String(value));
    } catch (e) {}
  },
  deleteItem: async (key) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {}
  },
};
