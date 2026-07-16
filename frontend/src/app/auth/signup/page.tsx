"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/utils/api";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Shield, Eye, Lock, ArrowLeft, Check, AlertCircle } from "lucide-react";

export default function Signup() {
  const router = useRouter();
  const { speakText } = useAccessibility();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("fan");
  const [consent, setConsent] = useState(false);
  const [botSlider, setBotSlider] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password strength checks
  const [strength, setStrength] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false
  });

  useEffect(() => {
    setStrength({
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const strengthCount = Object.values(strength).filter(Boolean).length;
  const strengthPercentage = (strengthCount / 5) * 100;
  
  const getStrengthLabel = () => {
    if (strengthCount === 0) return { label: "None", color: "bg-gray-700" };
    if (strengthCount <= 2) return { label: "Weak", color: "bg-red-500" };
    if (strengthCount <= 4) return { label: "Medium", color: "bg-amber-500" };
    return { label: "Strong", color: "bg-emerald-500" };
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setBotSlider(val);
    if (val === 100) {
      setIsUnlocked(true);
      speakText("Human validation successful. Form unlocked.");
    } else {
      setIsUnlocked(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (strengthCount < 5) {
      setError("Please satisfy all password strength requirements.");
      speakText("Error. Password is not strong enough.");
      return;
    }

    if (!isUnlocked) {
      setError("Please drag the verification slider to the end.");
      speakText("Error. Please solve the slider challenge.");
      return;
    }

    setLoading(true);
    speakText("Submitting registration form.");

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Registration failed.");
      }

      // If GDPR consent checked, write preference state
      if (consent && data.id) {
        // Register token session automatically or require login
        // For simplicity, direct user to login with success alert
      }

      setSuccess(true);
      speakText("Account created successfully. Redirecting to login.");
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      speakText(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] bg-cyan-500/5 rounded-full blur-[140px]" />

      <div className="w-full max-w-md z-10 space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors no-underline">
          <ArrowLeft size={16} /> Home Portal
        </Link>

        <div className="rounded-2xl glass-panel p-8 space-y-6 shadow-2xl relative">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mx-auto">
              <Shield size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white">Create Security Profile</h2>
            <p className="text-xs text-gray-400">Join the operations security ledger for FIFA 2026</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2" role="alert">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
              <Check size={16} /> Profile Registered! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@stadium.com"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-gray-600"
              />
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-gray-600"
              />
            </div>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <div className="space-y-2.5 bg-slate-950/40 p-3.5 rounded-xl border border-white/5">
                <div className="flex justify-between items-center text-xxs">
                  <span className="text-gray-400">Security Grade:</span>
                  <span className="font-bold text-cyan-400">{getStrengthLabel().label}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getStrengthLabel().color}`}
                    style={{ width: `${strengthPercentage}%` }}
                  />
                </div>
                {/* Requirements Checklist */}
                <div className="grid grid-cols-2 gap-1.5 text-xxs text-gray-400">
                  <div className="flex items-center gap-1">
                    <span className={strength.length ? "text-emerald-400" : "text-gray-600"}>✓</span> 8+ Characters
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={strength.upper ? "text-emerald-400" : "text-gray-600"}>✓</span> Uppercase Letter
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={strength.lower ? "text-emerald-400" : "text-gray-600"}>✓</span> Lowercase Letter
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={strength.number ? "text-emerald-400" : "text-gray-600"}>✓</span> Digit
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={strength.special ? "text-emerald-400" : "text-gray-600"}>✓</span> Special Char
                  </div>
                </div>
              </div>
            )}

            {/* Role Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400">System Permission Level</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="fan">Fan (Public Access)</option>
                <option value="volunteer">Volunteer (Task Operations)</option>
                <option value="security">Security (Emergency Responder)</option>
                <option value="organizer">Organizer (Command Center & Admin)</option>
              </select>
            </div>

            {/* Privacy GDPR Consent */}
            <div className="flex items-start gap-2.5 pt-2">
              <input
                id="consent-check"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-700 bg-slate-900 focus:ring-0 focus:outline-none cursor-pointer accent-cyan-500"
              />
              <label htmlFor="consent-check" className="text-xxs text-gray-400 cursor-pointer select-none leading-relaxed">
                Personalization Consent: Allow the AI Companion to save stadium preferences and preferences history for future matching (Memory Agent). You can revoke or request data deletion anytime.
              </label>
            </div>

            {/* Anti-Bot Verification Slider */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center text-xxs text-gray-400">
                <span>Verification Challenge:</span>
                <span className={isUnlocked ? "text-emerald-400 font-bold" : "text-cyan-400"}>
                  {isUnlocked ? "Verification Passed" : "Slide to verify humanity"}
                </span>
              </div>
              <div className="w-full h-10 bg-slate-950/60 border border-white/10 rounded-xl flex items-center relative overflow-hidden px-1">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={botSlider}
                  onChange={handleSliderChange}
                  disabled={isUnlocked}
                  className="w-full h-full opacity-100 accent-cyan-500 cursor-pointer disabled:cursor-not-allowed bg-transparent"
                  aria-label="Drag slider to end to verify humanity"
                />
                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xxs text-gray-500 uppercase tracking-widest font-bold">
                    Slide &rarr;&rarr;&rarr;
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isUnlocked || strengthCount < 5}
              className={`w-full p-3.5 rounded-xl text-sm font-bold text-slate-900 transition-all cursor-pointer ${
                isUnlocked && strengthCount === 5
                  ? "bg-cyan-500 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 hover:scale-102"
                  : "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
              }`}
            >
              {loading ? "Registering..." : "Register Profile"}
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-gray-400">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300 font-bold no-underline">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
