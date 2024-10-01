import i18n from 'i18next';
import Backend from 'i18next-http-backend'; //public/locales/{lang}/translation.json
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

//buscariamaos si tiene configurado un idiona por defecto 

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng:"en",
    debug: true,
    interpolation:{
        escapeValue:false
    }
    });
    export default i18n;