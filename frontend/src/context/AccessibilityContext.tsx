"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type LanguageCode = "en" | "es" | "fr" | "pt" | "ar" | "hi" | "ja" | "de" | "zh" | "it" | "ko" | "ru";

interface AccessibilityContextType {
  textScale: number; // 1.0, 1.25, 1.5, 2.0
  highContrast: boolean;
  textToSpeech: boolean;
  quietRoute: boolean;
  activeLanguage: LanguageCode;
  wheelchairMode: boolean;
  lowVisionMode: boolean;
  hearingAssistance: boolean;
  setTextScale: (scale: number) => void;
  setHighContrast: (contrast: boolean) => void;
  setTextToSpeech: (speech: boolean) => void;
  setQuietRoute: (quiet: boolean) => void;
  setActiveLanguage: (lang: LanguageCode) => void;
  setWheelchairMode: (mode: boolean) => void;
  setLowVisionMode: (mode: boolean) => void;
  setHearingAssistance: (assist: boolean) => void;
  speakText: (text: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [textScale, setTextScale] = useState<number>(1.0);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [textToSpeech, setTextToSpeech] = useState<boolean>(false);
  const [quietRoute, setQuietRoute] = useState<boolean>(false);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>("en");
  const [wheelchairMode, setWheelchairMode] = useState<boolean>(false);
  const [lowVisionMode, setLowVisionMode] = useState<boolean>(false);
  const [hearingAssistance, setHearingAssistance] = useState<boolean>(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedScale = localStorage.getItem("a11y-textScale");
    if (savedScale) setTextScale(parseFloat(savedScale));

    const savedContrast = localStorage.getItem("a11y-highContrast");
    if (savedContrast) setHighContrast(savedContrast === "true");

    const savedTTS = localStorage.getItem("a11y-textToSpeech");
    if (savedTTS) setTextToSpeech(savedTTS === "true");

    const savedQuiet = localStorage.getItem("a11y-quietRoute");
    if (savedQuiet) setQuietRoute(savedQuiet === "true");

    const savedLang = localStorage.getItem("a11y-lang");
    if (savedLang) setActiveLanguage(savedLang as LanguageCode);

    const savedWheelchair = localStorage.getItem("a11y-wheelchairMode");
    if (savedWheelchair) setWheelchairMode(savedWheelchair === "true");

    const savedLowVision = localStorage.getItem("a11y-lowVisionMode");
    if (savedLowVision) setLowVisionMode(savedLowVision === "true");

    const savedHearing = localStorage.getItem("a11y-hearingAssistance");
    if (savedHearing) setHearingAssistance(savedHearing === "true");
  }, []);

  // Save changes to localStorage
  const handleSetTextScale = (scale: number) => {
    setTextScale(scale);
    localStorage.setItem("a11y-textScale", scale.toString());
  };

  const handleSetHighContrast = (contrast: boolean) => {
    setHighContrast(contrast);
    localStorage.setItem("a11y-highContrast", contrast.toString());
  };

  const handleSetTextToSpeech = (speech: boolean) => {
    setTextToSpeech(speech);
    localStorage.setItem("a11y-textToSpeech", speech.toString());
    if (!speech) {
      window.speechSynthesis?.cancel(); // Cancel active speech if turned off
    }
  };

  const handleSetQuietRoute = (quiet: boolean) => {
    setQuietRoute(quiet);
    localStorage.setItem("a11y-quietRoute", quiet.toString());
  };

  const handleSetActiveLanguage = (lang: LanguageCode) => {
    setActiveLanguage(lang);
    localStorage.setItem("a11y-lang", lang);
  };

  const handleSetWheelchairMode = (mode: boolean) => {
    setWheelchairMode(mode);
    localStorage.setItem("a11y-wheelchairMode", mode.toString());
  };

  const handleSetLowVisionMode = (mode: boolean) => {
    setLowVisionMode(mode);
    localStorage.setItem("a11y-lowVisionMode", mode.toString());
    if (mode) {
      setHighContrast(true);
      setTextScale(1.5);
    } else {
      setHighContrast(false);
      setTextScale(1.0);
    }
  };

  const handleSetHearingAssistance = (assist: boolean) => {
    setHearingAssistance(assist);
    localStorage.setItem("a11y-hearingAssistance", assist.toString());
  };

  const speakText = (text: string) => {
    if (!textToSpeech) return;
    
    // Stop any current reading
    window.speechSynthesis?.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    // Attempt to match system language
    if (activeLanguage === "es") utterance.lang = "es-ES";
    else if (activeLanguage === "fr") utterance.lang = "fr-FR";
    else if (activeLanguage === "pt") utterance.lang = "pt-PT";
    else if (activeLanguage === "ar") utterance.lang = "ar-SA";
    else if (activeLanguage === "hi") utterance.lang = "hi-IN";
    else if (activeLanguage === "ja") utterance.lang = "ja-JP";
    else if (activeLanguage === "de") utterance.lang = "de-DE";
    else if (activeLanguage === "zh") utterance.lang = "zh-CN";
    else if (activeLanguage === "it") utterance.lang = "it-IT";
    else if (activeLanguage === "ko") utterance.lang = "ko-KR";
    else if (activeLanguage === "ru") utterance.lang = "ru-RU";
    else utterance.lang = "en-US";
    
    window.speechSynthesis?.speak(utterance);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        textScale,
        highContrast,
        textToSpeech,
        quietRoute,
        activeLanguage,
        wheelchairMode,
        lowVisionMode,
        hearingAssistance,
        setTextScale: handleSetTextScale,
        setHighContrast: handleSetHighContrast,
        setTextToSpeech: handleSetTextToSpeech,
        setQuietRoute: handleSetQuietRoute,
        setActiveLanguage: handleSetActiveLanguage,
        setWheelchairMode: handleSetWheelchairMode,
        setLowVisionMode: handleSetLowVisionMode,
        setHearingAssistance: handleSetHearingAssistance,
        speakText,
      }}
    >
      <div 
        style={{ fontSize: `${textScale * 16}px` }}
        className={`${highContrast ? "high-contrast" : ""} ${lowVisionMode ? "large-text" : ""}`}
      >
        {children}
      </div>
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
};
