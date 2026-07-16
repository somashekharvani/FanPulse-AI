"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GlobeTwin from "@/components/GlobeTwin";
import { Shield, Sparkles, Activity, ShieldCheck, Database, Cpu, Lock, Key, Mail, Terminal, Info, MapPin } from "lucide-react";
import { playSuccess, playBeep } from "@/utils/audio";
import { API_BASE } from "@/utils/api";

export default function Home() {
  const router = useRouter();

  // Dynamic Venue Config States
  const [flagshipCity, setFlagshipCity] = useState("Dallas");
  const [flagshipStadium, setFlagshipStadium] = useState("AT&T Stadium");
  const [zoomingCity, setZoomingCity] = useState<string | null>(null);
  const [zoomStage, setZoomStage] = useState<"none" | "high-orbit" | "mid-orbit" | "low-orbit" | "redirect">("none");

  // Statistics indicators
  const [sensorsOnline, setSensorsOnline] = useState(81240);
  const [decisionsMade, setDecisionsMade] = useState(532);

  // Dynamic toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dialog panels
  const [authPortal, setAuthPortal] = useState<"login" | "signup" | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("fan");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Client-side password validation
  const [passwordStrength, setPasswordStrength] = useState<string[]>([]);

  useEffect(() => {
    // 1. Fetch configured flagship stadium details
    fetch(`${API_BASE}/venue/config`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data) => {
        setFlagshipCity(data.city);
        setFlagshipStadium(data.stadium);
      })
      .catch(() => {
        // Fallback defaults
        setFlagshipCity("Dallas");
        setFlagshipStadium("AT&T Stadium");
      });

    // Stats ticking loops
    const sensorInterval = setInterval(() => {
      setSensorsOnline((prev) => prev + Math.floor(Math.random() * 4));
    }, 2500);

    const decisionsInterval = setInterval(() => {
      setDecisionsMade((prev) => prev + 1);
    }, 9000);

    return () => {
      clearInterval(sensorInterval);
      clearInterval(decisionsInterval);
    };
  }, []);

  const validatePassword = (pwd: string) => {
    const rules = [];
    if (pwd.length >= 8) rules.push("Min 8 characters");
    if (/[A-Z]/.test(pwd)) rules.push("Uppercase letter");
    if (/[a-z]/.test(pwd)) rules.push("Lowercase letter");
    if (/\d/.test(pwd)) rules.push("Digit");
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) rules.push("Special character");
    setPasswordStrength(rules);
  };

  const handleShowToast = (msg: string) => {
    setToastMessage(msg);
    playBeep();
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleZoomComplete = (cityName: string) => {
    setZoomingCity(cityName);
    setZoomStage("high-orbit");
    playSuccess();
    
    setTimeout(() => {
      setZoomStage("mid-orbit");
      playBeep();
      
      setTimeout(() => {
        setZoomStage("low-orbit");
        playBeep();
        
        setTimeout(() => {
          setZoomStage("redirect");
          playSuccess();
          
          setTimeout(() => {
            router.push(`/organizer?city=${cityName.toLowerCase().replace(" ", "")}`);
          }, 800);
        }, 2500);
      }, 2200);
    }, 1500);
  };

  const handleOpenAuth = (role: string) => {
    playBeep();
    setSelectedRole(role);
    setMfaRequired(false);
    setEmail(`${role}@fanpulse.ai`);
    setPassword("Demo@2026");
    setMfaCode(role === "organizer" ? "123456" : "");
    setAuthError("");
    setAuthPortal("login");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const endpoint = authPortal === "login" ? "/auth/login" : "/auth/register";
    const payload: Record<string, any> = {
      email,
      password,
      role: selectedRole
    };

    if (authPortal === "login" && mfaRequired) {
      payload["mfa_code"] = mfaCode;
    }

    try {
      let res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // Dynamic Auto-Seeder: If login fails on fresh DB, register user first and then retry login
      if (!res.ok && authPortal === "login") {
        try {
          const registerRes = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role: selectedRole })
          });
          if (registerRes.ok) {
            res = await fetch(`${API_BASE}${endpoint}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
          }
        } catch (err) {}
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Authentication request failed.");
      }

      if (data.mfa_required) {
        setMfaRequired(true);
        setAuthLoading(false);
        playBeep();
        return;
      }

      // Success login
      localStorage.setItem("fanpulse_access_token", data.access_token);
      localStorage.setItem("fanpulse_refresh_token", data.refresh_token);
      localStorage.setItem("fanpulse_role", data.role);
      localStorage.setItem("fanpulse_email", data.email);

      playSuccess();
      setAuthPortal(null);
      setAuthLoading(false);

      // Route based on logged-in role
      if (data.role === "organizer") router.push("/organizer");
      else if (data.role === "fan") router.push("/fan");
      else if (data.role === "volunteer") router.push("/volunteer");
      else if (data.role === "security") router.push("/security");
    } catch (err: any) {
      setAuthError(err.message || "Connection timed out.");
      setAuthLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col lg:flex-row justify-between items-center p-6 lg:p-12 relative overflow-hidden font-sans bg-[#040508] min-h-screen text-white">
      {/* Dynamic gradients background */}
      <div className="absolute top-[-25%] left-[-25%] w-[70%] h-[70%] bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-25%] w-[70%] h-[70%] bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      {/* Floating Link Alert Toast */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 bg-cyan-950/80 border-2 border-cyan-500 rounded-xl text-xs text-cyan-400 font-mono shadow-xl flex items-center gap-2 animate-bounce">
          <Terminal size={14} className="animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Cinematic Zoom Overlay */}
      {zoomStage !== "none" && (
        <div className="fixed inset-0 bg-slate-950/95 z-[999] flex flex-col justify-center items-center backdrop-blur-lg transition-all duration-500 font-mono text-cyan-400 font-sans">
          <style>{`
            @keyframes zoomSat {
              0% { transform: scale(1.0); }
              100% { transform: scale(1.18); }
            }
            @keyframes laserScan {
              0% { top: 10%; }
              50% { top: 90%; }
              100% { top: 10%; }
            }
          `}</style>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0%,transparent_70%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

          {zoomStage === "high-orbit" && (
            <div className="flex flex-col items-center gap-6 max-w-lg text-center p-6 space-y-4">
              <div className="relative w-32 h-32 rounded-full border border-cyan-500/30 flex items-center justify-center">
                <div className="absolute inset-2 rounded-full border border-dashed border-cyan-500/20 animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-6 rounded-full border border-cyan-500/10" />
                <div className="absolute w-full h-full rounded-full border-t border-cyan-400 animate-[spin_2s_linear_infinite] origin-center" />
                <MapPin className="text-cyan-400 animate-bounce" size={24} />
              </div>
              <div className="space-y-2">
                <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 animate-pulse">
                  Establishing Satellite Link
                </h2>
                <div className="text-[10px] text-gray-500 space-y-1 text-left font-mono bg-slate-900/60 p-4 rounded-xl border border-white/5">
                  <p>&gt; [SAT] Resolving orbital camera position...</p>
                  <p>&gt; [SAT] Lock-on coordinates: Dallas Host Sector</p>
                  <p>&gt; [SAT] Initiating high-resolution zoom sequence...</p>
                </div>
              </div>
            </div>
          )}

          {zoomStage === "mid-orbit" && (
            <div className="relative w-full h-full flex flex-col justify-center items-center p-6 space-y-4">
              <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center">
                <img
                  src="/images/dallas_satellite.png"
                  alt="Dallas Satellite"
                  className="w-full h-full object-cover opacity-25"
                  style={{ animation: "zoomSat 2.2s ease-out forwards" }}
                />
              </div>
              <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg text-center bg-slate-950/85 p-6 rounded-2xl border border-cyan-500/20 backdrop-blur-md">
                <div className="relative w-16 h-16 rounded-full border border-cyan-500/30 flex items-center justify-center animate-[spin_8s_linear_infinite]">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 animate-pulse">
                    Decending: Dallas Stratosphere
                  </h2>
                  <div className="text-[9px] text-gray-500 space-y-1 text-left font-mono bg-slate-900/40 p-4 rounded-xl border border-white/5">
                    <p>&gt; [SAT] Current Altitude: 38,000 meters</p>
                    <p>&gt; [SAT] Syncing Live Match Day grids...</p>
                    <p>&gt; [SAT] Core sensor link status: nominal (99.8%)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {zoomStage === "low-orbit" && (
            <div className="relative w-full h-full flex flex-col justify-center items-center p-6 space-y-4">
              <div className="absolute inset-0 z-0 overflow-hidden flex items-center justify-center">
                <img
                  src="/images/stadium_satellite.png"
                  alt="Stadium Satellite"
                  className="w-full h-full object-cover opacity-35"
                  style={{ animation: "zoomSat 2.5s ease-out forwards" }}
                />
              </div>
              <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg text-center bg-slate-950/85 p-6 rounded-2xl border border-emerald-500/20 backdrop-blur-md">
                <div className="w-48 h-20 relative flex items-center justify-center opacity-85">
                  <svg viewBox="0 0 160 100" className="w-full h-full stroke-emerald-500 fill-none stroke-[0.8] animate-pulse">
                    <ellipse cx="80" cy="50" rx="60" ry="35" />
                    <line x1="20" y1="50" x2="140" y2="50" strokeDasharray="3,3" />
                  </svg>
                  <div 
                    className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-md shadow-emerald-400"
                    style={{
                      animation: "laserScan 2.5s ease-in-out infinite",
                      boxShadow: "0 0 10px #34d399, 0 0 20px #34d399"
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-400 animate-pulse">
                    Locking: {flagshipStadium}
                  </h2>
                  <div className="text-[9px] text-gray-500 space-y-1 text-left font-mono bg-slate-900/40 p-4 rounded-xl border border-white/5">
                    <p>&gt; [DEPLOY] Current Altitude: 220 meters</p>
                    <p>&gt; [DEPLOY] Mounting curved seating stands & structures...</p>
                    <p>&gt; [DEPLOY] Initializing command twin overlays...</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {zoomStage === "redirect" && (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-ping w-8 h-8 rounded-full bg-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400 animate-pulse">
                Connection Secure. Deploying Console...
              </h2>
            </div>
          )}
        </div>
      )}

      {/* Left Column: Command Hub Panel */}
      <div className="w-full lg:w-5/12 z-10 space-y-8 flex flex-col justify-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-cyan-500/20 text-[9px] font-extrabold text-cyan-400 uppercase tracking-widest shadow-lg shadow-cyan-500/5">
            <Sparkles size={11} className="text-cyan-400 animate-pulse" /> The Global Agentic AI Stadium Operating System for FIFA World Cup 2026
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-none">
            FanPulse <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-purple-400 bg-clip-text text-transparent">AI</span>
          </h1>
          <p className="text-xs lg:text-sm text-gray-400 leading-relaxed font-semibold">
            Enterprise Cognitive Net for the FIFA World Cup 2026. A unified system coordinating real-time telemetry, predictive crowd models, and multi-agent operations.
          </p>
        </div>

        {/* Dynamic telemetry metrics */}
        <div className="grid grid-cols-3 gap-4 p-5 rounded-2xl bg-slate-950/60 border border-white/5 backdrop-blur-md">
          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider block font-bold">IoT Sensors</span>
            <span className="text-md font-extrabold font-mono text-cyan-400">{sensorsOnline.toLocaleString()}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider block font-bold">Active Agents</span>
            <span className="text-md font-extrabold font-mono text-emerald-400">8 Online</span>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider block font-bold">Model Health</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> 99.98%
            </span>
          </div>
        </div>

        {/* Navigation Portals */}
        <div className="space-y-3.5">
          <span className="text-[10px] text-gray-500 font-bold uppercase block tracking-wider font-mono">Deploy Operator Portals</span>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              onClick={() => {
                playBeep();
                router.push("/global");
              }}
              className="p-3.5 rounded-xl border border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-950/30 text-left text-xs font-bold transition-all cursor-pointer col-span-2 md:col-span-1 shadow-lg shadow-cyan-500/5"
            >
              <span className="text-cyan-400 block mb-1 flex items-center gap-1">🌐 Command Center</span>
              <span className="text-[9px] text-gray-500 font-normal font-semibold">16 Host Cities Digital Twin</span>
            </button>
            <button
              onClick={() => handleOpenAuth("organizer")}
              className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-950/5 hover:bg-purple-950/15 text-left text-xs font-bold transition-all cursor-pointer"
            >
              <span className="text-purple-400 block mb-1">Organizer Hub</span>
              <span className="text-[9px] text-gray-500 font-normal">Command Console & forecasts</span>
            </button>
            <button
              onClick={() => handleOpenAuth("fan")}
              className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-950/5 hover:bg-cyan-950/15 text-left text-xs font-bold transition-all cursor-pointer"
            >
              <span className="text-cyan-400 block mb-1">Fan Companion</span>
              <span className="text-[9px] text-gray-500 font-normal">Tickets, maps & companion chat</span>
            </button>
            <button
              onClick={() => handleOpenAuth("volunteer")}
              className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/5 hover:bg-emerald-950/15 text-left text-xs font-bold transition-all cursor-pointer"
            >
              <span className="text-emerald-400 block mb-1">Volunteer Portal</span>
              <span className="text-[9px] text-gray-500 font-normal">Assigned dispatch tasks</span>
            </button>
            <button
              onClick={() => handleOpenAuth("security")}
              className="p-3.5 rounded-xl border border-red-500/20 bg-red-950/5 hover:bg-red-950/15 text-left text-xs font-bold transition-all cursor-pointer"
            >
              <span className="text-red-400 block mb-1">Security Console</span>
              <span className="text-[9px] text-gray-500 font-normal">Incident registers & dispatcher</span>
            </button>
            <button
              onClick={() => {
                playBeep();
                router.push("/trust");
              }}
              className="p-3.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-left text-xs font-bold transition-all cursor-pointer col-span-2 md:col-span-1"
            >
              <span className="text-gray-300 block mb-1 flex items-center gap-1"><Info size={12} /> Compliance</span>
              <span className="text-[9px] text-gray-500 font-normal">Trust & Privacy safeguards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: 3D Rotating Globe */}
      <div className="w-full lg:w-6/12 z-10 flex flex-col justify-center items-center min-h-[450px]">
        <div className="w-full h-full relative aspect-square max-w-[500px]">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40 rounded-tl-xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40 rounded-tr-xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40 rounded-bl-xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40 rounded-br-xl pointer-events-none" />
          
          <GlobeTwin
            flagshipCity={flagshipCity}
            onZoomComplete={handleZoomComplete}
            onShowToast={handleShowToast}
          />
        </div>
      </div>

      {/* Authentication Dialog Overlay */}
      {authPortal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950 p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setAuthPortal(null)}
              className="absolute top-4 right-4 text-xs font-bold text-gray-500 hover:text-white cursor-pointer bg-transparent border-none"
            >
              ✕
            </button>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold capitalize text-white">{authPortal} to {selectedRole} portal</h3>
              <p className="text-xxs text-gray-500">Secure credential verification required</p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-3 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@fanpulse.ai"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Password</label>
                <div className="relative">
                  <Key size={14} className="absolute left-3.5 top-3 text-gray-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (authPortal === "signup") validatePassword(e.target.value);
                    }}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                {authPortal === "signup" && (
                  <div className="pt-1.5 space-y-1">
                    <span className="text-[8px] text-gray-500 font-bold block uppercase">Strength Criteria (Must pass all):</span>
                    <div className="flex flex-wrap gap-1">
                      {["Min 8 characters", "Uppercase letter", "Lowercase letter", "Digit", "Special character"].map((rule) => {
                        const passed = passwordStrength.includes(rule);
                        return (
                          <span
                            key={rule}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                              passed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/5 text-red-500/60 border border-red-500/10"
                            }`}
                          >
                            {rule}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {mfaRequired && (
                <div className="space-y-1 border-t border-white/5 pt-3.5">
                  <label className="text-[10px] text-red-400 uppercase tracking-wider block font-bold flex items-center gap-1.5">
                    <Lock size={12} /> Google Authenticator MFA Code
                  </label>
                  <input
                    type="text"
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="Enter 6-digit code (Use 123456 for demo)"
                    className="w-full bg-slate-900/60 border border-red-500/20 rounded-xl py-2.5 px-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500 text-center font-mono tracking-widest font-bold"
                  />
                </div>
              )}

              {authError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xxs text-red-400 font-bold">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-xs shadow-lg shadow-cyan-500/10 transition-all cursor-pointer border-none"
              >
                {authLoading ? "Verifying..." : authPortal === "login" ? "Confirm & Link Portal" : "Register Profile"}
              </button>
            </form>

            <div className="text-center pt-2">
              {authPortal === "login" ? (
                <p className="text-xxs text-gray-500">
                  New operator?{" "}
                  <button
                    onClick={() => {
                      setAuthError("");
                      setAuthPortal("signup");
                    }}
                    className="text-cyan-400 hover:underline font-bold bg-transparent border-none cursor-pointer"
                  >
                    Register Account Profile
                  </button>
                </p>
              ) : (
                <p className="text-xxs text-gray-500">
                  Already registered?{" "}
                  <button
                    onClick={() => {
                      setAuthError("");
                      setAuthPortal("login");
                    }}
                    className="text-cyan-400 hover:underline font-bold bg-transparent border-none cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
            <div className="p-3.5 bg-slate-900/40 rounded-xl border border-white/5 text-[9px] text-gray-400 leading-normal font-mono">
              <span className="font-bold text-white block mb-0.5">Quick Demo Logins:</span>
              <p>Email: {selectedRole === "fan" ? "fan" : selectedRole}@fanpulse.ai</p>
              <p>Password: Demo@2026</p>
              {selectedRole === "organizer" && <p>MFA: 123456</p>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
