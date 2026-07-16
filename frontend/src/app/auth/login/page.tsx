"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/utils/api";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Shield, Eye, Lock, ArrowLeft, Check, AlertCircle } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const { speakText } = useAccessibility();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // MFA UI Control
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    speakText("Submitting login credentials.");

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          mfa_code: mfaRequired ? mfaCode : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      // Check if MFA is required
      if (data.mfa_required) {
        setMfaRequired(true);
        setError("");
        speakText("Multi-factor authentication required. Please type your verification code.");
        setLoading(false);
        return;
      }

      // Save tokens & user metadata
      localStorage.setItem("fanpulse_access_token", data.access_token);
      localStorage.setItem("fanpulse_refresh_token", data.refresh_token);
      localStorage.setItem("fanpulse_role", data.role);
      localStorage.setItem("fanpulse_email", data.email);

      speakText(`Login successful. Redirecting to ${data.role} console.`);

      // Enforce Role-Based Routing
      if (data.role === "organizer") {
        router.push("/organizer");
      } else if (data.role === "volunteer") {
        router.push("/volunteer");
      } else if (data.role === "security") {
        router.push("/security");
      } else {
        router.push("/fan");
      }
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
            <h2 className="text-2xl font-bold text-white">System Authentication</h2>
            <p className="text-xs text-gray-400">Access your role-based operations dashboard</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2" role="alert">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {!mfaRequired ? (
              <>
                {/* Email Address */}
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

                {/* Password */}
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
              </>
            ) : (
              /* MFA OTP Code Panel */
              <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-1 text-center">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Double-Factor Security</span>
                  <p className="text-xxs text-gray-400">Enter the 6-digit TOTP code from your authenticator application. (Demo bypass code: 123456)</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400">Verification Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="e.g., 123456"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-center text-lg font-bold font-mono tracking-widest text-cyan-400 focus:outline-none focus:border-cyan-500 placeholder-gray-700"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full p-3.5 rounded-xl bg-cyan-500 text-slate-900 font-bold text-sm shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 hover:scale-102 transition-all cursor-pointer border-none"
            >
              {loading ? "Authenticating..." : mfaRequired ? "Confirm & Login" : "Authenticate Session"}
            </button>
          </form>

          <div className="text-center pt-2 text-xs text-gray-400">
            Need an operations profile?{" "}
            <Link href="/auth/signup" className="text-cyan-400 hover:text-cyan-300 font-bold no-underline">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
