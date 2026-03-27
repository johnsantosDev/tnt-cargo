import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './fr.json';
import en from './en.json';
import zh from './zh.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { fr: { translation: fr }, en: { translation: en }, zh: { translation: zh } },
    fallbackLng: 'fr',
    lng: 'fr',
    interpolation: { escapeValue: false },
  });

export default i18n;
