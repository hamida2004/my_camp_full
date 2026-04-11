import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations } from "../translations";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {

  const [lang, setLang] = useState("en");

  // Load saved language
  useEffect(() => {
    const loadLang = async () => {
      const saved = await AsyncStorage.getItem("lang");
      if (saved) setLang(saved);
    };
    loadLang();
  }, []);

  // Change language + persist
  const changeLanguage = async (newLang) => {
    setLang(newLang);
    await AsyncStorage.setItem("lang", newLang);
  };

  const value = {
    lang,
    t: translations[lang],
    changeLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);