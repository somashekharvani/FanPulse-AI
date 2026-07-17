"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { API_BASE, getWebSocketUrl, logoutUser } from "@/utils/api";
import { useAccessibility } from "@/context/AccessibilityContext";
import { Shield, LogOut, Play, RefreshCw, CheckCircle, AlertTriangle, FileText, Activity, Lock, Cpu, Eye, Radio, Volume2, UserCheck, MapPin, Film, Sliders, CheckSquare, Settings, Database, Clock, Server, Disc, ChevronDown, ChevronUp, Thermometer, Droplet, Wind, CloudRain, X } from "lucide-react";
import DigitalTwin from "@/components/DigitalTwin";
import { playBeep, playSuccess, playWarning, startSiren, stopSiren } from "@/utils/audio";

interface Gate {
  status: string;
  queue_length: number;
  throughput_per_min: number;
  wait_time_min: number;
}

interface Zone {
  occupancy_pct: number;
}

interface StadiumState {
  gate_status: { [key: string]: Gate };
  zone_occupancy: { [key: string]: Zone };
}

interface AgentLog {
  agent: string;
  message: string;
  time: string;
}

interface TimelineEvent {
  time: string;
  type: string;
  message: string;
}

export default function OrganizerDashboard() {
  const router = useRouter();
  const { speakText } = useAccessibility();

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [rbacError, setRbacError] = useState<string | null>(null);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [flagshipCity, setFlagshipCity] = useState("Dallas");
  const [flagshipStadium, setFlagshipStadium] = useState("AT&T Stadium");
  const [selectedCrisis, setSelectedCrisis] = useState("GATE CONGESTION");
  const [impactReportActive, setImpactReportActive] = useState(false);
  const [impactSequenceStep, setImpactSequenceStep] = useState<number>(0);
  const [localWeather, setLocalWeather] = useState({ temp: "29°C", humidity: "62%", wind: "11 km/h", rain: "0%" });

  // Time Machine States: 6 Grounded States
  const timeMachinePhases = [
    {
      name: "5:00 PM (Metro)",
      fans: 35000,
      waitTime: "3m",
      occupancy: "42%",
      weather: "Clear, 82°F",
      recommendation: "Activate Metro Transit M3 loop detours to balance ingress load",
      why: "Metro Line M3 arrival rate is rising. Redirecting early arrivals to underutilized Gate A turnstiles will balance ingress.",
      confidence: "98%",
      timeSaved: "6 Minutes",
      accessibilityImpact: "Stairs-free ramps active at Gate A. Handrails & level flooring indicators cleared.",
      crowdImpact: "Nominal load (Ingress rate is balanced at 150 fans/min).",
      riskLevel: "LOW",
      alternative: "Direct fans to Concourse FC-03 food court to balance security queuing.",
      contributors: ["Navigation AI", "Crowd AI", "Hospitality AI"],
      status: "SUCCESSFULLY VALIDATED"
    },
    {
      name: "6:00 PM (Parking)",
      fans: 52000,
      waitTime: "8m",
      occupancy: "68%",
      weather: "Clear, 80°F",
      recommendation: "Open reserve Lot B detours and enable smart parking redirects",
      why: "Main exit parking lot occupancy reached 92%. Rerouting incoming vehicles to Parking B avoids entry gridlocks.",
      confidence: "97%",
      timeSaved: "14 Minutes",
      accessibilityImpact: "Accessible shuttle bus routes from Lot B scheduled.",
      crowdImpact: "Redirects 1,200 vehicles from Lot A congestion zone.",
      riskLevel: "MEDIUM",
      alternative: "Lot A overflow staging lines activation.",
      contributors: ["Traffic AI", "Prediction AI", "Navigation AI"],
      status: "SUCCESSFULLY VALIDATED"
    },
    {
      name: "6:30 PM (Gate C)",
      fans: 68500,
      waitTime: "48m",
      occupancy: "92%",
      weather: "Clear, 78°F",
      recommendation: "Redirect Flow: open Gate C2 turnstiles, detour Lot B",
      why: "Gate C occupancy is 92%. Weather conditions are normal. Gate C2 occupancy is 34%.",
      confidence: "98%",
      timeSaved: "12 Minutes",
      accessibilityImpact: "Stairs-free ramp paths active for Gate C2 detours.",
      crowdImpact: "Detours 2,500 incoming fans to balance turnstile throughput.",
      riskLevel: "LOW",
      alternative: "Gate B1 redirect protocol.",
      contributors: ["Navigation AI", "Crowd AI", "Prediction AI", "Accessibility AI"],
      status: "SUCCESSFULLY VALIDATED"
    },
    {
      name: "HALFTIME (Food)",
      fans: 68500,
      waitTime: "15m",
      occupancy: "94%",
      weather: "Clear, 75°F",
      recommendation: "Redirect food queue bottlenecks to Concourse FC-03",
      why: "Food Court FC-05 wait time is 12 mins. FC-03 wait time is 3 mins. Inventory levels are stable.",
      confidence: "96%",
      timeSaved: "9 Minutes",
      accessibilityImpact: "Accessible low-counter queues flagged active at FC-03.",
      crowdImpact: "Balances halftime food court congestion peaks.",
      riskLevel: "LOW",
      alternative: "Concourse FC-01 concession routes activation.",
      contributors: ["Hospitality AI", "Crowd AI", "Navigation AI"],
      status: "SUCCESSFULLY VALIDATED"
    },
    {
      name: "MATCH END (Exit)",
      fans: 68142,
      waitTime: "22m",
      occupancy: "96%",
      weather: "Clear, 72°F",
      recommendation: "Activate exit routes through Gate C2 and South Metro links",
      why: "Primary egress flow at Gate A and B is bottlenecking. Gate C2 and Lot B exit pathways are underutilized.",
      confidence: "98%",
      timeSaved: "18 Minutes",
      accessibilityImpact: "Ramp gates kept open; stairways routes marked bypass on map.",
      crowdImpact: "Egress routing detours 4,200 fans away from crowded core stairs.",
      riskLevel: "LOW",
      alternative: "Gate B2 exit lanes activation.",
      contributors: ["Navigation AI", "Crowd AI", "Prediction AI"],
      status: "SUCCESSFULLY VALIDATED"
    },
    {
      name: "POST MATCH",
      fans: 15000,
      waitTime: "2m",
      occupancy: "25%",
      weather: "Clear, 70°F",
      recommendation: "Clear evacuation paths and deploy waste management teams",
      why: "Evacuation is 85% complete. Cleanup teams assigned to sector bottlenecks.",
      confidence: "99%",
      timeSaved: "None (Evacuation Complete)",
      accessibilityImpact: "Wheelchair assistance shuttles active at gate zones.",
      crowdImpact: "Cleanup teams dispatched to high crowd zones.",
      riskLevel: "LOW",
      alternative: "Nominal cleanup schedule.",
      contributors: ["Volunteer AI", "Hospitality AI"],
      status: "SUCCESSFULLY VALIDATED"
    }
  ];
  const [timeMachineIndex, setTimeMachineIndex] = useState(2); // default to Gate C (index 2)

  // Infrastructure Health Telemetry metrics
  const [infrastructureHealth, setInfrastructureHealth] = useState<any>({
    status: "Healthy",
    database: "Healthy",
    simulator: "Active",
    websocket_connections: 3,
    ai_service: "Grounded Core"
  });

  // Staging live state
  const [venueState, setVenueState] = useState<StadiumState | null>({
    gate_status: {
      "Gate A": { status: "open", queue_length: 15, throughput_per_min: 8, wait_time_min: 6 },
      "Gate B": { status: "open", queue_length: 22, throughput_per_min: 6, wait_time_min: 10 },
      "Gate C": { status: "open", queue_length: 12, throughput_per_min: 10, wait_time_min: 3 },
      "Gate C2": { status: "closed", queue_length: 0, throughput_per_min: 0, wait_time_min: 0 }
    },
    zone_occupancy: {
      "Zone 3 (East stands)": { occupancy_pct: 42 },
      "Zone 4 (West stands)": { occupancy_pct: 50 },
      "Zone 2 (Concourse North)": { occupancy_pct: 35 },
      "Zone 5 (South stands)": { occupancy_pct: 20 }
    }
  });

  // Dual Simulator States
  const [isLiveMatchMode, setIsLiveMatchMode] = useState(true);

  // Autopilot Demo States
  const [autopilotActive, setAutopilotActive] = useState(false);
  const [autopilotStep, setAutopilotStep] = useState(0);
  const [showDemoSummary, setShowDemoSummary] = useState(false);
  
  // Agent Reasoning Engine states
  const [reasoningActive, setReasoningActive] = useState(false);
  const [reasoningStep, setReasoningStep] = useState("");

  // Collapsible AI Command Console states
  const [terminalConsoleCollapsed, setTerminalConsoleCollapsed] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[19:28:10] SYSTEM: FanPulse AI operating system cores mounted successfully.",
    "[19:28:12] TELEMETRY: WorldModel connection link: SECURE.",
    "[19:28:15] DETECT: All 642 CCTV Vision channels link nominal."
  ]);

  // Toast alert overlay
  const [liveNotification, setLiveNotification] = useState<string | null>(null);

  // Forecast state details
  const [isForecastView, setIsForecastView] = useState(false);
  const [forecastState, setForecastState] = useState<StadiumState | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const [incidents, setIncidents] = useState<any[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  // Selected 3D Hotspot & Toggles
  const [selectedHotspot, setSelectedHotspot] = useState<string>("Match Pitch");
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [droneScanMode, setDroneScanMode] = useState(false);

  // Weather parameters
  const weather = localWeather;

  // Agent Logs stream
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([
    { agent: "Spatial AI", message: "Scanning crowd movement velocities in Sector 102.", time: "22:17:00" },
    { agent: "Forecast AI", message: "Evaluating entry demand curve. Predicted nominal wait times.", time: "22:17:05" },
    { agent: "Navigation AI", message: "Standard accessibility route vectors loaded and healthy.", time: "22:17:10" }
  ]);

  // AI Decision Timeline
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([
    { time: "22:15:10", type: "vision", message: "CCTV Camera 12 detected crowd build-up Gate C" },
    { time: "22:15:25", type: "model", message: "World model state updated. Risk index rising." },
    { time: "22:15:40", type: "dispatch", message: "Prepared draft warning broadcast for Gate C" }
  ]);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setIsClient(true);
    const savedToken = localStorage.getItem("fanpulse_access_token");
    const savedEmail = localStorage.getItem("fanpulse_email");
    const role = localStorage.getItem("fanpulse_role");

    setToken(savedToken);
    setEmail(savedEmail);

    if (savedToken) {
      if (role !== "organizer") {
        setRbacError("Access Restricted: Organizer authentication credentials required.");
        return;
      }
      connectWebSocket();
      fetchConfig(savedToken);
      fetchHealth(savedToken);

      // Parse city search parameter dynamically on mount
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const cityParam = params.get("city");
        if (cityParam) {
          const matches: { [key: string]: string } = {
            "dallas": "Dallas",
            "toronto": "Toronto",
            "mexico": "Mexico",
            "mexicocity": "Mexico",
            "miami": "Miami",
            "vancouver": "Vancouver"
          };
          const resolved = matches[cityParam.toLowerCase()];
          if (resolved) {
            // Defer execution slightly to let all configurations settle
            setTimeout(() => {
              handleStadiumChange(resolved);
            }, 100);
          }
        }
      }
    }
  }, []);

  // Poll system health metrics every 10 seconds
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchHealth(token);
    }, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Live Match Mode Simulator Tick
  useEffect(() => {
    if (!isLiveMatchMode || autopilotActive) return;
    
    const interval = setInterval(() => {
      setVenueState(prev => {
        if (!prev) return prev;
        const gateList = Object.keys(prev.gate_status).filter(g => prev.gate_status[g].status === "open");
        if (gateList.length === 0) return prev;
        
        const randomGate = gateList[Math.floor(Math.random() * gateList.length)];
        const current = prev.gate_status[randomGate];
        const delta = Math.random() > 0.45 ? 1 : -1;
        const newQueue = Math.max(2, current.queue_length + delta);
        const newWait = Math.max(1, Math.ceil(newQueue * 0.45));

        const nowStr = new Date().toLocaleTimeString();
        appendTerminalLog(`[${nowStr}] TELEMETRY: Updated ${randomGate} flow. Queue: ${newQueue} fans.`);

        return {
          ...prev,
          gate_status: {
            ...prev.gate_status,
            [randomGate]: {
              ...current,
              queue_length: newQueue,
              wait_time_min: newWait
            }
          }
        };
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isLiveMatchMode, autopilotActive]);

  const fetchConfig = (authToken: string) => {
    // Config values are already set via defaults for Dallas flagship
  };

  const fetchHealth = (authToken: string) => {
    fetch(`${API_BASE}/health`, {
      headers: { "Authorization": `Bearer ${authToken}` }
    })
      .then(res => res.json())
      .then(data => {
        setInfrastructureHealth({
          status: data.status,
          database: data.database,
          simulator: data.simulator,
          websocket_connections: data.websocket_connections || 3,
          ai_service: "Grounded Core"
        });
      })
      .catch(() => {});
  };

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
          setIncidents(payload.incidents);
        }
      };
    } catch (err) {
      console.error("WS error", err);
    }
  };

  const appendTerminalLog = (log: string) => {
    setTerminalLogs(prev => [log, ...prev].slice(0, 100));
  };

  const handleStadiumChange = (city: string) => {
    playSuccess();
    const stadiumMapping: { [key: string]: string } = {
      "Dallas": "AT&T Stadium",
      "Toronto": "BMO Stadium",
      "Mexico": "Azteca Stadium",
      "Miami": "Hard Rock Stadium",
      "Vancouver": "BC Place"
    };
    const weatherMapping: { [key: string]: any } = {
      "Dallas": { temp: "29°C", humidity: "62%", wind: "11 km/h", rain: "0%" },
      "Toronto": { temp: "18°C", humidity: "78%", wind: "15 km/h", rain: "12%" },
      "Mexico": { temp: "22°C", humidity: "85%", wind: "8 km/h", rain: "72%" },
      "Miami": { temp: "31°C", humidity: "90%", wind: "12 km/h", rain: "5%" },
      "Vancouver": { temp: "16°C", humidity: "68%", wind: "6 km/h", rain: "2%" }
    };

    setFlagshipCity(city);
    setFlagshipStadium(stadiumMapping[city] || "AT&T Stadium");
    setLocalWeather(weatherMapping[city] || { temp: "29°C", humidity: "62%" });
    appendTerminalLog(`[${new Date().toLocaleTimeString()}] CONSOLE: Switched local twin telemetry to ${stadiumMapping[city]} (${city}).`);
  };

  const handleTriggerCrisisSimulation = async (crisisType: string) => {
    if (autopilotActive) return;
    setAutopilotActive(true);
    setAutopilotStep(1);
    setImpactReportActive(false);
    setImpactSequenceStep(0);
    playWarning();
    startSiren();

    try {
      await fetch(`${API_BASE}/global/simulate-crisis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: crisisType })
      });
    } catch (err) {}

    appendTerminalLog(`[${new Date().toLocaleTimeString()}] CRISIS: Observe - ${crisisType} surge warning logged at Gate C.`);

    setTimeout(() => {
      setAutopilotStep(2);
      playBeep();
      appendTerminalLog(`[${new Date().toLocaleTimeString()}] CRISIS: Understand - Crowd AI counter confirms 96% peak density.`);
    }, 2000);

    setTimeout(() => {
      setAutopilotStep(3);
      playBeep();
      appendTerminalLog(`[${new Date().toLocaleTimeString()}] CRISIS: Predict - Prediction AI calculates critical queue bottlenecks.`);
    }, 4000);

    setTimeout(() => {
      setAutopilotStep(4);
      playBeep();
      appendTerminalLog(`[${new Date().toLocaleTimeString()}] CRISIS: Reason - Multi-Agent orchestrator compiles detour plans.`);
    }, 6000);

    setTimeout(() => {
      setAutopilotStep(5);
      playBeep();
      appendTerminalLog(`[${new Date().toLocaleTimeString()}] CRISIS: Recommend - Recommendations dispatched for operator approval.`);
    }, 8000);

    setTimeout(() => {
      setAutopilotStep(6);
      playBeep();
      appendTerminalLog(`[${new Date().toLocaleTimeString()}] CRISIS: Approve - Human-in-the-loop validation requested.`);
    }, 10000);

    setTimeout(() => {
      setAutopilotStep(7);
      playSuccess();
      appendTerminalLog(`[${new Date().toLocaleTimeString()}] CRISIS: Execute - Command broadcast to volunteer responder staff.`);
    }, 12000);

    setTimeout(() => {
      setAutopilotStep(8);
      playSuccess();
      stopSiren();
      appendTerminalLog(`[${new Date().toLocaleTimeString()}] CRISIS: Resolve - Wait times reduced to 6m. Flow successfully balanced.`);
    }, 14000);

    setTimeout(() => {
      setAutopilotStep(9);
      setAutopilotActive(false);
      setImpactReportActive(true);
      playSuccess();

      // Autoplay impact presentation sequence stages
      setTimeout(() => setImpactSequenceStep(1), 3500);
      setTimeout(() => setImpactSequenceStep(2), 7000);
      setTimeout(() => setImpactSequenceStep(3), 10500);
    }, 16000);
  };

  const handleStartAutopilot = () => {
    handleTriggerCrisisSimulation(selectedCrisis);
  };

  const handleGenerateForecast = async () => {
    setForecastLoading(true);
    playBeep();
    try {
      const res = await fetch(`${API_BASE}/venue/simulate-forecast`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Forecast simulation failed.");

      playSuccess();
      setForecastState(data.data.forecast_state);
      setIsForecastView(true);
    } catch (e) {
      console.error(e);
    } finally {
      setForecastLoading(false);
    }
  };

  const handleToggleEmergencyMode = () => {
    const mode = !emergencyMode;
    setEmergencyMode(mode);
    if (mode) {
      playWarning();
      startSiren();
    } else {
      stopSiren();
      playSuccess();
    }
  };

  const handleApproveIncident = async (id: number) => {
    playSuccess();
    try {
      await fetch(`${API_BASE}/incidents/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "approved" })
      });
    } catch (e) {}
  };

  const handleRejectIncident = async (id: number) => {
    playBeep();
    try {
      await fetch(`${API_BASE}/incidents/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "resolved" })
      });
    } catch (e) {}
  };

  const handleQuickLogin = async () => {
    setLoadingLogin(true);
    try {
      await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "organizer@fanpulse.ai", password: "Demo@2026", role: "organizer" }),
      });
    } catch (e) {}

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "organizer@fanpulse.ai", password: "Demo@2026" }),
      });
      const data = await res.json();
      
      let finalData = data;
      if (data.mfa_required) {
        const mfaRes = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "organizer@fanpulse.ai", password: "Demo@2026", mfa_code: "123456" }),
        });
        finalData = await mfaRes.json();
      }

      if (finalData.access_token) {
        localStorage.setItem("fanpulse_access_token", finalData.access_token);
        localStorage.setItem("fanpulse_role", finalData.role);
        localStorage.setItem("fanpulse_email", finalData.email);
        setToken(finalData.access_token);
        setEmail(finalData.email);
        setRbacError(null);
        connectWebSocket();
        fetchHealth(finalData.access_token);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogin(false);
    }
  };

  if (!isClient) return null;

  if (rbacError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#050608] min-h-screen font-sans text-white">
        <div className="w-full max-w-sm rounded-2xl glass-panel p-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 mx-auto">
            <Lock size={24} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Access Unauthorized</h2>
            <p className="text-xs text-gray-400">{rbacError}</p>
          </div>
          <button onClick={handleQuickLogin} className="w-full p-3.5 rounded-xl bg-purple-500 text-slate-900 font-bold text-xs hover:bg-purple-400 border-none cursor-pointer">
            Sign In as Organizer
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 font-sans bg-[#040508] text-white min-h-screen">
        <div className="w-full max-w-sm rounded-2xl glass-panel p-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mx-auto">
            <Shield size={24} />
          </div>
          <h2 className="text-xl font-bold text-white">Organizer Command Console</h2>
          <button onClick={handleQuickLogin} className="w-full p-3.5 rounded-xl bg-purple-500 text-slate-900 font-bold text-sm border-none cursor-pointer">
            Quick Access
          </button>
        </div>
      </div>
    );
  }

  const pendingIncidents = incidents.filter(inc => inc.status === "reported" || inc.status === "critical_evacuation");
  const activePhase = timeMachinePhases[timeMachineIndex];
  // Dynamically compute displayState matching the active Time Machine Phase
  const computedState = {
    gate_status: {
      "Gate A": { 
        status: "open", 
        queue_length: activePhase.name.includes("Metro") ? 45 : (activePhase.name.includes("Gate C") ? 18 : 15), 
        wait_time_min: activePhase.name.includes("Metro") ? 8 : (activePhase.name.includes("Gate C") ? 4 : 3),
        throughput_per_min: 8
      },
      "Gate B": { 
        status: "open", 
        queue_length: activePhase.name.includes("Parking") ? 38 : 22, 
        wait_time_min: activePhase.name.includes("Parking") ? 10 : 5,
        throughput_per_min: 6
      },
      "Gate C": { 
        status: "open", 
        queue_length: activePhase.name.includes("Gate C") ? 92 : (activePhase.name.includes("Exit") ? 40 : 12), 
        wait_time_min: activePhase.name.includes("Gate C") ? 48 : (activePhase.name.includes("Exit") ? 15 : 3),
        throughput_per_min: 10
      },
      "Gate C2": { 
        status: activePhase.name.includes("Gate C") || activePhase.name.includes("Exit") || activePhase.name.includes("POST") ? "open" : "closed", 
        queue_length: activePhase.name.includes("Gate C") ? 12 : 0, 
        wait_time_min: activePhase.name.includes("Gate C") ? 2 : 0,
        throughput_per_min: activePhase.name.includes("Gate C") ? 8 : 0
      }
    },
    zone_occupancy: {
      "Zone 3 (East stands)": { occupancy_pct: activePhase.name.includes("POST") ? 25 : (activePhase.name.includes("Exit") ? 75 : 80) },
      "Zone 4 (West stands)": { occupancy_pct: activePhase.name.includes("POST") ? 20 : (activePhase.name.includes("Exit") ? 70 : 85) },
      "Zone 2 (Concourse North)": { occupancy_pct: activePhase.name.includes("HALFTIME") ? 94 : (activePhase.name.includes("POST") ? 15 : 45) },
      "Zone 5 (South stands)": { occupancy_pct: activePhase.name.includes("POST") ? 10 : (activePhase.name.includes("Exit") ? 60 : 70) }
    },
    concessions: {
      restrooms: { 
        "WR-07": activePhase.name.includes("HALFTIME") ? "heavy" : "nominal", 
        "WR-04": "nominal" 
      },
      food_inventory: { 
        "FC-03": "nominal", 
        "FC-05": activePhase.name.includes("HALFTIME") ? "low" : "nominal" 
      },
      wait_times: { 
        "FC-03": 3, 
        "FC-05": activePhase.name.includes("HALFTIME") ? 12 : 4 
      }
    },
    weather_transit: {
      temp_f: activePhase.name.includes("5:00") ? 82 : (activePhase.name.includes("6:00") ? 80 : 75),
      conditions: activePhase.weather || "Clear",
      train_wait_min: activePhase.name.includes("Metro") ? 9 : 4
    }
  };

  const displayState = isForecastView ? forecastState || computedState : computedState;

  return (
    <div className="flex-1 flex flex-col h-full font-sans bg-[#040508] text-white min-h-screen overflow-x-hidden relative">
      
      {/* Toast Warning */}
      {liveNotification && (
        <div className="fixed top-6 right-6 z-[9999] max-w-xs p-4 rounded-xl bg-cyan-950/95 border-2 border-cyan-500 shadow-2xl flex items-start gap-3">
          <AlertTriangle className="text-cyan-400 shrink-0 mt-0.5" size={16} />
          <div className="space-y-1 text-xs">
            <span className="font-extrabold text-cyan-400 tracking-wider block">AI SYSTEM ADVISORY</span>
            <p className="text-white font-semibold leading-relaxed">{liveNotification}</p>
            <button onClick={() => setLiveNotification(null)} className="px-2.5 py-1 bg-cyan-500 text-slate-950 rounded font-bold text-[9px] cursor-pointer border-none mt-1">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Global Impact Report Screen Overlay (Autopilot Demo Ending Screen) */}
      {impactReportActive && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/98 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center font-mono select-none">
          
          {impactSequenceStep === 0 && (
            <div className="w-full max-w-sm rounded-2xl border-2 border-emerald-500/30 bg-slate-900/90 p-8 space-y-6 shadow-2xl relative">
              <button onClick={() => setImpactReportActive(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer bg-transparent border-none">
                ✕
              </button>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto animate-pulse">
                <CheckCircle size={28} />
              </div>
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-emerald-400">GLOBAL IMPACT REPORT</h2>
              
              <div className="space-y-2 text-[10px] text-left text-gray-400 border-y border-white/5 py-4">
                <div className="flex justify-between"><span>Fans Assisted</span><span className="text-white font-bold">68,142</span></div>
                <div className="flex justify-between"><span>AI Recommendations</span><span className="text-white font-bold">412</span></div>
                <div className="flex justify-between"><span>Prediction Accuracy</span><span className="text-emerald-400 font-bold">98%</span></div>
                <div className="flex justify-between"><span>Volunteer Efficiency</span><span className="text-emerald-400 font-bold">97%</span></div>
                <div className="flex justify-between"><span>Accessibility Score</span><span className="text-cyan-400 font-bold">99%</span></div>
                <div className="flex justify-between"><span>Translation Accuracy</span><span className="text-white font-bold">98%</span></div>
                <div className="flex justify-between"><span>Queue Reduced</span><span className="text-amber-400 font-bold">18 min ➔ 6 min</span></div>
                <div className="flex justify-between"><span>Response Time</span><span className="text-white font-bold">7.8 Seconds</span></div>
                <div className="flex justify-between"><span>Incidents Prevented</span><span className="text-emerald-400 font-bold">23</span></div>
                <div className="flex justify-between"><span>Global Stadium Score</span><span className="text-cyan-400 font-bold">98/100</span></div>
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span>Status</span><span className="text-emerald-400 font-extrabold uppercase">SUCCESSFULLY RESOLVED</span>
                </div>
              </div>

              <p className="text-[9px] text-gray-500 animate-pulse">Autopilot presentation playing ending sequences...</p>
            </div>
          )}

          {impactSequenceStep === 1 && (
            <div className="space-y-6 max-w-xl">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest block">AI Operations Flow Sequence</span>
              <h2 className="text-xs font-extrabold text-white leading-relaxed flex flex-wrap justify-center gap-2">
                {["OBSERVE", "UNDERSTAND", "PREDICT", "REASON", "RECOMMEND", "APPROVE", "EXECUTE", "RESOLVE", "SUCCESS"].map((sName, sIdx) => (
                  <span key={sName} className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold">{sName}</span>
                    {sIdx < 8 && <span className="text-gray-600">➔</span>}
                  </span>
                ))}
              </h2>
            </div>
          )}

          {impactSequenceStep === 2 && (
            <div className="space-y-6 max-w-3xl">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest block">Cinematic Global Zoom-Out</span>
              <h2 className="text-xs font-extrabold text-white leading-relaxed flex flex-wrap justify-center gap-2">
                {["DALLAS STADIUM", "DALLAS", "TEXAS", "EARTH", "16 HOST CITIES", "GLOBAL DIGITAL TWIN", "GLOBAL COMMAND CENTER", "FANPULSE AI"].map((zoomItem, zIdx) => (
                  <span key={zoomItem} className="flex items-center gap-1.5">
                    <span className="text-purple-400 font-bold">{zoomItem}</span>
                    {zIdx < 7 && <span className="text-gray-600">➔</span>}
                  </span>
                ))}
              </h2>
            </div>
          )}

          {impactSequenceStep === 3 && (
            <div className="w-full max-w-lg rounded-2xl border-2 border-cyan-500/30 bg-slate-950 p-8 space-y-6 shadow-2xl relative text-center animate-fadeIn">
              <button onClick={() => setImpactReportActive(false)} className="absolute top-4 right-4 text-xs font-bold text-gray-500 hover:text-white cursor-pointer bg-transparent border-none">
                ✕
              </button>
              
              <div className="space-y-2">
                <h1 className="text-xl font-extrabold text-white tracking-widest uppercase">FanPulse AI</h1>
                <p className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider">
                  THE GLOBAL AGENTIC AI STADIUM OPERATING SYSTEM FOR FIFA WORLD CUP 2026
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[9px] text-gray-400 text-left border-y border-white/5 py-4 font-mono">
                <div>• 16 Host Cities</div>
                <div>• 10 Specialized AI Agents</div>
                <div>• 12 Languages</div>
                <div>• AI Crisis Commander</div>
                <div>• Global Digital Twin</div>
                <div>• Accessibility AI</div>
                <div>• Volunteer Intelligence</div>
                <div>• Match Day Companion AI</div>
                <div className="pt-2 border-t border-white/5 col-span-2 flex justify-between">
                  <span>Prediction Accuracy</span><strong className="text-emerald-400">98%</strong>
                </div>
                <div className="flex justify-between col-span-2">
                  <span>Accessibility Score</span><strong className="text-cyan-400">99%</strong>
                </div>
                <div className="flex justify-between col-span-2">
                  <span>Response Time</span><strong className="text-white">7.8s</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-2 text-xxs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 uppercase font-bold">SYSTEM STATUS</span>
                  <span className="text-emerald-400 font-extrabold animate-pulse">ONLINE</span>
                </div>
                <div className="text-[8px] text-emerald-400/90 leading-relaxed border-t border-white/5 pt-2 flex flex-wrap justify-center gap-1">
                  {["Observe", "Understand", "Predict", "Reason", "Recommend", "Approve", "Execute", "Resolve", "SUCCESS"].map((s, idx) => (
                    <span key={s} className="flex items-center gap-0.5">
                      <span>{s}</span>
                      {idx < 8 && <span className="text-gray-600">➔</span>}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest font-mono pt-2 animate-bounce">
                ★ THANK YOU ★
              </div>
            </div>
          )}

        </div>
      )}

      {/* Header Panel */}
      <header className="flex flex-col md:flex-row justify-between items-center px-6 py-4 border-b border-white/5 bg-slate-950/40 backdrop-blur-md gap-4 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Cpu size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-white tracking-wider uppercase md:text-base">
                {flagshipStadium} Operating System
              </h1>
              <select
                value={flagshipCity}
                onChange={(e) => handleStadiumChange(e.target.value)}
                className="bg-slate-905 bg-slate-900 border border-white/10 text-white rounded text-[10px] font-mono p-1 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="Dallas">Dallas (AT&T Stadium)</option>
                <option value="Toronto">Toronto (BMO Stadium)</option>
                <option value="Mexico">Mexico (Azteca Stadium)</option>
                <option value="Miami">Miami (Hard Rock Stadium)</option>
                <option value="Vancouver">Vancouver (BC Place)</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[9px] text-cyan-400/70 font-mono tracking-wider uppercase">
                THE GLOBAL AGENTIC AI STADIUM OPERATING SYSTEM FOR FIFA WORLD CUP 2026
              </span>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-950 border border-white/5 rounded-xl text-xs text-gray-400 font-mono md:text-sm">
            <span className="flex items-center gap-1"><Thermometer size={10} className="text-amber-500" /> {weather.temp}</span>
            <span className="flex items-center gap-1"><Droplet size={10} className="text-sky-500" /> {weather.humidity}</span>
          </div>

          {/* Dual Simulator Mode */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-white/5">
            <button
              onClick={() => {
                playBeep();
                setIsLiveMatchMode(true);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border-none cursor-pointer md:text-sm ${
                isLiveMatchMode ? "bg-cyan-500 text-slate-950" : "text-gray-400 hover:text-white bg-transparent"
              }`}
            >
              ● Live Match
            </button>
            <button
              onClick={() => {
                playBeep();
                setIsLiveMatchMode(false);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all border-none cursor-pointer md:text-sm ${
                !isLiveMatchMode ? "bg-purple-500 text-white" : "text-gray-400 hover:text-white bg-transparent"
              }`}
            >
              ● Demo Mode
            </button>
          </div>

          <button onClick={handleStartAutopilot} disabled={autopilotActive} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-sm border-none cursor-pointer text-white">
            <Play size={12} className="fill-white" /> {autopilotActive ? "Running Autopilot" : "Start Autopilot Demo"}
          </button>

          <button onClick={handleGenerateForecast} disabled={forecastLoading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-bold text-sm transition-all cursor-pointer">
            {forecastLoading ? <RefreshCw size={12} className="animate-spin" /> : <Clock size={12} />} Proj Forecast
          </button>

          <button onClick={handleToggleEmergencyMode} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-sm transition-all cursor-pointer border-none ${
            emergencyMode ? "bg-red-600 text-white animate-pulse" : "bg-red-950/50 text-red-400 border border-red-500/20"
          }`}>
            <AlertTriangle size={12} /> Evac Protocol
          </button>
        </div>
      </header>

      {/* 8-Phase Time Machine slider bar */}
      <div className="px-6 py-3 border-b border-white/5 bg-slate-900/20 flex flex-col md:flex-row justify-between items-center gap-4 z-40">
        <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase font-mono block shrink-0 md:text-sm">🛰️ TIME MACHINE MATCH PHASES</span>
        
        {/* Slider bar */}
        <div className="flex-1 w-full flex justify-between items-center gap-2 font-mono text-[11px] text-gray-500 md:text-xs">
          {timeMachinePhases.map((phase, pIdx) => {
            const isActive = timeMachineIndex === pIdx;
            return (
              <button
                key={phase.name}
                onClick={() => {
                  playBeep();
                  setTimeMachineIndex(pIdx);
                  appendTerminalLog(`[${new Date().toLocaleTimeString()}] TIME-MACHINE: Jumped to ${phase.name} phase.`);
                }}
                className={`flex-1 py-2 px-1 rounded-lg text-[11px] font-bold transition-all border-none cursor-pointer text-center md:text-xs ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
                    : "bg-slate-900/40 hover:bg-slate-900 text-gray-400"
                }`}
              >
                {phase.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main OS Console Dashboard Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 z-30">
        
        {/* LEFT COLUMN: 3D viewports, Hotspots & CCTV Feeds */}
        <div className="lg:col-span-9 flex flex-col gap-6 overflow-y-auto pr-1">
          
          {/* Human Experience KPIs & Core Telemetry metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
            <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-0.5 backdrop-blur-md">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold md:text-[11px]">HUMAN INTELLIGENCE</span>
              <span className="text-base font-extrabold font-mono text-white md:text-lg">98%</span>
            </div>
            <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-0.5 backdrop-blur-md">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold md:text-[11px]">ACCESSIBILITY SCORE</span>
              <span className="text-base font-extrabold font-mono text-cyan-400 md:text-lg">96%</span>
            </div>
            <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-0.5 backdrop-blur-md">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold md:text-[11px]">PERSONALIZATION INDEX</span>
              <span className="text-base font-extrabold font-mono text-purple-400 md:text-lg">95%</span>
            </div>
            <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-0.5 backdrop-blur-md">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold md:text-[11px]">VOLUNTEER RESPONSE</span>
              <span className="text-base font-extrabold font-mono text-emerald-400 md:text-lg">94%</span>
            </div>
            <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 space-y-0.5 backdrop-blur-md">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold md:text-[11px]">TRANSLATION ACCURACY</span>
              <span className="text-base font-extrabold font-mono text-white md:text-lg">97%</span>
            </div>
          </div>

          {/* Time Machine current phase status overlay */}
          <div className="p-4 bg-gradient-to-r from-cyan-950/20 to-slate-950/40 rounded-xl border border-cyan-500/20 text-xxs font-mono flex flex-wrap justify-between items-center gap-3">
            <div>
              <span className="text-gray-500 block uppercase font-bold">Time Machine Active: {activePhase.name}</span>
              <span className="text-white">Active Crowd: <strong className="text-cyan-400">{activePhase.fans} Fans</strong></span>
            </div>
            <div className="text-right">
              <p className="text-gray-400">AI Recommendation: {activePhase.recommendation}</p>
            </div>
          </div>

          {/* 3D view framing */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[380px]">
            {/* Hotspots Sidebar HUD */}
            <div className="md:col-span-3 rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block flex items-center gap-1.5">
                  <Eye size={12} /> Digital Asset HUD
                </span>
                <div className="space-y-1.5">
                  {["Match Pitch", "Gate A", "Gate C", "Concourse Restrooms", "Parking Lot", "VIP Suites", "Player Tunnel"].map((hName) => (
                    <button
                      key={hName}
                      onClick={() => {
                        playBeep();
                        setSelectedHotspot(hName);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex justify-between items-center ${
                        selectedHotspot === hName
                          ? "bg-cyan-500 text-slate-950 shadow-md"
                          : "bg-slate-900/50 hover:bg-slate-900 text-gray-300"
                      }`}
                    >
                      <span>{hName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset telemetry summary */}
              <div className="p-3.5 bg-slate-900/40 rounded-lg border border-white/5 space-y-1 text-xxs font-mono">
                <span className="text-gray-500 font-bold block uppercase">Asset Telemetry</span>
                <p>Status: Healthy</p>
                <p>Crowd Target: {activePhase.fans} Fans</p>
              </div>
            </div>

            {/* 3D viewport canvas */}
            <div className="md:col-span-9 h-full min-h-[350px]">
              <DigitalTwin
                venueState={displayState}
                incidents={incidents}
                selectedHotspot={selectedHotspot}
                emergencyMode={emergencyMode}
                heatmapMode={heatmapMode}
                droneScanMode={droneScanMode}
                onSelectHotspot={setSelectedHotspot}
              />
            </div>
          </div>

          {/* AI AGENTS CONTRIBUTION PANEL & RECOMMENDATION */}
          <div className="p-5 rounded-xl border border-cyan-500/20 bg-slate-950/40 space-y-4 animate-fadeIn">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block flex items-center gap-1.5 font-mono">
              <Cpu size={14} className="text-cyan-400" /> Grounded AI Recommendation Details
            </span>
            <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xxs font-mono">
                <div className="space-y-2.5">
                  <p><span className="text-gray-500 uppercase tracking-wider block font-bold text-[8px]">Recommendation</span> <strong className="text-white text-[11px] block mt-0.5">{activePhase.recommendation}</strong></p>
                  <p className="pt-2"><span className="text-gray-500 uppercase tracking-wider block font-bold text-[8px]">Grounded WHY (Reasoning)</span> <span className="text-gray-300 block leading-relaxed mt-0.5">{activePhase.why}</span></p>
                </div>
                <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-lg border border-white/5 text-[9px] h-fit">
                  <div>
                    <span className="text-gray-500 text-[7px] uppercase tracking-wider block font-bold">Confidence Score</span>
                    <strong className="text-emerald-400 text-xs">{activePhase.confidence}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[7px] uppercase tracking-wider block font-bold">Time Saved</span>
                    <strong className="text-cyan-400 text-xs">{activePhase.timeSaved}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[7px] uppercase tracking-wider block font-bold">Risk Level</span>
                    <strong className={`text-xs ${activePhase.riskLevel === "LOW" ? "text-emerald-400" : "text-amber-400"}`}>{activePhase.riskLevel}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[7px] uppercase tracking-wider block font-bold">Status</span>
                    <strong className="text-cyan-400 text-[9px]">{activePhase.status}</strong>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 text-xxs font-mono space-y-2">
                <div>
                  <span className="text-gray-500 uppercase tracking-wider block font-bold text-[8px] mb-1">Impact Analytics</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[9px] text-gray-300">
                    <p>• Accessibility Impact: <strong>{activePhase.accessibilityImpact}</strong></p>
                    <p>• Crowd Flow Impact: <strong>{activePhase.crowdImpact}</strong></p>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <span className="text-gray-500 uppercase tracking-wider block font-bold text-[8px] mb-1">Alternative Route</span>
                  <p className="text-gray-300">Alternative: <strong>{activePhase.alternative}</strong></p>
                </div>
              </div>

              {/* Checkmarks list */}
              <div className="border-t border-white/5 pt-3">
                <span className="text-gray-500 uppercase tracking-wider block font-bold text-[8px] mb-2 font-mono">Cooperating AI Agents Contributed</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {activePhase.contributors.map((name) => (
                    <div key={name} className="p-2 bg-slate-950/80 rounded border border-white/5 text-[9px] font-mono space-y-1">
                      <span className="text-emerald-400 font-bold flex items-center gap-1">✓ {name}</span>
                      <div className="flex justify-between text-[8px] text-gray-500">
                        <span>98% Conf</span>
                        <span>ACTIVE</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          {/* AI Collaboration Diagram Flow */}
          <div className="p-5 rounded-xl border border-white/5 bg-slate-950/40 space-y-4">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest block flex items-center gap-1.5 font-mono">
              <Cpu size={14} /> AI Collaboration Flow
            </span>
            <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 text-center font-mono text-[9px] relative overflow-hidden space-y-4">
              <div className="flex flex-col items-center">
                <span className="px-3 py-1.5 rounded bg-slate-950 border border-white/10 text-white font-bold block">USER</span>
                <span className="text-gray-600 block my-1">↓</span>
                <span className="px-3 py-1.5 rounded bg-slate-950 border border-cyan-500/30 text-cyan-400 font-bold block animate-pulse">AGENT ORCHESTRATOR</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 justify-center items-center pt-2">
                {[
                  { name: "Navigation AI", confidence: "96%", step: 4 },
                  { name: "Crowd AI", confidence: "94%", step: 2 },
                  { name: "Traffic AI", confidence: "97%", step: 2 }
                ].map((ag) => {
                  const isGlow = autopilotStep === ag.step;
                  return (
                    <div key={ag.name} className={`p-2 rounded bg-slate-950 border text-center transition-all ${
                      isGlow ? "border-cyan-500 text-cyan-400 font-bold shadow-md shadow-cyan-500/10 animate-pulse" : "border-white/5 text-gray-505 text-gray-500"
                    }`}>
                      <p>{ag.name}</p>
                      <span className="text-[8px] opacity-75">{ag.confidence}</span>
                    </div>
                  );
                })}
              </div>

              <div className="text-gray-600 block my-1 text-center">↓</div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 justify-center items-center pt-1">
                {[
                  { name: "Prediction AI", confidence: "98%", step: 3 },
                  { name: "Accessibility AI", confidence: "99%", step: 4 },
                  { name: "Medical AI", confidence: "96%", step: 4 },
                  { name: "Translation AI", confidence: "99%", step: 4 }
                ].map((ag) => {
                  const isGlow = autopilotStep === ag.step;
                  return (
                    <div key={ag.name} className={`p-2 rounded bg-slate-950 border text-center transition-all ${
                      isGlow ? "border-cyan-500 text-cyan-400 font-bold shadow-md shadow-cyan-500/10 animate-pulse" : "border-white/5 text-gray-505 text-gray-500"
                    }`}>
                      <p>{ag.name}</p>
                      <span className="text-[8px] opacity-75">{ag.confidence}</span>
                    </div>
                  );
                })}
              </div>

              <div className="text-gray-600 block my-1 text-center">↓</div>

              <div className="flex flex-col items-center pt-1">
                <span className={`px-4 py-2 rounded bg-slate-950 border text-[10px] font-extrabold block transition-all ${
                  autopilotStep >= 5 ? "border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10 animate-bounce" : "border-white/5 text-gray-500"
                }`}>
                  FINAL RECOMMENDATION (Confidence = 97%)
                </span>
              </div>
            </div>
          </div>
        </div>

        </div>

        {/* RIGHT COLUMN: AI Agent chats, checklists, health telemetry */}
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto pl-1">
          
          {/* Infrastructure Health */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 space-y-4">
            <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest block flex items-center gap-1.5">
              <Server size={14} /> Infrastructure Health
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs font-mono md:text-sm">
              <div className="p-2.5 bg-slate-900/40 rounded-lg border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-gray-500 block uppercase text-[11px] md:text-xs">Database Connection</span>
                  <span className="font-bold text-emerald-400">{infrastructureHealth.database}</span>
                </div>
              </div>
              <div className="p-2.5 bg-slate-900/40 rounded-lg border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-gray-500 block uppercase text-[11px] md:text-xs">WS status</span>
                  <span className="text-cyan-400 font-bold">{infrastructureHealth.websocket_connections} Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Crisis Commander */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 space-y-4">
            <span className="text-sm font-bold text-red-400 uppercase tracking-widest block flex items-center gap-1.5 font-mono">
              <Sliders size={14} /> AI Crisis Commander
            </span>
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold font-mono">Select Scenario</span>
                <select
                  value={selectedCrisis}
                  onChange={(e) => setSelectedCrisis(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-[10px] font-mono text-white focus:outline-none focus:border-red-500 cursor-pointer"
                >
                  {["MEDICAL EMERGENCY", "FIRE EMERGENCY", "HEAVY RAIN", "POWER FAILURE", "LOST CHILD", "SECURITY INCIDENT", "FOOD SHORTAGE", "PARKING FAILURE", "GATE CONGESTION", "MULTI INCIDENT EVENTS"].map(tName => (
                    <option key={tName} value={tName}>{tName}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handleTriggerCrisisSimulation(selectedCrisis)}
                disabled={autopilotActive}
                className="w-full p-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-slate-950 font-extrabold text-[10px] transition-all cursor-pointer border-none shadow-lg shadow-red-500/10 uppercase tracking-wider font-mono"
              >
                {autopilotActive ? "Commander Active..." : "Deploy Crisis Protocol"}
              </button>
            </div>
          </div>

          {/* AI War Room */}
          {autopilotActive && (
            <div className="p-5 rounded-2xl border border-red-500/30 bg-slate-950/40 space-y-4 animate-pulse">
              <span className="text-sm font-bold text-orange-400 uppercase tracking-widest block flex items-center gap-1.5 font-mono">
                <Radio size={14} className="text-orange-400" /> Global AI War Room
              </span>
              <div className="space-y-3.5 text-[10px] font-mono">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Risk Score</span><span className="text-red-500 font-extrabold uppercase">CRITICAL</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>Exp Resolution</span><span className="text-white font-bold">6 MINUTES</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <span>AI Confidence</span><span className="text-emerald-400 font-bold">98%</span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[8px] text-gray-500 uppercase tracking-widest block">Active Incidents</span>
                  <div className="flex flex-wrap gap-1 text-[8px]">
                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Medical Incident</span>
                    <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">Heavy Rain Warning</span>
                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Gate Congestion</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] text-gray-500 uppercase tracking-widest block">AI Conclusion</span>
                  <div className="space-y-0.5 text-gray-300 text-[9px]">
                    <p className="text-cyan-400 font-bold flex items-center gap-1">✔ Open Gate C2</p>
                    <p className="text-cyan-400 font-bold flex items-center gap-1">✔ Dispatch Volunteer Team-12</p>
                    <p className="text-cyan-400 font-bold flex items-center gap-1">✔ Open Parking Lot B</p>
                    <p className="text-cyan-400 font-bold flex items-center gap-1">✔ Activate Medical Bay-2</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Decision Journey Flow */}
          {autopilotActive && (
            <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 space-y-4">
              <span className="text-sm font-bold text-cyan-400 uppercase tracking-widest block flex items-center gap-1.5 font-mono">
                <Activity size={14} /> AI Decision Journey
              </span>
              <div className="space-y-2 font-mono text-[9px]">
                {[
                  { step: 1, name: "Observe", desc: "Surge alert triggered" },
                  { step: 2, name: "Understand", desc: "Counter confirms 96% occupancy" },
                  { step: 3, name: "Predict", desc: "Est 48m waiting time" },
                  { step: 4, name: "Reason", desc: "Alternative routes loaded" },
                  { step: 5, name: "Recommend", desc: "Redirect to Gate C2" },
                  { step: 6, name: "Approve", desc: "Awaiting human verification" },
                  { step: 7, name: "Execute", desc: "Turnstiles unlocked" },
                  { step: 8, name: "Resolve", desc: "Bottleneck balanced" }
                ].map((ph) => {
                  const isCurrent = autopilotStep === ph.step;
                  const isPassed = autopilotStep > ph.step;
                  return (
                    <div
                      key={ph.name}
                      className={`p-2 rounded border flex justify-between items-center transition-all ${
                        isCurrent
                          ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold animate-pulse"
                          : isPassed
                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400/80"
                            : "bg-slate-900/40 border-white/5 text-gray-500"
                      }`}
                    >
                      <span>{ph.step}. {ph.name}</span>
                      <span>{isCurrent ? ph.desc : isPassed ? "Complete" : "Pending"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active safety approvals loop */}
          <div className="p-5 rounded-2xl border border-white/5 bg-slate-950/40 space-y-4">
            <span className="text-sm font-bold text-red-400 uppercase tracking-widest block flex items-center gap-1.5">
              <AlertTriangle size={15} /> Safety Approval Loop (Human-in-the-loop)
            </span>
            <div className="space-y-3">
              {pendingIncidents.length > 0 ? (
                pendingIncidents.map((inc) => (
                  <div key={inc.id} className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-red-400">
                      <span>{inc.title}</span>
                      <span className="text-[9px] uppercase tracking-wider">{inc.severity}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-normal">{inc.description}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveIncident(inc.id)} className="flex-1 py-1.5 rounded bg-red-600 text-slate-950 font-bold text-xxs border-none cursor-pointer">
                        Approve & Broadcast
                      </button>
                      <button onClick={() => handleRejectIncident(inc.id)} className="px-3 py-1.5 rounded bg-slate-800 text-gray-300 font-bold text-xxs border-none cursor-pointer">
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xxs text-gray-500 font-mono">
                  <CheckCircle size={20} className="mx-auto text-gray-600 mb-1" />
                  No safety approvals pending.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Collapsible AI Command Console */}
      <div className="w-full bg-slate-950 border-t border-white/10 z-50">
        <button
          onClick={() => setTerminalConsoleCollapsed(!terminalConsoleCollapsed)}
          className="w-full px-6 py-2.5 flex justify-between items-center text-xs font-bold text-cyan-400 font-mono cursor-pointer hover:bg-slate-900 border-none bg-transparent"
        >
          <span className="flex items-center gap-2"><Cpu size={14} className="animate-pulse" /> FANPULSE AI COMMAND LOG</span>
          {terminalConsoleCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {!terminalConsoleCollapsed && (
          <div className="px-6 py-4 max-h-40 overflow-y-auto font-mono text-[10px] text-cyan-400/80 space-y-1.5 bg-[#030712] border-t border-white/5">
            {terminalLogs.map((log, lIdx) => (
              <p key={lIdx} className="leading-relaxed">{log}</p>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
