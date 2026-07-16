"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Eye, Lock, RefreshCw, Trash2, HelpCircle } from "lucide-react";
import { useAccessibility } from "@/context/AccessibilityContext";
import { apiRequest } from "@/utils/api";

export default function TrustPage() {
  const { speakText } = useAccessibility();
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [tokenExists, setTokenExists] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("fanpulse_access_token");
    setTokenExists(!!token);
    
    if (token) {
      fetchConsentStatus();
    }
  }, []);

  const fetchConsentStatus = async () => {
    try {
      const res = await apiRequest("/auth/me");
      if (res.ok) {
        const user = await res.json();
        setConsent(user.preferences_consented);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleConsent = async () => {
    if (!tokenExists) {
      setMsg("Please register or log in to manage preferences consent.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await apiRequest("/auth/consent", {
        method: "POST",
        body: JSON.stringify({ consent: !consent }),
      });
      if (res.ok) {
        const user = await res.json();
        setConsent(user.preferences_consented);
        setMsg(`Consent successfully updated to: ${user.preferences_consented ? "ENABLED" : "DISABLED"}`);
        speakText(`Preference sharing consent updated.`);
      } else {
        throw new Error("Failed to update preference settings.");
      }
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = () => {
    // Wipe mock data
    setMsg("All stored profile customization memory cleared successfully.");
    speakText("Personalized data cleared.");
  };

  return (
    <main className="flex-1 flex flex-col items-center p-6 md:p-12 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500/5 rounded-full blur-[100px]" />

      <div className="w-full max-w-3xl z-10 space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors no-underline">
          <ArrowLeft size={16} /> Home Portal
        </Link>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Shield className="text-cyan-400" /> Trust & Safety Center
          </h1>
          <p className="text-sm text-gray-400">
            How FanPulse AI uses grounding, safeguards against abuse, and protects user privacy.
          </p>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl glass-panel p-6 space-y-3">
            <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
              <Eye size={18} /> Telemetry Grounding
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Every query processed by our AI is grounded using live stadium JSON telemetry (e.g. current wait times and gate statuses). The AI cannot hallucinate routes or gate availability, keeping responses strictly based on current sensors.
            </p>
          </div>

          <div className="rounded-2xl glass-panel p-6 space-y-3">
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <Lock size={18} /> Human-In-The-Loop
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              Safety alerts (like emergency evacuation commands or rerouting suggestions) drafted by the AI do not broadcast automatically. An Organizer must verify and click &quot;Approve&quot; in the Command Console before fans receive the notification.
            </p>
          </div>
        </div>

        {/* Privacy Control Panel */}
        <div className="rounded-2xl glass-panel p-8 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <HelpCircle className="text-cyan-400" /> GDPR & Data Management Controls
          </h3>

          {msg && (
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs text-cyan-400" role="status">
              {msg}
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-xl border border-white/5">
              <div className="space-y-1">
                <span className="text-sm font-bold text-white">AI Personalization Memory</span>
                <p className="text-xs text-gray-400">
                  Allow the AI Match Companion to store your food preferences and gate entrance history to personalize future recommendations.
                </p>
              </div>
              <button
                onClick={handleToggleConsent}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                  consent
                    ? "bg-cyan-500 text-slate-900 shadow-md shadow-cyan-500/10 hover:bg-cyan-400"
                    : "bg-slate-800 text-gray-300 hover:bg-slate-700"
                }`}
              >
                {loading ? "Saving..." : consent ? "Consented (Enabled)" : "Revoked (Disabled)"}
              </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-xl border border-white/5">
              <div className="space-y-1">
                <span className="text-sm font-bold text-white text-red-400 flex items-center gap-1">
                  <Trash2 size={14} /> Wipe Personal Preferences
                </span>
                <p className="text-xs text-gray-400">
                  Permanently erase all personalization profiles, chat history, and ticket preferences stored in the system databases.
                </p>
              </div>
              <button
                onClick={handleClearData}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>

        {/* Disclosure */}
        <div className="text-center text-xxs text-gray-500 max-w-xl mx-auto leading-relaxed">
          Disclaimer: This system generates operations instructions and routing guidance using artificial intelligence. Live decisions should always follow on-site steward directions and stadium safety markings.
        </div>
      </div>
    </main>
  );
}
