
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import te from "./locales/te.json";
import hi from "./locales/hi.json";
import ta from "./locales/ta.json";

const savedLanguage = localStorage.getItem("civinex_language");

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    te: { translation: te },
    hi: { translation: hi },
    ta: { translation: ta },
  },
  lng: savedLanguage || "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
