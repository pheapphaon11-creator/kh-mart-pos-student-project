'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from '@/lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en'] | string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('kh'); // Default to Khmer
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Load language preference from localStorage on client-side mount
    const savedLanguage = localStorage.getItem('kh_mart_lang') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'kh' || savedLanguage === 'zh')) {
      setLanguageState(savedLanguage);
    }
    setIsMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('kh_mart_lang', lang);
  };

  const t = (key: string): string => {
    const langDict = translations[language] as any;
    const defaultDict = translations['en'] as any;
    return langDict?.[key] || defaultDict?.[key] || key;
  };

  if (!isMounted) {
    return null; // Prevents the Khmer -> English flicker on initial load
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
