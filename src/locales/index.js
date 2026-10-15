import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zh from './zh.json'
import en from './en.json'

// A saved choice wins; otherwise Chinese browsers get Chinese, everyone else English.
function initialLanguage() {
  try {
    const saved = localStorage.getItem('lang')
    if (saved === 'zh' || saved === 'en') return saved
  } catch {}
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: initialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
