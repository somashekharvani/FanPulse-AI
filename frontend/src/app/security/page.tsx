"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, getWebSocketUrl, logoutUser } from "@/utils/api";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Users, LogOut, AlertTriangle, ShieldCheck, UserCheck, Plus, CheckCircle, RefreshCw } from "lucide-react";

interface Incident {
  id: number;
  title: string;
  description: string;
  location: string;
  severity: string;
  status: string;
  reporter_role: string;
  assigned_volunteer_id?: number;
  created_at: string;
}

interface Volunteer {
  id: number;
  email: string;
  role: string;
}

export default function SecurityDispatch() {
  const router = useRouter();
  const { speakText } = useAccessibility();

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Data State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // UI Control
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [targetVolunteerId, setTargetVolunteerId] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // New incident form states
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newLoc, setNewLoc] = useState("Zone 1 (East entrance)");
  const [newSev, setNewSev] = useState("medium");

  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setIsClient(true);
    const savedToken = localStorage.getItem("fanpulse_access_token");
    const savedEmail = localStorage.getItem("fanpulse_email");
    setToken(savedToken);
    setEmail(savedEmail);

    if (savedToken) {
      fetchIncidents(savedToken);
      fetchVolunteers(savedToken);
      connectWebSocket();
    }
  }, []);

  const fetchIncidents = async (accessToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/incidents`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVolunteers = async (accessToken: string) => {
    try {
      // Fetch volunteer staff or seed standard fallback list if DB is empty
      setVolunteers([
        { id: 2, email: "volunteer@fanpulse.com", role: "volunteer" },
        { id: 5, email: "volunteer2@fanpulse.com", role: "volunteer" },
        { id: 6, email: "volunteer3@fanpulse.com", role: "volunteer" }
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const connectWebSocket = () => {
    try {
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connectWebSocket, 3000);
      };
      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === "stadium_update") {
          // Keep active incident state synchronized
          setIncidents(payload.incidents);
        }
      };
    } catch (err) {
      console.error("WS error", err);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !targetVolunteerId) return;

    setLoading(true);
    speakText("Dispatching staff responder");

    try {
      // 1. Assign volunteer to incident
      const res = await fetch(`${API_BASE}/incidents/${selectedIncident.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          assigned_volunteer_id: parseInt(targetVolunteerId),
          status: "dispatched"
        })
      });

      if (!res.ok) throw new Error("Failed to assign volunteer.");

      // 2. Automatically spawn a task ticket for the volunteer
      await fetch(`${API_BASE}/tasks/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          volunteer_id: parseInt(targetVolunteerId),
          title: `Respond to: ${selectedIncident.title}`,
          description: `Location: ${selectedIncident.location}. Details: ${selectedIncident.description}`
        })
      });

      speakText("Dispatch successful. Ticket generated.");
      setSelectedIncident(null);
      setTargetVolunteerId("");
      fetchIncidents(token!);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to dispatch.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/incidents/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          location: newLoc,
          severity: newSev
        })
      });

      if (res.ok) {
        speakText("Incident reported successfully.");
        setNewTitle("");
        setNewDesc("");
        setShowAddForm(false);
        fetchIncidents(token!);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIncident = async (incidentId: number) => {
    speakText("Resolving security alert.");
    try {
      const res = await fetch(`${API_BASE}/incidents/${incidentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "resolved" })
      });
      if (res.ok) {
        fetchIncidents(token!);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auto login helper
  const handleQuickLogin = async () => {
    setLoadingLogin(true);
    try {
      await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "security@fanpulse.com", password: "Password123!", role: "security" }),
      });
    } catch (e) {}

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "security@fanpulse.com", password: "Password123!" }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("fanpulse_access_token", data.access_token);
        localStorage.setItem("fanpulse_refresh_token", data.refresh_token);
        localStorage.setItem("fanpulse_role", data.role);
        localStorage.setItem("fanpulse_email", data.email);
        setToken(data.access_token);
        setEmail(data.email);
        fetchIncidents(data.access_token);
        fetchVolunteers(data.access_token);
        connectWebSocket();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogin(false);
    }
  };

  const [loadingLogin, setLoadingLogin] = useState(false);

  if (!isClient) return null;

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 relative font-sans">
        <div className="w-full max-w-sm rounded-2xl glass-panel p-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 mx-auto">
            <Users size={24} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Security Dispatch Access</h2>
            <p className="text-xs text-gray-400">Deploy staff, manage incident queues, and check alerts</p>
          </div>
          <button
            onClick={handleQuickLogin}
            disabled={loadingLogin}
            className="w-full p-3.5 rounded-xl bg-orange-500 text-slate-900 font-bold text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-400 transition-all cursor-pointer border-none"
          >
            {loadingLogin ? "Connecting..." : "Quick Access (Demo Mode)"}
          </button>
          <p className="text-xxs text-gray-500">
            Clicking quick access configures a mock Security profile for immediate testing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full font-sans bg-[#08090d] text-white">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
            <Users size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Security Dispatch Console</h1>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-400" : "bg-red-400"}`} />
              <span className="text-[10px] text-gray-500">{wsConnected ? "Telemetry active" : "Offline"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-xs text-gray-400 font-mono">Role: security &bull; {email}</span>
          <button
            onClick={() => {
              logoutUser();
              router.push("/");
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
          >
            <LogOut size={12} /> Leave
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden max-h-[calc(100vh-68px)]">
        {/* Left Column: Incidents list */}
        <div className="lg:col-span-8 flex flex-col rounded-2xl glass-panel p-5 overflow-hidden max-h-full">
          <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-orange-400" /> Active Incident Queue
            </h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-900 text-xs font-bold hover:bg-cyan-400 transition-all cursor-pointer flex items-center gap-1 border-none"
            >
              <Plus size={14} /> Report Incident
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {incidents.length > 0 ? (
              incidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`p-4 rounded-xl border transition-all ${
                    inc.status === "resolved"
                      ? "bg-slate-950/20 border-white/5 opacity-60"
                      : inc.severity === "critical"
                        ? "bg-red-500/5 border-red-500/30"
                        : "bg-slate-950/40 border-white/5"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{inc.title}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          inc.severity === "critical"
                            ? "bg-red-500/20 text-red-400"
                            : inc.severity === "high"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-gray-800 text-gray-400"
                        }`}>
                          {inc.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{inc.description}</p>
                      <div className="text-[10px] text-gray-500 flex items-center gap-3 pt-1">
                        <span>Location: <strong className="text-gray-300">{inc.location}</strong></span>
                        <span>Reporter: <strong className="text-gray-300 capitalize">{inc.reporter_role}</strong></span>
                        <span>Status: <strong className="text-cyan-400 capitalize">{inc.status}</strong></span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {inc.status === "reported" && (
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="px-2.5 py-1.5 rounded-lg bg-orange-500 text-slate-950 text-xxs font-bold hover:bg-orange-400 cursor-pointer border-none"
                        >
                          Dispatch Responder
                        </button>
                      )}
                      {inc.status === "approved" && (
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="px-2.5 py-1.5 rounded-lg bg-orange-500 text-slate-950 text-xxs font-bold hover:bg-orange-400 cursor-pointer border-none"
                        >
                          Dispatch Responder
                        </button>
                      )}
                      {inc.status === "dispatched" && (
                        <button
                          onClick={() => handleResolveIncident(inc.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xxs font-bold hover:bg-emerald-400 cursor-pointer border-none flex items-center gap-1"
                        >
                          <ShieldCheck size={12} /> Resolve
                        </button>
                      )}
                      {inc.status === "resolved" && (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                          <CheckCircle size={12} /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-xs text-gray-500 space-y-1">
                <ShieldCheck size={32} className="mx-auto text-gray-600 mb-1" />
                <p className="font-semibold text-gray-400">All Sectors Operational</p>
                <p className="text-xxs">No security incidents have been reported in the stadium queue buffer.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dispatch Panel or Report Form */}
        <div className="lg:col-span-4 flex flex-col gap-6 max-h-full">
          {/* Dispatch Panel */}
          {selectedIncident && (
            <div className="rounded-2xl glass-panel p-5 space-y-4 animate-in fade-in slide-in-from-right-5 duration-200">
              <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={16} /> Deploy Responder
              </h3>
              <div className="bg-slate-950/40 p-3 rounded-lg border border-white/5 text-xs space-y-1">
                <span className="font-bold text-white block">{selectedIncident.title}</span>
                <span className="text-gray-400 text-xxs">Location: {selectedIncident.location}</span>
              </div>

              <form onSubmit={handleDispatch} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400">Select Responder Staff</label>
                  <select
                    required
                    value={targetVolunteerId}
                    onChange={(e) => setTargetVolunteerId(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="">-- Select Active Volunteer --</option>
                    {volunteers.map((vol) => (
                      <option key={vol.id} value={vol.id}>
                        {vol.email} (ID: {vol.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading || !targetVolunteerId}
                    className="flex-1 p-3 rounded-xl bg-orange-500 text-slate-950 font-bold text-xs hover:bg-orange-400 transition-all cursor-pointer border-none"
                  >
                    {loading ? "Deploying..." : "Approve & Dispatch"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIncident(null)}
                    className="px-3 rounded-xl bg-slate-800 text-gray-300 font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer border-none"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Add Incident Form */}
          {showAddForm && (
            <div className="rounded-2xl glass-panel p-5 space-y-4 animate-in fade-in slide-in-from-right-5 duration-200">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={16} /> File Incident Brief
              </h3>

              <form onSubmit={handleCreateIncident} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400">Incident Heading</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Broken barrier"
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400">Description</label>
                  <textarea
                    required
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Provide details about size, severity, slip hazards..."
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400">Location Area</label>
                  <select
                    value={newLoc}
                    onChange={(e) => setNewLoc(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
                  >
                    <option value="Gate A">Gate A (North Entrance)</option>
                    <option value="Gate B">Gate B (South Entrance)</option>
                    <option value="Gate C">Gate C (East Concourse)</option>
                    <option value="Zone 1 (East entrance)">Zone 1 (East entrance)</option>
                    <option value="Zone 2 (Concourse North)">Zone 2 (Concourse North)</option>
                    <option value="Zone 3 (East stands)">Zone 3 (East stands)</option>
                    <option value="Zone 4 (West stands)">Zone 4 (West stands)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400">Severity Threat</label>
                  <select
                    value={newSev}
                    onChange={(e) => setNewSev(e.target.value)}
                    className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none"
                  >
                    <option value="low">Low (Debris, Info query)</option>
                    <option value="medium">Medium (Concessions stock, Minor queue blocks)</option>
                    <option value="high">High (Injury, Drunk abuse)</option>
                    <option value="critical">Critical (Fire, Structural failure)</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 p-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all cursor-pointer border-none"
                  >
                    {loading ? "Submitting..." : "File Report"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 rounded-xl bg-slate-800 text-gray-300 font-bold text-xs hover:bg-slate-700 transition-all cursor-pointer border-none"
                  >
                    Close
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
