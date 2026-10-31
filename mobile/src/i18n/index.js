import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from './translations';

const I18nContext = createContext(null);

export const LANGUAGES = [
  { code: 'en', label: 'English', sub: 'English' },
  { code: 'hi', label: 'हिंदी', sub: 'Hindi' },
  { code: 'as', label: 'অসমীয়া', sub: 'Assamese' },
  { code: 'bn', label: 'বাংলা', sub: 'Bengali' },
  { code: 'bodo', label: 'बड़ो', sub: 'Bodo' },
  { code: 'or', label: 'ଓଡ଼ିଆ', sub: 'Odia' },
  { code: 'mr', label: 'मराठी', sub: 'Marathi' },
  { code: 'te', label: 'తెలుగు', sub: 'Telugu' },
  { code: 'ta', label: 'தமிழ்', sub: 'Tamil' },
];

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem('appLanguage').then(lang => {
      if (lang) setLanguage(lang);
    });
  }, []);

  const changeLanguage = async (lang) => {
    setLanguage(lang);
    await AsyncStorage.setItem('appLanguage', lang);
  };

  const t = (key) => {
    return (translations[language] && translations[language][key]) || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};

