"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Server, Activity, Cpu, Sparkles, MapPin, CheckCircle, AlertTriangle, Shield, RefreshCw } from "lucide-react";
import GlobeTwin from "@/components/GlobeTwin";
import { playBeep, playSuccess } from "@/utils/audio";
import { API_BASE } from "@/utils/api";

interface StadiumInfo {
  city: string;
  stadium: string;
  status: string;
  interactive: boolean;
  overall_score: string;
  fan_experience?: string;
  prediction_accuracy?: string;
  security?: string;
  accessibility?: string;
  parking_efficiency?: string;
  crowd_management?: string;
  volunteer_efficiency?: string;
  ai_confidence?: string;
  alerts?: string;
  prediction?: string;
  risk_score?: string;
}

export default function GlobalCommandCenter() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // States
  const [stadiums, setStadiums] = useState<StadiumInfo[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [warRoom, setWarRoom] = useState<any>(null);
  const [selectedStadium, setSelectedStadium] = useState<StadiumInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [stadiumsRes, statsRes, reportRes, warRoomRes] = await Promise.all([
        fetch(`${API_BASE}/global/stadiums`),
        fetch(`${API_BASE}/global/stats`),
        fetch(`${API_BASE}/global/intelligence`),
        fetch(`${API_BASE}/global/war-room`)
      ]);

      if (stadiumsRes.ok && statsRes.ok && reportRes.ok && warRoomRes.ok) {
        const stadiumsData = await stadiumsRes.json();
        const statsData = await statsRes.json();
        const reportData = await reportRes.json();
        const warRoomData = await warRoomRes.json();

        setStadiums(stadiumsData);
        setStats(statsData);
        setReport(reportData);
        setWarRoom(warRoomData);
        
        // Select Dallas by default
        if (!selectedStadium && stadiumsData.length > 0) {
          setSelectedStadium(stadiumsData[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch global stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterStadium = (city: string) => {
    playSuccess();
    router.push(`/organizer?city=${city.toLowerCase()}`);
  };

  if (!isClient) return null;

  return (
    <div className="flex-1 flex flex-col font-sans bg-[#040508] text-white min-h-screen relative overflow-x-hidden">
      {/* Background grids and glowing gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[55%] bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[55%] bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff01_1px,transparent_1px),linear-gradient(to_bottom,#ffffff01_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="flex flex-col md:flex-row justify-between items-center px-6 py-4 border-b border-white/5 bg-slate-950/40 backdrop-blur-md gap-4 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Cpu size={18} />
          </div>
          <div>
            <h1 className="text-xs font-extrabold text-white tracking-widest uppercase flex items-center gap-1.5">
              FanPulse AI <span className="text-gray-500 font-normal">|</span> <span className="text-[10px] text-cyan-400 font-mono">GLOBAL COMMAND CENTER</span>
            </h1>
            <span className="text-[8px] text-gray-500 font-mono tracking-wider block">
              THE GLOBAL AGENTIC AI STADIUM OPERATING SYSTEM FOR FIFA WORLD CUP 2026
            </span>
          </div>
        </div>

        {/* Global Overview KPI Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-white/5 rounded-lg text-[9px] text-gray-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>AI Health: <strong className="text-emerald-400">{stats?.ai_health_score || "98%"}</strong></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-white/5 rounded-lg text-[9px] text-gray-400 font-mono">
            <span>Live Connections: <strong className="text-cyan-400">{stats?.active_connections?.toLocaleString() || "68,421"}</strong></span>
          </div>
          <button
            onClick={() => { playBeep(); router.push("/"); }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 font-semibold text-[10px] transition-all cursor-pointer border-none"
          >
            ← Exit Center
          </button>
        </div>
      </header>

      {/* Main Command Console Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 z-30">
        
        {/* LEFT COLUMN: 16 Host Cities Index Dashboard */}
        <div className="lg:col-span-3 flex flex-col gap-5 overflow-y-auto pr-1">
          <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 space-y-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block flex items-center gap-1.5">
              <MapPin size={12} className="text-cyan-400" /> Host Cities Status
            </span>
            <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {stadiums.map((st) => {
                const isSelected = selectedStadium?.city === st.city;
                const isGreen = st.risk_score === "GREEN";
                const isOrange = st.risk_score === "ORANGE";
                const isYellow = st.risk_score === "YELLOW";
                
                return (
                  <div
                    key={st.city}
                    onClick={() => { playBeep(); setSelectedStadium(st); }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-slate-900 border-cyan-500/40 shadow-md shadow-cyan-500/5" 
                        : "bg-slate-950/50 hover:bg-slate-900 border-white/5"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xxs font-bold text-white tracking-wide">{st.city}</h4>
                        <p className="text-[8px] text-gray-500">{st.stadium}</p>
                      </div>
                      <span className={`text-[7px] font-extrabold px-1.5 py-0.5 rounded tracking-widest ${
                        st.interactive 
                          ? isGreen 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : isOrange 
                              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-slate-800 text-gray-500 border border-white/5"
                      }`}>
                        {st.status}
                      </span>
                    </div>

                    {st.interactive && isSelected && (
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[9px] text-cyan-400 font-mono font-bold">AI Stadium Score: {st.overall_score}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEnterStadium(st.city); }}
                          className="px-2.5 py-1 rounded bg-cyan-500 text-slate-900 text-[8px] font-extrabold cursor-pointer border-none hover:bg-cyan-400 transition-all"
                        >
                          Enter Stadium →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Global Digital Twin Earth Globe & Alert HUD */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* 3D Rotating Globe Frame */}
          <div className="flex-1 rounded-xl border border-white/5 bg-slate-950/40 relative flex items-center justify-center min-h-[350px] overflow-hidden">
            <div className="absolute top-4 left-4 z-10 space-y-1">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Global Digital Twin</span>
              <p className="text-[8px] text-gray-500 font-mono">16 host locations monitored in real-time</p>
            </div>
            
            {/* Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-10 bg-slate-950/80 p-2.5 rounded border border-white/10 text-[8px] font-mono space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Normal Operations
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Medium Risk Alert
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> High Crowd / Traffic
              </div>
            </div>

            <div className="w-full h-full max-w-[420px] aspect-square flex items-center justify-center">
              <GlobeTwin
                flagshipCity={selectedStadium?.city || "Dallas"}
                onZoomComplete={(city) => handleEnterStadium(city)}
                onShowToast={() => {}}
              />
            </div>
          </div>

          {/* Active Live AI Alert Feeds ticker */}
          <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 space-y-3 font-mono">
            <span className="text-[9px] font-extrabold text-cyan-400 tracking-widest uppercase block">Live Global AI Alert Logs</span>
            <div className="grid grid-cols-2 gap-3 text-[9px] text-gray-400">
              <div className="p-2.5 bg-slate-900/40 rounded border border-white/5 space-y-0.5">
                <span className="text-orange-400 block font-bold">● DALLAS OS</span>
                <p>Vision sensors warning: Gate C congestion spike detected.</p>
              </div>
              <div className="p-2.5 bg-slate-900/40 rounded border border-white/5 space-y-0.5">
                <span className="text-amber-400 block font-bold">● MEXICO CITY OS</span>
                <p>Weather radar warning: Heavy rain cell approaching.</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Stadium Rankings, Match Intelligence & Observability */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pl-1">
          
          {/* Global Stadium Intelligence Rankings */}
          <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 space-y-3">
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">Global Stadium Intelligence Rankings</span>
            <div className="space-y-2 font-mono text-[9px]">
              {stadiums.filter(s => s.interactive).sort((a,b) => b.overall_score.localeCompare(a.overall_score)).map((st, sIdx) => (
                <div key={st.city} className="p-2.5 bg-slate-900/40 rounded border border-white/5 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-white font-bold">#{sIdx + 1} {st.city} — {st.stadium}</span>
                    <div className="flex gap-2 text-[8px] text-gray-500">
                      <span>Fan Exp: {st.fan_experience || "99%"}</span>
                      <span>Pred: {st.prediction_accuracy || "98%"}</span>
                      <span>Sec: {st.security || "97%"}</span>
                    </div>
                  </div>
                  <span className="text-cyan-400 font-extrabold">{st.overall_score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Global AI Intelligence Score Card */}
          <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/5 space-y-3 font-mono">
            <div className="flex justify-between items-center border-b border-cyan-500/10 pb-2">
              <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest block">Global AI Intelligence Score</span>
              <span className="text-cyan-400 font-extrabold text-sm">97/100</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[8px] text-gray-400">
              <div className="p-2 rounded bg-slate-950/40 border border-white/5 space-y-0.5">
                <span className="text-gray-500 block uppercase">AI Prediction</span>
                <strong className="text-white text-[10px]">98% Accuracy</strong>
              </div>
              <div className="p-2 rounded bg-slate-950/40 border border-white/5 space-y-0.5">
                <span className="text-gray-500 block uppercase">Accessibility</span>
                <strong className="text-white text-[10px]">99% Score</strong>
              </div>
              <div className="p-2 rounded bg-slate-950/40 border border-white/5 space-y-0.5">
                <span className="text-gray-500 block uppercase">Fan Experience</span>
                <strong className="text-white text-[10px]">98% Score</strong>
              </div>
              <div className="p-2 rounded bg-slate-950/40 border border-white/5 space-y-0.5">
                <span className="text-gray-500 block uppercase">Volunteers</span>
                <strong className="text-white text-[10px]">97% Efficiency</strong>
              </div>
              <div className="p-2 rounded bg-slate-950/40 border border-white/5 space-y-0.5">
                <span className="text-gray-500 block uppercase">Infrastructure</span>
                <strong className="text-emerald-400 text-[10px]">99% Health</strong>
              </div>
              <div className="p-2 rounded bg-slate-950/40 border border-white/5 space-y-0.5">
                <span className="text-gray-500 block uppercase">Resolutions</span>
                <strong className="text-cyan-400 text-[10px]">100% Rate</strong>
              </div>
            </div>

            <div className="p-2 rounded bg-slate-950/60 border border-white/5 text-xxs flex justify-between items-center text-gray-300">
              <span>Composite City Averages:</span>
              <div className="flex gap-2 text-[8px] text-cyan-400 font-bold">
                <span>DAL: 98</span>
                <span>MEX: 97</span>
                <span>TOR: 96</span>
                <span>MIA: 95</span>
                <span>VAN: 96</span>
              </div>
            </div>
          </div>

          {/* Global Match Intelligence Report */}
          <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 space-y-3">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">Global Match Intelligence Report</span>
            {report && (
              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-3.5 text-xxs font-mono">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-white font-bold">{report.match}</span>
                  <span className="text-purple-400 font-bold">Accuracy: {report.prediction_accuracy}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-400">
                  <p>Expected Fans: <strong className="text-white">{report.expected_fans.toLocaleString()}</strong></p>
                  <p>Traffic Risk: <strong className="text-orange-400">{report.traffic_risk}</strong></p>
                  <p>Parking Risk: <strong className="text-amber-500">{report.parking_risk}</strong></p>
                  <p>Weather Risk: <strong className="text-emerald-400">{report.weather_risk}</strong></p>
                  <p>Volunteers Reg: <strong className="text-white">{report.volunteer_requirement}</strong></p>
                  <p>AI Confidence: <strong className="text-cyan-400">{report.ai_confidence}</strong></p>
                </div>
                <div className="border-t border-white/5 pt-2.5 space-y-1 text-gray-300">
                  <span className="text-gray-500 text-[8px] uppercase tracking-widest block">AI Operations Recommendations</span>
                  {report.ai_recommendations.map((rec: string) => (
                    <div key={rec} className="flex items-center gap-1.5 text-cyan-400 font-bold text-[9px]">
                      <CheckCircle size={10} /> {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Global Infrastructure Health Panel */}
          <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 space-y-3">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block flex items-center gap-1.5">
              <Server size={12} /> Global Infrastructure Health
            </span>
            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
              <div className="p-2 bg-slate-900/40 rounded border border-white/5 flex justify-between items-center">
                <span className="text-gray-500">API Server</span>
                <span className="text-emerald-400 font-bold">99% HEALTHY</span>
              </div>
              <div className="p-2 bg-slate-900/40 rounded border border-white/5 flex justify-between items-center">
                <span className="text-gray-500">Database</span>
                <span className="text-emerald-400 font-bold">98% HEALTHY</span>
              </div>
              <div className="p-2 bg-slate-900/40 rounded border border-white/5 flex justify-between items-center">
                <span className="text-gray-500">AI Engine</span>
                <span className="text-emerald-400 font-bold">99% HEALTHY</span>
              </div>
              <div className="p-2 bg-slate-900/40 rounded border border-white/5 flex justify-between items-center">
                <span className="text-gray-500">WebSockets</span>
                <span className="text-cyan-400 font-bold">ACTIVE</span>
              </div>
              <div className="p-2 bg-slate-900/40 rounded border border-white/5 flex justify-between items-center">
                <span className="text-gray-500">Event Bus</span>
                <span className="text-cyan-400 font-bold">ACTIVE</span>
              </div>
              <div className="p-2 bg-slate-900/40 rounded border border-white/5 flex justify-between items-center">
                <span className="text-gray-500">World Model</span>
                <span className="text-emerald-400 font-bold">SYNCED</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
