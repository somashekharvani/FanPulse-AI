"use client";

import React, { useState } from "react";
import { useAccessibility, LanguageCode } from "@/context/AccessibilityContext";
import { Eye, Type, Volume2, MapPin, Globe, X } from "lucide-react";

export const AccessibilityMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    textScale,
    highContrast,
    textToSpeech,
    quietRoute,
    activeLanguage,
    setTextScale,
    setHighContrast,
    setTextToSpeech,
    setQuietRoute,
    setActiveLanguage,
    speakText,
  } = useAccessibility();

  const toggleOpen = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      speakText("Accessibility and language menu opened");
    } else {
      speakText("Menu closed");
    }
  };

  const handleLanguageChange = (lang: LanguageCode) => {
    setActiveLanguage(lang);
    const langNames: { [key in LanguageCode]: string } = {
      en: "English",
      es: "Español",
      fr: "Français",
      pt: "Português",
      ar: "العربية",
      hi: "हिन्दी",
      ja: "日本語",
      de: "Deutsch",
      zh: "中文",
      it: "Italiano",
      ko: "한국어",
      ru: "Русский",
    };
    speakText(`Language changed to ${langNames[lang]}`);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" role="region" aria-label="Accessibility Settings">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 hover:scale-105 transition-all cursor-pointer border-none"
          aria-expanded="false"
          aria-label="Open Accessibility Menu"
          title="Accessibility & Language Options"
        >
          <Eye size={26} />
        </button>
      )}

      {/* Settings Modal Panel */}
      {isOpen && (
        <div className="w-80 rounded-2xl glass-panel p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
            <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
              <Eye size={20} /> Settings
            </h2>
            <button
              onClick={toggleOpen}
              className="text-gray-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
              aria-label="Close settings"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <Globe size={14} /> Language / Idioma
              </label>
              <select
                value={activeLanguage}
                onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                aria-label="Select language"
              >
                <option value="en">English (US)</option>
                <option value="es">Español (ES)</option>
                <option value="fr">Français (FR)</option>
                <option value="pt">Português (PT)</option>
                <option value="ar">العربية (AR)</option>
                <option value="hi">हिन्दी (HI)</option>
                <option value="ja">日本語 (JA)</option>
                <option value="de">Deutsch (DE)</option>
                <option value="zh">中文 (ZH)</option>
                <option value="it">Italiano (IT)</option>
                <option value="ko">한국어 (KO)</option>
                <option value="ru">Русский (RU)</option>
              </select>
            </div>

            {/* Text Resizing */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <Type size={14} /> Text Scaling
              </span>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Text scaling settings">
                {[1.0, 1.25, 1.5].map((scale) => (
                  <button
                    key={scale}
                    onClick={() => {
                      setTextScale(scale);
                      speakText(`Font size set to ${scale * 100} percent`);
                    }}
                    className={`p-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      textScale === scale
                        ? "bg-cyan-500 border-cyan-500 text-slate-900"
                        : "bg-slate-950/60 border-white/10 text-gray-300 hover:border-white/20"
                    }`}
                    aria-pressed={textScale === scale}
                  >
                    {scale * 100}%
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast Mode */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <Eye size={14} /> High Contrast
              </span>
              <button
                onClick={() => {
                  const nextContrast = !highContrast;
                  setHighContrast(nextContrast);
                  speakText(nextContrast ? "High contrast enabled" : "High contrast disabled");
                }}
                className={`w-12 h-6 rounded-full transition-all relative border border-white/10 cursor-pointer ${
                  highContrast ? "bg-cyan-500" : "bg-slate-950/60"
                }`}
                aria-pressed={highContrast}
                aria-label="Toggle High Contrast Mode"
              >
                <span
                  className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all ${
                    highContrast ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Text To Speech Screen Reader */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <Volume2 size={14} /> Voice Assistance
              </span>
              <button
                onClick={() => {
                  const nextTTS = !textToSpeech;
                  setTextToSpeech(nextTTS);
                  if (nextTTS) {
                    setTimeout(() => speakText("Voice assistance activated. Hover elements to read."), 100);
                  }
                }}
                className={`w-12 h-6 rounded-full transition-all relative border border-white/10 cursor-pointer ${
                  textToSpeech ? "bg-cyan-500" : "bg-slate-950/60"
                }`}
                aria-pressed={textToSpeech}
                aria-label="Toggle Voice Assistance Reader"
              >
                <span
                  className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all ${
                    textToSpeech ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Quiet Routing Mode */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <MapPin size={14} /> Quiet / Ramp Route
              </span>
              <button
                onClick={() => {
                  const nextQuiet = !quietRoute;
                  setQuietRoute(nextQuiet);
                  speakText(nextQuiet ? "Quiet and ramp routing active" : "Standard routing active");
                }}
                className={`w-12 h-6 rounded-full transition-all relative border border-white/10 cursor-pointer ${
                  quietRoute ? "bg-cyan-500" : "bg-slate-950/60"
                }`}
                aria-pressed={quietRoute}
                aria-label="Toggle Accessible and Quiet Route Selection"
              >
                <span
                  className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all ${
                    quietRoute ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AccessibilityMenu;
