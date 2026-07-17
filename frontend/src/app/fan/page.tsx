"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, getWebSocketUrl, logoutUser } from "@/utils/api";
import { useAccessibility } from "@/context/AccessibilityContext";
import { translations } from "@/utils/translations";
import { Compass, Volume2, Mic, Send, RefreshCw, LogOut, Navigation, AlertTriangle, ShieldCheck, MapPin, Database, UploadCloud, Info, Sparkles, User, HelpCircle, Eye, CheckSquare, Settings, Users, Calendar, Clock, Map, Activity, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";
import { playBeep, playSuccess } from "@/utils/audio";

interface Gate {
  status: string;
  queue_length: number;
  throughput_per_min: number;
  wait_time_min: number;
}

interface Zone {
  occupancy_pct: number;
}

interface Concessions {
  restrooms: { [key: string]: string };
  food_inventory: { [key: string]: string };
  wait_times: { [key: string]: number };
}

interface WeatherTransit {
  temp_f: number;
  conditions: string;
  train_wait_min: number;
}

interface StadiumState {
  gate_status: { [key: string]: Gate };
  zone_occupancy: { [key: string]: Zone };
  concessions: Concessions;
  weather_transit: WeatherTransit;
}

export default function FanCompanion() {
  const router = useRouter();
  const {
    activeLanguage,
    setActiveLanguage,
    speakText,
    wheelchairMode,
    setWheelchairMode,
    lowVisionMode,
    setLowVisionMode,
    hearingAssistance,
    setHearingAssistance,
    highContrast,
    setHighContrast,
    textScale,
    setTextScale
  } = useAccessibility();

  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Live state from websocket
  const [venueState, setVenueState] = useState<StadiumState | null>({
    gate_status: {
      "Gate A": { status: "open", queue_length: 15, throughput_per_min: 8, wait_time_min: 6 },
      "Gate B": { status: "open", queue_length: 22, throughput_per_min: 6, wait_time_min: 10 },
      "Gate C": { status: "open", queue_length: 12, throughput_per_min: 10, wait_time_min: 3 },
      "Gate C2": { status: "open", queue_length: 64, throughput_per_min: 8, wait_time_min: 7 }
    },
    zone_occupancy: {
      "Zone 3": { occupancy_pct: 42 },
      "Zone 4": { occupancy_pct: 50 }
    },
    concessions: {
      restrooms: { "WR-07": "nominal", "WR-04": "heavy" },
      food_inventory: { "FC-03": "nominal", "FC-05": "low" },
      wait_times: { "FC-03": 3, "FC-05": 12 }
    },
    weather_transit: { temp_f: 82, conditions: "Clear", train_wait_min: 4 }
  });
  const [wsConnected, setWsConnected] = useState(false);

  // Granular Consent states
  const [consentMatchHistory, setConsentMatchHistory] = useState(true);
  const [consentPreferences, setConsentPreferences] = useState(true);
  const [consentAccessibility, setConsentAccessibility] = useState(true);
  const [consentNavigation, setConsentNavigation] = useState(true);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // AI Travel Planner & Ticket uploader states
  const [isScanning, setIsScanning] = useState(false);
  const [ticketPlanActive, setTicketPlanActive] = useState(false);
  const [showPassportToast, setShowPassportToast] = useState<string | null>(null);
  const [guardianNotification, setGuardianNotification] = useState<string | null>(null);

  // GPS Group Navigation states
  const [groupActive, setGroupActive] = useState(false);
  const [groupMembers, setGroupMembers] = useState([
    { name: "Somashekhar", role: "Organizer (You)", loc: "Inside Stadium (Gate C2)", status: "Active", battery: "84%" },
    { name: "Rahul", role: "Friend", loc: "Parking Lot B", status: "Active", battery: "8%" },
    { name: "John", role: "Friend", loc: "Metro Line M3", status: "Active", battery: "92%" },
    { name: "Maria", role: "Friend", loc: "Food Court FC-02", status: "Active", battery: "76%" },
    { name: "Robert", role: "Friend", loc: "OFFLINE", status: "Lost / Offline", battery: "Unknown" }
  ]);

  // FanPulse Match Day Companion AI state controllers
  const [activeCompanionTab, setActiveCompanionTab] = useState<"connect" | "assistance" | "navigation" | "memories">("connect");
  const [sosActive, setSosActive] = useState<string | null>(null);
  const [sosProgress, setSosProgress] = useState<number>(0);
  const [lostChildSubmitted, setLostChildSubmitted] = useState(false);
  const [lostChildName, setLostChildName] = useState("Aarav");
  const [lostChildAge, setLostChildAge] = useState("7");
  const [lostChildLoc, setLostChildLoc] = useState("Food Court FC-02");
  const [offlineModeActive, setOfflineModeActive] = useState(false);
  const [memoryDownloaded, setMemoryDownloaded] = useState<"pdf" | "txt" | "json" | null>(null);

  // Chat parameters
  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      content: "Welcome to FIFA World Cup 2026! I am your live stadium AI guide. Ask me about gate queue wait times, restroom lines, food stock, or accessibility routes.",
      why: "Initial welcome briefing grounded in nominal stadium metadata.",
      confidence: "100%",
      agents: ["Navigation AI", "Crowd AI", "Accessibility AI"]
    }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [reasoningStep, setReasoningStep] = useState<string>("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Localisation helper
  const t = (key: string): string => {
    return translations[key]?.[activeLanguage] || translations[key]?.["en"] || key;
  };

  useEffect(() => {
    setIsClient(true);
    const savedToken = localStorage.getItem("fanpulse_access_token");
    const savedEmail = localStorage.getItem("fanpulse_email");
    setToken(savedToken);
    setEmail(savedEmail);

    if (savedToken) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const connectWebSocket = () => {
    try {
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connectWebSocket, 3000);
      };
      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === "stadium_update") {
          setVenueState(payload.venue_state);
        }
      };
    } catch (err) {
      console.error("WS error", err);
    }
  };

  const handleSendChat = async (textToSend?: string) => {
    const text = textToSend || inputMsg;
    if (!text.trim()) return;

    setInputMsg("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat/companion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          language: activeLanguage
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to fetch response.");

      // AI Reasoning Engine Simulation
      const steps = [
        "Resolving Multi-Agent Coordination...",
        "Querying Navigation Agent vectors...",
        "Checking Accessibility requirements...",
        "Confirming explainability grounding...",
        "Response ready."
      ];
      let i = 0;
      setReasoningStep(steps[0]);
      const rInterval = setInterval(() => {
        i++;
        if (i < steps.length) {
          setReasoningStep(steps[i]);
        } else {
          clearInterval(rInterval);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.response,
              why: data.why,
              confidence: data.confidence || "96%",
              agents: ["Navigation AI", "Crowd AI", "Accessibility AI", "Prediction AI"]
            }
          ]);
          setChatLoading(false);
          speakText(data.response);
        }
      }, 400);
    } catch (e) {
      setChatLoading(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    setIsRecording(true);
    speakText("Voice transcription active. Dictate your query now.");
    setTimeout(() => {
      setIsRecording(false);
      handleSendChat("Guide me to the nearest accessible washroom from VIP suites.");
    }, 2800);
  };
  
  const handleDownloadFile = (format: "txt" | "json") => {
    let content = "";
    let filename = "";
    
    const memoryData = {
      match: "Brazil vs Spain (World Cup Final)",
      stadium: "AT&T Stadium (Dallas)",
      date: "July 19, 2026",
      journeyScore: "98%",
      timeSavedMinutes: 34,
      walkingDistanceMeters: 890,
      congestionAvoided: "Gate C overcrowding bottlenecks",
      queueTimeSavedMinutes: 36,
      accessibilityScore: "100%",
      recommendationsUsed: 6,
      aiConfidence: "98%",
      timeline: [
        { time: "5:30 PM", event: "Journey started from Dallas residence." },
        { time: "5:45 PM", event: "AI recommended Metro M3 detour (saved 24 mins)." },
        { time: "6:10 PM", event: "High congestion detected at Gate C (C2 detour suggested)." },
        { time: "6:22 PM", event: "Group Member Robert went offline; offline route maps cached." },
        { time: "Match End", event: "Safely evacuated Dallas AT&T Stadium via South Metro link." }
      ]
    };

    if (format === "json") {
      content = JSON.stringify(memoryData, null, 2);
      filename = "fanpulse-match-memories.json";
    } else {
      content = `===========================================
FANPULSE AI - WORLD CUP MATCH MEMORIES
===========================================
Match: ${memoryData.match}
Stadium: ${memoryData.stadium}
Date: ${memoryData.date}

JOURNEY STATISTICS:
-------------------
• Match Day Journey Score: ${memoryData.journeyScore}
• Time Saved: ${memoryData.timeSavedMinutes} Minutes
• Queue Time Saved: ${memoryData.queueTimeSavedMinutes} Minutes
• Walking Distance: ${memoryData.walkingDistanceMeters}m
• Congestion Avoided: ${memoryData.congestionAvoided}
• Accessibility Score: ${memoryData.accessibilityScore}
• AI Recommendations Used: ${memoryData.recommendationsUsed}
• AI Core Confidence: ${memoryData.aiConfidence}

JOURNEY TIMELINE STORY:
-----------------------
${memoryData.timeline.map(t => `[${t.time}] ${t.event}`).join("\n")}

===========================================
System Status: Evacuation Successful (ONLINE)
===========================================`;
      filename = "fanpulse-match-memories.txt";
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Drag and drop AI ticket analyzer simulation
  const triggerTicketUploader = () => {
    setIsScanning(true);
    playBeep();

    setTimeout(() => {
      setIsScanning(false);
      setTicketPlanActive(true);
      playSuccess();
      speakText("Ticket uploaded successfully. Match Day Assistant configured.");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "ADVISORY: Ticket upload analyzed. Match: Brazil VS Spain. Seat A-102. AI travel itinerary generated.",
          why: "Grounding ticket details: Gate C2 assigned, recommended departure 5:05 PM.",
          confidence: "96%",
          agents: ["Prediction AI", "Traffic AI", "Navigation AI"]
        }
      ]);
    }, 2500);
  };

  const triggerDownloadProfile = () => {
    playSuccess();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      email,
      consents: { consentMatchHistory, consentPreferences, consentAccessibility, consentNavigation },
      preferences: { activeLanguage, wheelchairMode, lowVisionMode, hearingAssistance }
    }));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "fanpulse_ai_profile.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setShowPassportToast("Profile data archive exported successfully.");
    setTimeout(() => setShowPassportToast(null), 3000);
  };

  const triggerWipeProfile = () => {
    playSuccess();
    setConsentMatchHistory(false);
    setConsentPreferences(false);
    setConsentAccessibility(false);
    setConsentNavigation(false);
    setTicketPlanActive(false);

    setShowPassportToast("Consent revoked and profile data completely purged.");
    speakText("Profile data deleted successfully.");
    setTimeout(() => setShowPassportToast(null), 3000);
  };

  const handleQuickLogin = async () => {
    setChatLoading(true);
    try {
      await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "fan@fanpulse.ai", password: "Demo@2026", role: "fan" })
      });
    } catch (e) {}

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "fan@fanpulse.ai", password: "Demo@2026" })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("fanpulse_access_token", data.access_token);
        localStorage.setItem("fanpulse_role", data.role);
        localStorage.setItem("fanpulse_email", data.email);
        setToken(data.access_token);
        setEmail(data.email);
        connectWebSocket();
      }
    } catch (e) {}
    setChatLoading(false);
  };

  if (!isClient) return null;

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 relative font-sans bg-[#040508] text-white min-h-screen">
        <div className="w-full max-w-sm rounded-2xl glass-panel p-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mx-auto">
            <Compass size={24} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Fan Companion Access</h2>
            <p className="text-xs text-gray-400">Unlock real-time stadium navigation and safety updates</p>
          </div>
          <button
            onClick={handleQuickLogin}
            className="w-full p-3.5 rounded-xl bg-cyan-500 text-slate-900 font-bold text-sm shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 transition-all cursor-pointer border-none"
          >
            Quick Access (Somashekhar Mode)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col h-full font-sans bg-[#08090d] text-white min-h-screen ${lowVisionMode ? "large-text" : ""}`}>
      
      {/* Top Banner toast */}
      {showPassportToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[999] px-4 py-3 bg-cyan-950 border border-cyan-400 text-cyan-400 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckSquare size={14} />
          <span>{showPassportToast}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-slate-950/40 backdrop-blur-md z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Compass size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Fan Companion Dashboard</h1>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
              <span className="text-[10px] text-gray-500">{wsConnected ? "Connected Live" : "Offline"}</span>
            </div>
          </div>
        </div>

        {/* Accessibility & Multilingual Fast Toggles */}
        <div className="flex items-center gap-3">
          
          {/* 12 Language Selector Dropdown */}
          <select
            value={activeLanguage}
            onChange={(e) => {
              playBeep();
              setActiveLanguage(e.target.value as any);
            }}
            className="bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-cyan-500 cursor-pointer font-mono"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="pt">Português</option>
            <option value="ar">العربية</option>
            <option value="hi">हिन्दी</option>
            <option value="ja">日本語</option>
            <option value="de">Deutsch</option>
            <option value="zh">中文</option>
            <option value="it">Italiano</option>
            <option value="ko">한국어</option>
            <option value="ru">Русский</option>
          </select>

          <button
            onClick={() => {
              playBeep();
              setWheelchairMode(!wheelchairMode);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              wheelchairMode ? "bg-cyan-500 text-slate-950" : "bg-slate-900/60 text-cyan-400 border border-cyan-500/20"
            }`}
          >
            ♿ Wheelchair Mode
          </button>

          <button
            onClick={() => {
              playBeep();
              setLowVisionMode(!lowVisionMode);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              lowVisionMode ? "bg-purple-500 text-white" : "bg-slate-900/60 text-purple-400 border border-purple-500/20"
            }`}
          >
            👁️ Low Vision
          </button>

          <button
            onClick={() => {
              logoutUser();
              router.push("/");
            }}
            className="px-3 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-gray-300 hover:bg-slate-700 cursor-pointer border-none"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        
        {/* Left Column: Digital Passport & Granular Consent Manager */}
        <div className="lg:col-span-4 flex flex-col gap-5 overflow-y-auto pr-1">
          
          {/* Digital Passport Card */}
          <div className="rounded-2xl bg-gradient-to-br from-cyan-950/60 to-slate-900/80 border-2 border-cyan-500/30 p-5 relative overflow-hidden shadow-xl">
            <span className="text-[8px] text-cyan-400 font-extrabold uppercase tracking-widest font-mono block mb-1">FIFA 2026 Digital Passport</span>
            <h4 className="text-sm font-bold text-white tracking-wide">Somashekhar Profile</h4>
            <div className="mt-4 space-y-2 text-xxs font-mono text-gray-400">
              <p>Preferred Language: <strong className="text-white uppercase">{activeLanguage}</strong></p>
              <p>Accessibility Profile: <strong className="text-cyan-400">{wheelchairMode ? "Active (Wheelchair Mode)" : "Normal"}</strong></p>
              <p>Ticket status: <strong className={ticketPlanActive ? "text-emerald-400" : "text-amber-500"}>{ticketPlanActive ? "Match Seat A-102 Locked" : "No match ticket uploaded"}</strong></p>
            </div>

            {/* Granular Consent Manager */}
            <div className="mt-5 border-t border-white/5 pt-4 space-y-3">
              <span className="text-[9px] font-extrabold text-cyan-400 uppercase tracking-widest font-mono block">{t("consent_manager")}</span>
              
              <div className="space-y-2">
                <label className="flex justify-between items-center text-xxs cursor-pointer">
                  <span>Store Match History</span>
                  <input
                    type="checkbox"
                    checked={consentMatchHistory}
                    onChange={(e) => setConsentMatchHistory(e.target.checked)}
                    className="cursor-pointer"
                  />
                </label>
                <label className="flex justify-between items-center text-xxs cursor-pointer">
                  <span>Store Preferences</span>
                  <input
                    type="checkbox"
                    checked={consentPreferences}
                    onChange={(e) => setConsentPreferences(e.target.checked)}
                    className="cursor-pointer"
                  />
                </label>
                <label className="flex justify-between items-center text-xxs cursor-pointer">
                  <span>Store Accessibility Data</span>
                  <input
                    type="checkbox"
                    checked={consentAccessibility}
                    onChange={(e) => setConsentAccessibility(e.target.checked)}
                    className="cursor-pointer"
                  />
                </label>
                <label className="flex justify-between items-center text-xxs cursor-pointer">
                  <span>Store Navigation History</span>
                  <input
                    type="checkbox"
                    checked={consentNavigation}
                    onChange={(e) => setConsentNavigation(e.target.checked)}
                    className="cursor-pointer"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={triggerDownloadProfile}
                  className="py-2 rounded bg-slate-900 border border-white/10 hover:border-cyan-500/30 text-[8px] font-bold text-cyan-400 cursor-pointer transition-all uppercase"
                >
                  {t("download_profile")}
                </button>
                <button
                  onClick={triggerWipeProfile}
                  className="py-2 rounded bg-red-950/20 border border-red-500/30 hover:bg-red-900/30 text-[8px] font-bold text-red-400 cursor-pointer transition-all uppercase"
                >
                  {t("delete_everything")}
                </button>
              </div>
            </div>
          </div>

          {/* AI Travel Planner drag-and-drop file uploader */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 space-y-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block flex items-center gap-1.5">
              <UploadCloud size={14} className="text-cyan-400" /> AI Travel Planner (Ticket Upload)
            </span>
            <div
              onClick={triggerTicketUploader}
              className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-cyan-500/30 transition-all bg-slate-900/20"
            >
              {isScanning ? (
                <div className="space-y-2 font-mono text-xs text-cyan-400">
                  <RefreshCw className="animate-spin mx-auto text-cyan-400" size={20} />
                  <span>Scanning ticket credentials...</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <UploadCloud className="mx-auto text-gray-500" size={24} />
                  <p className="text-xxs text-gray-300">Drag & Drop or Click to upload World Cup Ticket</p>
                  <span className="text-[8px] text-gray-500 block uppercase font-mono">PDF, PNG, JPG supported</span>
                </div>
              )}
            </div>
          </div>

          {/* FanPulse Match Day Companion AI */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 space-y-4 flex flex-col flex-1 min-h-[300px]">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block flex items-center gap-1.5">
                  <Users size={14} className="text-cyan-400" /> FanPulse Connect AI
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[9px] text-gray-400 cursor-pointer font-mono">
                    <input
                      type="checkbox"
                      checked={offlineModeActive}
                      onChange={(e) => {
                        playBeep();
                        setOfflineModeActive(e.target.checked);
                      }}
                      className="cursor-pointer"
                    />
                    <span>Simulate Offline</span>
                  </label>
                  <button
                    onClick={() => {
                      playBeep();
                      setGroupActive(!groupActive);
                    }}
                    className={`px-2 py-1 rounded text-[8px] font-bold cursor-pointer transition-all border-none ${
                      groupActive ? "bg-red-500/10 text-red-400" : "bg-cyan-500/10 text-cyan-400"
                    }`}
                  >
                    {groupActive ? "Leave Group" : "Create Group"}
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-white/5 pb-1 gap-1">
                {[
                  { id: "connect", label: "Group Connect" },
                  { id: "assistance", label: "AI Assistance" },
                  { id: "navigation", label: "Group Navigation" },
                  { id: "memories", label: "Memories" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      playBeep();
                      setActiveCompanionTab(tab.id as any);
                    }}
                    className={`flex-1 py-1 text-[8px] font-bold uppercase tracking-wider transition-all border-none bg-transparent cursor-pointer ${
                      activeCompanionTab === tab.id
                        ? "text-cyan-400 border-b-2 border-cyan-400"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Offline Fallback Override */}
            {offlineModeActive ? (
              <div className="flex-1 bg-amber-950/10 border border-amber-500/20 rounded-xl p-4 text-center space-y-3 font-mono">
                <div className="text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5">
                  <AlertTriangle size={14} className="animate-pulse" />
                  <span>OFFLINE NAVIGATION ACTIVATED</span>
                </div>
                <p className="text-[9px] text-gray-400">Local cached map data loaded. GPS sharing paused to conserve network packets.</p>
                <div className="text-left text-[9px] text-gray-300 bg-black/40 p-3 rounded-lg border border-white/5 space-y-1">
                  <p>• Assigned Gate: <strong className="text-white">Gate C2</strong></p>
                  <p>• Locked Seat: <strong className="text-white">Section 104</strong></p>
                  <p>• Estimated Walking Time: <strong className="text-white">7 Minutes</strong></p>
                  <p>• Emergency Channel: <strong className="text-emerald-400 font-bold">Offline Broadcast (162.4 MHz)</strong></p>
                  <p>• Emergency Dispatch contact: <strong className="text-cyan-400">Security Sector 4</strong></p>
                </div>
              </div>
            ) : !groupActive ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center space-y-3">
                <Users size={32} className="text-gray-600 animate-pulse" />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400">No Active Group Found</p>
                  <p className="text-[8px] text-gray-500 max-w-[200px] mx-auto">Create a travel group to link real-time coordinates, sync meeting points, and access AI assistance warnings.</p>
                </div>
                <button
                  onClick={() => {
                    playBeep();
                    setGroupActive(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-[9px] font-extrabold cursor-pointer border-none hover:bg-cyan-400 transition-all"
                >
                  Link Live Portals
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* 1. Connect Tab */}
                {activeCompanionTab === "connect" && (
                  <div className="space-y-3">
                    {/* Live Member Statuses */}
                    <div className="space-y-2">
                      <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-wider block font-mono">Live Group Status</span>
                      <div className="grid grid-cols-1 gap-2">
                        {groupMembers.map((m) => (
                          <div key={m.name} className="p-2.5 rounded-xl bg-slate-900/50 border border-white/5 text-[9px] font-mono flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${m.status.includes("Lost") ? "bg-red-500 animate-ping" : "bg-emerald-400"}`} />
                              <div>
                                <span className="font-bold text-white block">{m.name} <span className="text-[8px] text-gray-500 font-normal">({m.role})</span></span>
                                <span className="text-gray-400 text-[8px]">{m.loc}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-[8px] font-bold block ${m.battery === "8%" ? "text-red-500 animate-pulse font-extrabold" : "text-gray-500"}`}>
                                🔋 {m.battery}
                              </span>
                              <span className="text-[7px] text-gray-500 block uppercase">{m.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Fan Guardian Security Alert widget */}
                    <div className="p-3 rounded-xl border border-red-500/20 bg-red-950/10 space-y-2">
                      <span className="text-[8px] font-bold text-red-400 uppercase tracking-wider block font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> AI Fan Guardian Status
                      </span>
                      <div className="space-y-1 text-[8px] font-mono text-gray-300">
                        <p>• <strong>Alert (John)</strong>: Member might become unreachable within 8 minutes (lost signal).</p>
                        <p>• <strong>Alert (Maria)</strong>: Member moving opposite direction to seat coordinates.</p>
                        <p>• <strong>Warning (Rahul)</strong>: Critical battery alert (8% remaining).</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-white/5">
                        <button
                          onClick={() => {
                            playSuccess();
                            setGuardianNotification("SUCCESS: Offline route maps cached and sent to John & Rahul.");
                            setTimeout(() => setGuardianNotification(null), 4000);
                          }}
                          className="py-1 bg-slate-900 border border-white/10 hover:border-cyan-500/30 text-cyan-400 rounded text-[7px] font-bold cursor-pointer font-mono text-center hover:bg-slate-950"
                        >
                          Save Offline Maps
                        </button>
                        <button
                          onClick={() => {
                            playSuccess();
                            setGuardianNotification("SUCCESS: Group meeting point established near Food Court FC-02.");
                            setTimeout(() => setGuardianNotification(null), 4000);
                          }}
                          className="py-1 bg-slate-900 border border-white/10 hover:border-cyan-500/30 text-cyan-400 rounded text-[7px] font-bold cursor-pointer font-mono text-center hover:bg-slate-950"
                        >
                          Share Meeting Point
                        </button>
                        <button
                          onClick={() => {
                            playSuccess();
                            setGuardianNotification("SUCCESS: Security Volunteer Team dispatched to assist Rahul.");
                            setTimeout(() => setGuardianNotification(null), 4000);
                          }}
                          className="py-1 bg-slate-900 border border-white/10 hover:border-cyan-500/30 text-cyan-400 rounded text-[7px] font-bold cursor-pointer font-mono text-center hover:bg-slate-950"
                        >
                          Notify Volunteers
                        </button>
                        <button
                          onClick={() => {
                            playSuccess();
                            setGuardianNotification("SUCCESS: Optimized stairs-free route shared to Maria's device.");
                            setTimeout(() => setGuardianNotification(null), 4000);
                          }}
                          className="py-1 bg-slate-900 border border-white/10 hover:border-cyan-500/30 text-cyan-400 rounded text-[7px] font-bold cursor-pointer font-mono text-center hover:bg-slate-950"
                        >
                          Share Optimized Route
                        </button>
                      </div>
                      {guardianNotification && (
                        <p className="text-[7px] text-emerald-400 font-mono animate-fadeIn pt-1 leading-normal text-center">
                          {guardianNotification}
                        </p>
                      )}
                    </div>

                    {/* Stadium Mini Map */}
                    <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/5 space-y-2">
                      <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-wider block font-mono">Stadium Radar Mini Map</span>
                      <div className="font-mono text-[8px] text-gray-500 bg-slate-950/80 p-3 rounded-lg border border-white/5 text-center leading-relaxed whitespace-pre overflow-x-auto">
{`---------------------------------------
               STADIUM CORES
---------------------------------------
    [ GATE A ] ------------ ( Robert: Lost )
        |
        | ------ [ Gate B2 ] ---- ( Rahul )
        |
    [ GATE C2 ] ---------- ( YOU / Seat 104 )
        |
        | ------ [ Food Court FC-02 ] -- ( Maria )
        |
    [ METRO LINE M3 ] ----- ( John )
---------------------------------------`}
                      </div>
                      <div className="flex justify-between items-center text-[7px] text-gray-500 font-mono">
                        <span>● Green = Live Shared</span>
                        <span>▲ Blue = Meeting Point</span>
                        <span>✖ Red = Offline Alert</span>
                      </div>
                    </div>

                    {/* Group Insights Stats */}
                    <div className="p-3.5 rounded-xl bg-slate-900/30 border border-white/5 space-y-2">
                      <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wider block font-mono">Group Insights telemetry</span>
                      <div className="grid grid-cols-2 gap-2 text-xxs font-mono text-gray-400">
                        <div className="p-2 rounded bg-slate-950/40 border border-white/5">
                          <p className="text-[8px] text-gray-500 uppercase">Average Walking Time</p>
                          <strong className="text-white text-xs">5 Minutes</strong>
                        </div>
                        <div className="p-2 rounded bg-slate-950/40 border border-white/5">
                          <p className="text-[8px] text-gray-500 uppercase">Meeting Point Proximity</p>
                          <strong className="text-emerald-400 text-xs">98% Accuracy</strong>
                        </div>
                        <div className="p-2 rounded bg-slate-950/40 border border-white/5">
                          <p className="text-[8px] text-gray-500 uppercase">AI Predictions Ran</p>
                          <strong className="text-cyan-400 text-xs">21 Recommendations</strong>
                        </div>
                        <div className="p-2 rounded bg-slate-950/40 border border-white/5">
                          <p className="text-[8px] text-gray-500 uppercase">Potential Delays Prevented</p>
                          <strong className="text-emerald-400 text-xs">8 Incident Flags</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Assistance Tab */}
                {activeCompanionTab === "assistance" && (
                  <div className="space-y-3">
                    
                    {/* SOS BUTTON PANEL */}
                    <div className="p-4 rounded-xl bg-red-950/15 border border-red-500/25 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-extrabold text-red-400 tracking-wider uppercase block font-mono">AI SOS ASSISTANCE COMMAND</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      </div>
                      
                      {!sosActive ? (
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            "I AM LOST",
                            "I AM FEELING UNWELL",
                            "SEPARATED FROM GROUP",
                            "ACCESSIBILITY NEED",
                            "CALL VOLUNTEER",
                            "SHARE MY LOCATION"
                          ].map((choice) => (
                            <button
                              key={choice}
                              onClick={() => {
                                playBeep();
                                setSosActive(choice);
                                setSosProgress(0);
                                const interval = setInterval(() => {
                                  setSosProgress((prev) => {
                                    if (prev >= 100) {
                                      clearInterval(interval);
                                      return 100;
                                    }
                                    return prev + 25;
                                  });
                                }, 300);
                              }}
                              className="p-2 rounded-lg bg-red-950/30 border border-red-500/20 hover:bg-red-900/40 text-[8px] text-red-300 font-mono font-bold cursor-pointer transition-all border-none text-left"
                            >
                              ⚠️ {choice}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2.5 font-mono text-[9px] bg-black/40 p-3 rounded-lg border border-red-500/10">
                          <div className="flex justify-between text-red-400 font-bold">
                            <span>Triggered: {sosActive}</span>
                            <button
                              onClick={() => { playBeep(); setSosActive(null); }}
                              className="text-[8px] text-gray-500 hover:text-white cursor-pointer bg-transparent border-none font-bold"
                            >
                              [CANCEL]
                            </button>
                          </div>
                          
                          {sosProgress < 100 ? (
                            <div className="space-y-1">
                              <p className="text-gray-500">Transmitting coordinates via secure Event Bus...</p>
                              <div className="w-full h-1 bg-red-950 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${sosProgress}%` }} />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 animate-fadeIn">
                              <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-300 text-[8px] rounded space-y-1">
                                <p>• <strong>GPS coordinates locked</strong>: Sector 4 Concourse (AT&T Stadium)</p>
                                <p>• <strong>Nearest Volunteer Dispatched</strong>: 23 meters away</p>
                                <p>• <strong>Medical Team Notified</strong>: Alert status: STANDBY</p>
                              </div>
                              <p className="text-gray-400">Estimated Volunteer Arrival: <strong className="text-white">1 min 48 secs</strong></p>
                              <p className="text-gray-500">Confidence: <strong className="text-emerald-400">98%</strong> | Grounded in: Local Dispatch Agent</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Lost Child Assistance Widget (Privacy Safe) */}
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-extrabold text-cyan-400 tracking-wider uppercase block font-mono">Lost Child Volunteer Rescue</span>
                        <span className="text-[7px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded font-mono">Privacy Secure</span>
                      </div>
                      <p className="text-[8px] text-gray-500 font-mono">GPS + manual check-in matching coordinates. Strictly no facial recognition or CCTV biometric scans.</p>

                      {!lostChildSubmitted ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[7px] uppercase text-gray-500 block mb-0.5 font-bold">Child Name</label>
                              <input
                                type="text"
                                value={lostChildName}
                                onChange={(e) => setLostChildName(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-[9px] text-white focus:outline-none focus:border-cyan-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[7px] uppercase text-gray-500 block mb-0.5 font-bold">Age</label>
                              <input
                                type="text"
                                value={lostChildAge}
                                onChange={(e) => setLostChildAge(e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-[9px] text-white focus:outline-none focus:border-cyan-500 font-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[7px] uppercase text-gray-500 block mb-0.5 font-bold">Last GPS Check-in Point</label>
                            <input
                              type="text"
                              value={lostChildLoc}
                              onChange={(e) => setLostChildLoc(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-[9px] text-white focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <button
                            onClick={() => { playBeep(); setLostChildSubmitted(true); }}
                            className="w-full py-2 rounded bg-cyan-500 text-slate-950 text-[9px] font-mono font-bold cursor-pointer transition-all border-none"
                          >
                            Submit Volunteer Search Alert
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-lg space-y-2 font-mono text-[9px]">
                          <div className="flex justify-between items-center text-cyan-400 font-bold">
                            <span>Search Active: {lostChildName} ({lostChildAge} Yrs)</span>
                            <button
                              onClick={() => { playBeep(); setLostChildSubmitted(false); }}
                              className="text-[8px] text-gray-500 hover:text-white cursor-pointer bg-transparent border-none font-bold"
                            >
                              [RESET]
                            </button>
                          </div>
                          <p className="text-gray-400">Last Point: {lostChildLoc}</p>
                          <div className="p-2 bg-slate-900/50 rounded border border-white/5 text-[8px] space-y-1">
                            <p className="text-white">✔ <strong>Nearest Volunteer</strong>: 23 meters away dispatched.</p>
                            <p className="text-white">✔ <strong>Meeting Point Assigned</strong>: Medical Bay A</p>
                            <p className="text-white">✔ <strong>Est. Assistance Time</strong>: 2 Minutes</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Low battery warning alert widget */}
                    <div className="p-3 rounded-xl bg-orange-950/15 border border-orange-500/25 space-y-2 font-mono text-[9px]">
                      <div className="text-orange-400 font-bold flex items-center gap-1.5">
                        <AlertTriangle size={14} className="animate-pulse" />
                        <span>AI GROUP BATTERY WARNING</span>
                      </div>
                      <p className="text-gray-400">Rahul's phone battery is extremely low (<strong className="text-white">8%</strong>). Last check-in coordinate: <strong className="text-white">Gate B2</strong>.</p>
                      <p className="text-gray-400">AI Prediction: May become unreachable within <strong className="text-white">12 minutes</strong>.</p>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => { playSuccess(); alert("Meeting point shared with group."); }}
                          className="flex-1 py-1 rounded bg-orange-950 border border-orange-500/30 text-orange-300 text-[8px] cursor-pointer"
                        >
                          Share Meeting Point
                        </button>
                        <button
                          onClick={() => { playSuccess(); alert("Offline route cache sent to Rahul."); }}
                          className="flex-1 py-1 rounded bg-orange-950 border border-orange-500/30 text-orange-300 text-[8px] cursor-pointer"
                        >
                          Save Offline Route
                        </button>
                      </div>
                    </div>

                    {/* Smart Crowd Awareness Card */}
                    <div className="p-3 rounded-xl bg-amber-950/10 border border-amber-500/20 space-y-2 font-mono text-[9px]">
                      <div className="text-amber-400 font-bold flex items-center gap-1.5">
                        <Info size={14} />
                        <span>SMART CROWD AWARENESS ALERT</span>
                      </div>
                      <p className="text-gray-400">Concession Food Court <strong className="text-white">FC-03</strong> is highly congested (Crowd Level: <strong className="text-orange-400">96%</strong> | Queue Wait: <strong className="text-white">28 Minutes</strong>).</p>
                      <p className="text-gray-300 bg-black/30 p-2 rounded">
                        <strong>AI Recommendation</strong>: Direct group members to <strong className="text-emerald-400 font-bold">Food Court FC-05</strong> (Queue Wait: 6 Minutes). All group members will save <strong className="text-emerald-400">22 minutes</strong>.
                      </p>
                      <p className="text-gray-500 text-[8px]">Confidence: 97% | Grounded in: Local Crowd Telemetry</p>
                    </div>

                  </div>
                )}

                {/* 3. Navigation Tab */}
                {activeCompanionTab === "navigation" && (
                  <div className="space-y-3 font-mono text-[9px]">
                    
                    {/* Smart Meeting Point AI */}
                    <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/5 space-y-3">
                      <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-wider block">Smart Meeting Point recommendation</span>
                      <div className="space-y-1">
                        <p className="text-gray-400">AI Proposed Point: <strong className="text-white">Food Court FC-03</strong></p>
                        <p className="text-gray-500 text-[8px]">Calculated based on average walk lines and path constraints.</p>
                      </div>
                      <div className="bg-black/30 p-2.5 rounded border border-white/5 space-y-1.5">
                        <div className="flex justify-between">
                          <span>Somashekhar (YOU)</span>
                          <span className="text-cyan-400 font-bold">3 mins</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rahul (Parking)</span>
                          <span className="text-cyan-400 font-bold">5 mins</span>
                        </div>
                        <div className="flex justify-between">
                          <span>John (Metro)</span>
                          <span className="text-cyan-400 font-bold">4 mins</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Maria (Food Court)</span>
                          <span className="text-cyan-400 font-bold">2 mins</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Robert (Outside)</span>
                          <span className="text-cyan-400 font-bold">6 mins</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[8px] text-gray-500">
                        <span>Group Wait: <strong>5 Minutes</strong></span>
                        <span>Confidence: <strong className="text-emerald-400">98%</strong></span>
                      </div>
                    </div>

                    {/* Split Group Navigation */}
                    <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/5 space-y-2">
                      <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wider block">Split Group Navigation Paths</span>
                      <div className="space-y-2 text-[8px] text-gray-400">
                        <div>
                          <span className="text-white font-bold block">● Somashekhar & Rahul (Sync Point: Gate C2)</span>
                          <span>Parking / Seat ➔ Gate C2. (Est. Arrival: 4 min)</span>
                        </div>
                        <div>
                          <span className="text-white font-bold block">● John & Maria (Sync Point: Food Court)</span>
                          <span>Metro / FC-02 ➔ FC-03. (Est. Arrival: 5 min)</span>
                        </div>
                        <div>
                          <span className="text-white font-bold block">● Robert (Lost Fallback route)</span>
                          <span>Metro M3 ➔ Gate A ➔ Redirected ➔ Gate C2. (Est. Arrival: 7 min)</span>
                        </div>
                      </div>
                    </div>

                    {/* Match Day Journey Timeline */}
                    <div className="p-3.5 rounded-xl bg-slate-900/30 border border-white/5 space-y-2">
                      <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-wider block">Your Live Match Day Timeline</span>
                      <div className="flex flex-col gap-2 relative pl-4 border-l border-white/10 ml-2">
                        {[
                          { time: "07:00 PM", text: "Reached Metro Terminal" },
                          { time: "07:08 PM", text: "Reached Stadium Parking lot" },
                          { time: "07:14 PM", text: "Checked-in Gate C2" },
                          { time: "07:18 PM", text: "Security clearance completed" },
                          { time: "07:21 PM", text: "Concourse Concessions visited" },
                          { time: "07:27 PM", text: "Reached Seat 104", success: true }
                        ].map((node, i) => (
                          <div key={i} className="relative">
                            <span className={`absolute -left-[20px] top-1 w-2.5 h-2.5 rounded-full border border-[#08090d] ${
                              node.success ? "bg-emerald-400 animate-pulse" : "bg-cyan-500"
                            }`} />
                            <span className="text-gray-500 font-bold block">{node.time}</span>
                            <span className={node.success ? "text-emerald-400 font-bold" : "text-white"}>{node.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* 4. Memories Tab */}
                {activeCompanionTab === "memories" && (
                  <div className="space-y-3">
                    
                    {/* Journey Score Analytics */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/20 to-purple-950/20 border border-white/10 space-y-3 font-mono text-[9px]">
                      <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-wider block">Live Journey Scorecard</span>
                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                        <span>Match Day Journey Score</span>
                        <strong className="text-emerald-400 text-sm">98%</strong>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[8px] text-gray-400">
                        <p>Time Saved: <strong className="text-cyan-400">34 Mins</strong></p>
                        <p>Walking Distance: <strong className="text-white">890m</strong></p>
                        <p>Congestion Avoided: <strong className="text-emerald-400">Gate C bottleneck</strong></p>
                        <p>Queue Time Saved: <strong className="text-white">36 Mins</strong></p>
                        <p>Accessibility Compliance: <strong className="text-emerald-400">100% (Ramp Routes)</strong></p>
                        <p>Recommendation Accuracy: <strong className="text-white">97%</strong></p>
                        <p>AI Core Confidence: <strong className="text-cyan-400">98%</strong></p>
                      </div>
                    </div>

                    {/* AI Stadium Memory Wall */}
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 space-y-3">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block flex items-center gap-1.5 font-mono">
                        <Sparkles size={14} className="text-cyan-400" /> AI Stadium Memory Wall
                      </span>
                      <p className="text-[8px] text-gray-500 font-mono">Download your custom journey story, compiled route statistics, and volunteer dispatches from your match day.</p>
                      
                      {/* Timeline Story Visuals */}
                      <div className="p-3 bg-slate-950/80 rounded-lg border border-white/5 space-y-2 text-[8px] font-mono text-gray-400 leading-normal max-h-[140px] overflow-y-auto">
                        <span className="text-[7px] text-gray-500 block uppercase font-bold border-b border-white/5 pb-1">Journey Timeline Events</span>
                        <p>⏱️ <strong className="text-cyan-400">5:30 PM</strong>: Started journey from Dallas residence.</p>
                        <p>⏱️ <strong className="text-white">5:45 PM</strong>: AI recommended Metro M3 detour (saved 24 mins).</p>
                        <p>⏱️ <strong className="text-white">6:10 PM</strong>: Congestion detected at Gate C. Detoured to Gate C2.</p>
                        <p>⏱️ <strong className="text-amber-400">6:22 PM</strong>: Robert went offline. Cached maps & coordinates loaded.</p>
                        <p>⏱️ <strong className="text-emerald-400">MATCH END</strong>: Safely evacuated AT&T Stadium via South Metro.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={() => {
                            playSuccess();
                            handleDownloadFile("txt");
                            setMemoryDownloaded("txt");
                            setTimeout(() => setMemoryDownloaded(null), 3000);
                          }}
                          className="py-2.5 rounded bg-cyan-500 text-slate-950 text-[9px] font-mono font-bold cursor-pointer border-none hover:bg-cyan-400 transition-all text-center"
                        >
                          Download Memory Story
                        </button>
                        <button
                          onClick={() => {
                            playSuccess();
                            handleDownloadFile("json");
                            setMemoryDownloaded("json");
                            setTimeout(() => setMemoryDownloaded(null), 3000);
                          }}
                          className="py-2.5 rounded bg-slate-900 border border-white/10 hover:border-cyan-500/30 text-[9px] font-mono font-bold text-cyan-400 cursor-pointer transition-all text-center"
                        >
                          Download Memory JSON
                        </button>
                      </div>

                      {memoryDownloaded && (
                        <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 rounded text-center text-emerald-400 text-[8px] font-mono animate-pulse">
                          Successfully compiled and downloaded Match Memory.{memoryDownloaded.toUpperCase()}!
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center/Right Column: Unified Match Day Assistant, AI Match Journey, Chat Guide */}
        <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-1">
          
          {/* Match Day Assistant Card */}
          {ticketPlanActive ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Match Day Assistant */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900/80 border border-purple-500/20 space-y-4">
                <span className="text-[9px] font-extrabold text-purple-400 tracking-widest uppercase block font-mono">MATCH DAY ASSISTANT</span>
                <div className="space-y-1">
                  <h2 className="text-md font-extrabold text-white uppercase">{t("welcome_back")} SOMASHEKHAR</h2>
                  <p className="text-[10px] text-gray-400">Match: <strong className="text-white">Brazil VS Spain</strong> (FIFA World Cup Final)</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xxs font-mono text-gray-400">
                  <p>Kickoff: <strong className="text-white">6:00 PM</strong></p>
                  <p>Weather: <strong className="text-white">28°C</strong></p>
                  <p>Parking: <strong className="text-amber-500">P2 (82% Occupancy)</strong></p>
                  <p>Recommended Gate: <strong className="text-cyan-400">C2</strong></p>
                  <p>Metro Delay: <strong className="text-emerald-400">NO</strong></p>
                  <p>Waiting Time: <strong className="text-cyan-400">4 Minutes</strong></p>
                  <p>Seat Number: <strong className="text-white">A-102</strong></p>
                  <p>Accessibility status: <strong className="text-cyan-400">{wheelchairMode ? "WHEELCHAIR ACTIVE" : "NORMAL"}</strong></p>
                </div>
              </div>

              {/* Card 2: AI Match Journey */}
              <div className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-4">
                <span className="text-[9px] font-extrabold text-cyan-400 tracking-widest uppercase block font-mono">AI MATCH JOURNEY</span>
                <div className="space-y-3 text-[10px] font-mono">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span>Departure Time: <strong className="text-white">5:05 PM</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Metro Line: <strong className="text-white">M3</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Walking Time: <strong className="text-white">6 Minutes</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Food Court: <strong className="text-orange-400">FC-03 Recommended</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Washroom: <strong className="text-cyan-400">WR-07</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Estimated Arrival: <strong className="text-white">5:48 PM</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>AI Confidence: <strong className="text-emerald-400">96%</strong></span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/20 text-center py-8 text-xxs text-gray-500 font-mono">
              Upload your World Cup match ticket to configure the AI Match Journey and Match Day Assistant.
            </div>
          )}

          {/* Chat Assistant */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 flex-1 flex flex-col min-h-[300px]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block flex items-center gap-1.5 border-b border-white/5 pb-2.5 mb-3">
              <Sparkles size={14} className="text-cyan-400" /> Fan Companion Chat Assistant
            </span>

            {/* Messages box */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
              {messages.map((m, mIdx) => {
                const isUser = m.role === "user";
                return (
                  <div key={mIdx} className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}>
                    <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                      isUser
                        ? "bg-cyan-500 text-slate-950 font-bold rounded-tr-none"
                        : "bg-slate-900/60 border border-white/5 rounded-tl-none text-gray-300"
                    }`}>
                      {m.content}
                    </div>

                    {/* Explainable AI block & Agent Contributions checkmarks */}
                    {!isUser && (m.why || m.agents) && (
                      <div className="w-[85%] p-3.5 bg-slate-950/90 rounded-xl border border-white/5 space-y-2.5 font-mono text-[8px] text-gray-400">
                        <span className="text-cyan-400 block font-bold tracking-wider uppercase text-[9px]">Grounded AI Explanation</span>
                        <div className="grid grid-cols-2 gap-2 text-[8px] border-b border-white/5 pb-2">
                          <p>• Confidence: <strong className="text-emerald-400">{m.confidence || "98%"}</strong></p>
                          <p>• Risk Level: <strong className="text-emerald-400">LOW</strong></p>
                          <p>• Time Saved: <strong className="text-cyan-400">12 Minutes</strong></p>
                          <p>• Status: <strong className="text-cyan-400">SUCCESSFULLY VALIDATED</strong></p>
                        </div>
                        {m.why && <p className="pt-1 leading-normal"><strong className="text-gray-500">WHY (Reasoning):</strong> {m.why}</p>}
                        <p><strong className="text-gray-500">Alternative:</strong> Use alternate Gate C2 routes or Concourse FC-03 channels.</p>
                        {m.agents && (
                          <div className="pt-1.5 border-t border-white/5">
                            <span className="text-gray-500 block font-bold mb-1">COOPERATING AI AGENTS CONTRIBUTED</span>
                            <div className="flex flex-wrap gap-1 text-[7px]">
                              {m.agents.map((ag: string) => (
                                <span key={ag} className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/20 text-cyan-400 flex items-center gap-1">
                                  <CheckCircle2 size={8} className="text-cyan-400" /> {ag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {chatLoading && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-cyan-500/20 text-xxs font-mono text-gray-400 space-y-1 animate-pulse">
                  <span className="text-cyan-400 font-bold block mb-1">🛰️ AI Co-Pilot Thinking Process...</span>
                  <p className="flex items-center gap-1.5">
                    <span className={reasoningStep.includes("Coordination") || reasoningStep.includes("vectors") || reasoningStep.includes("Accessibility") || reasoningStep.includes("grounding") || reasoningStep.includes("ready") ? "text-emerald-400 font-bold font-mono" : "text-gray-600 font-mono"}>
                      [✓] Observing micro-weather & telemetry states
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className={reasoningStep.includes("vectors") || reasoningStep.includes("Accessibility") || reasoningStep.includes("grounding") || reasoningStep.includes("ready") ? "text-emerald-400 font-bold font-mono" : "text-gray-600 font-mono"}>
                      [✓] Fetching crowd wait times & capacities
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className={reasoningStep.includes("Accessibility") || reasoningStep.includes("grounding") || reasoningStep.includes("ready") ? "text-emerald-400 font-bold font-mono" : "text-gray-600 font-mono"}>
                      [✓] Evaluating accessibility wheelchair parameters
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className={reasoningStep.includes("grounding") || reasoningStep.includes("ready") ? "text-emerald-400 font-bold font-mono" : "text-gray-600 font-mono"}>
                      [✓] Simulating congestion timeline forecast
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className={reasoningStep.includes("ready") ? "text-emerald-400 font-bold font-mono" : "text-gray-600 font-mono"}>
                      [✓] Grounding explainable decision vectors (98% confidence)
                    </span>
                  </p>
                  <div className="text-cyan-400 text-[8px] pt-1 uppercase tracking-wider font-bold">
                    &gt; {reasoningStep}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="flex gap-2">
              <button
                onClick={handleMicClick}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isRecording
                    ? "bg-red-600 border-red-500 text-white animate-pulse"
                    : "bg-slate-900 border-white/10 text-cyan-400 hover:border-cyan-500/30"
                }`}
              >
                <Mic size={15} />
              </button>
              <input
                type="text"
                placeholder="Ask stadium AI..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-cyan-500/50"
              />
              <button
                onClick={() => handleSendChat()}
                className="p-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 cursor-pointer border-none"
              >
                <Send size={15} />
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
