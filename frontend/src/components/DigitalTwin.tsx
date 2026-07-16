"use client";

import React, { useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Line } from "@react-three/drei";
import * as THREE from "three";
import { playBeep } from "@/utils/audio";
import { useAccessibility } from "@/context/AccessibilityContext";

interface Gate {
  status: string;
  queue_length: number;
  wait_time_min: number;
}

interface Zone {
  occupancy_pct: number;
}

interface StadiumState {
  gate_status: { [key: string]: Gate };
  zone_occupancy: { [key: string]: Zone };
}

interface DigitalTwinProps {
  venueState: StadiumState | null;
  incidents: any[];
  selectedHotspot: string | null;
  emergencyMode: boolean;
  heatmapMode: boolean;
  droneScanMode: boolean;
  onSelectHotspot: (name: string) => void;
}

const hotspotCoords: { [key: string]: { cam: [number, number, number]; look: [number, number, number] } } = {
  Default: { cam: [8.5, 6.0, 8.5], look: [0.0, 0.0, 0.0] },
  "Gate A": { cam: [0.0, 1.8, -5.8], look: [0.0, 0.4, -4.2] },
  "Gate C": { cam: [7.0, 1.8, 0.0], look: [4.8, 0.4, 0.0] },
  "Concourse Restrooms": { cam: [-5.8, 2.2, 0.0], look: [-3.8, 0.4, 0.0] },
  "Parking Lot": { cam: [-8.0, 2.2, -6.0], look: [-5.5, 0.2, -4.0] },
  "Match Pitch": { cam: [0.0, 2.2, 4.0], look: [0.0, 0.1, 0.0] },
  "VIP Suites": { cam: [0.0, 2.8, -3.2], look: [0.0, 1.2, -1.5] },
  "Player Tunnel": { cam: [-3.2, 1.2, -2.8], look: [-2.0, 0.2, -2.0] }
};

// 11 Layers Specification List
const layersList = [
  { id: "Crowd", label: "Crowd Flow", color: "bg-red-500" },
  { id: "Parking", label: "Parking Lots", color: "bg-blue-500" },
  { id: "Food", label: "Food Courts", color: "bg-orange-500" },
  { id: "Security", label: "Security Gates", color: "bg-slate-500" },
  { id: "Volunteers", label: "Volunteers Map", color: "bg-purple-500" },
  { id: "Medical", label: "Medical Bays", color: "bg-emerald-500" },
  { id: "Weather", label: "Micro Weather", color: "bg-sky-500" },
  { id: "Transport", label: "Transit Lines", color: "bg-indigo-500" },
  { id: "Waste", label: "Waste Management", color: "bg-amber-600" },
  { id: "Emergency", label: "Emergency Exits", color: "bg-red-600" },
  { id: "CCTV", label: "CCTV Vision AI", color: "bg-cyan-500" }
];

// 3D Animated Danger Alert Cone
const IncidentMarker: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.04;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 5) * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <coneGeometry args={[0.18, 0.5, 4]} />
      <meshStandardMaterial color="#ef4444" emissive="#dc2626" roughness={0.1} metalness={0.9} />
    </mesh>
  );
};

// CCTV Dome Camera models with customizable active view frustum
const CCTVCameraMesh: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; showFrustum: boolean }> = ({ position, rotation, showFrustum }) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <sphereGeometry args={[0.12, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, -0.04, 0.04]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
        <meshStandardMaterial color="#020617" />
      </mesh>
      {showFrustum && (
        <mesh position={[0, -0.6, 0.6]} rotation={[-0.45, 0, 0]}>
          <coneGeometry args={[0.4, 1.2, 16, 1, true]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// Drone model hovering with spinning rotors and searchlight cone
const DroneMesh: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 2) * 0.12;
      groupRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <boxGeometry args={[0.3, 0.06, 0.3]} />
        <meshStandardMaterial color="#334155" roughness={0.3} />
      </mesh>
      {[[0.15, 0.15], [-0.15, 0.15], [0.15, -0.15], [-0.15, -0.15]].map(([rx, rz], i) => (
        <mesh key={i} position={[rx, 0.04, rz]}>
          <cylinderGeometry args={[0.08, 0.08, 0.01, 6]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
      ))}
      <mesh position={[0, -0.4, 0]}>
        <coneGeometry args={[0.2, 0.8, 16, 1, true]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// 22 Players (Red vs Blue) + Referee + Soccer Ball simulation
const FootballMatchSimulation: React.FC = () => {
  const ballRef = useRef<THREE.Mesh>(null);
  const initialPositions = useRef<[number, number][]>([]);

  useEffect(() => {
    const coords: [number, number][] = [];
    for (let i = 0; i < 11; i++) {
      coords.push([-2.5 + Math.random() * 2.0, -1.8 + Math.random() * 3.6]);
    }
    for (let i = 0; i < 11; i++) {
      coords.push([0.5 + Math.random() * 2.0, -1.8 + Math.random() * 3.6]);
    }
    initialPositions.current = coords;
  }, []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (ballRef.current) {
      const bx = Math.sin(time * 0.7) * 2.0;
      const bz = Math.cos(time * 1.1) * 1.2;
      ballRef.current.position.x = bx;
      ballRef.current.position.z = bz;
      ballRef.current.position.y = 0.05 + Math.abs(Math.sin(time * 3.0)) * 0.28;
    }
  });

  return (
    <group>
      {initialPositions.current.map((pos, i) => (
        <mesh key={i} position={[pos[0], 0.05, pos[1]]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={i < 11 ? "#3b82f6" : "#ef4444"} />
        </mesh>
      ))}
      <mesh ref={ballRef} position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};

// Spectator crowd particles
const FanParticles: React.FC<{ count: number; emergencyMode: boolean; activeLayer: string }> = ({ count, emergencyMode, activeLayer }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const [positions] = useState(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 3.3 + Math.random() * 1.1;
      arr[i * 3] = Math.sin(angle) * dist;
      arr[i * 3 + 1] = 0.15 + Math.random() * 0.45;
      arr[i * 3 + 2] = Math.cos(angle) * dist;
    }
    return arr;
  });

  const getParticleColor = () => {
    if (emergencyMode || activeLayer === "Emergency") return "#ef4444";
    if (activeLayer === "Crowd") return "#f59e0b";
    return "#22d3ee";
  };

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * (emergencyMode ? 0.08 : 0.01);
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={getParticleColor()} size={0.06} sizeAttenuation />
    </points>
  );
};

// Weather Layer rainfall simulator
const WeatherRainParticles: React.FC = () => {
  const points = useRef<THREE.Points>(null);
  const particleCount = 200;
  const positions = useRef(new Float32Array(particleCount * 3));
  
  useEffect(() => {
    for (let i = 0; i < particleCount; i++) {
      positions.current[i * 3] = (Math.random() - 0.5) * 8.0;
      positions.current[i * 3 + 1] = Math.random() * 4.0;
      positions.current[i * 3 + 2] = (Math.random() - 0.5) * 8.0;
    }
  }, []);

  useFrame(() => {
    if (points.current) {
      const geo = points.current.geometry;
      const posAttr = geo.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        let y = posAttr.getY(i) - 0.06;
        if (y < 0) y = 4.0;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.current, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#38bdf8" size={0.035} sizeAttenuation transparent opacity={0.6} />
    </points>
  );
};

// Curated curved seating bowl model
const StadiumMesh: React.FC<{
  venueState: StadiumState | null;
  emergencyMode: boolean;
  heatmapMode: boolean;
  activeLayer: string;
}> = ({ venueState, emergencyMode, heatmapMode, activeLayer }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const pulse = 1.0 + Math.sin(state.clock.getElapsedTime() * 1.5) * 0.008;
      groupRef.current.scale.set(1.0, pulse, 1.0);
    }
  });

  const getStandColor = (zoneName: string) => {
    if (emergencyMode || activeLayer === "Emergency") {
      return "#ef4444";
    }
    
    if (activeLayer === "Crowd") {
      if (zoneName.includes("Zone 2") || zoneName.includes("North")) return "#ef4444"; // bottleneck
      if (zoneName.includes("Zone 3") || zoneName.includes("East")) return "#f59e0b"; // moderate
      return "#10b981"; // nominal
    }
    if (activeLayer === "Security") return "#475569";
    if (activeLayer === "Parking") return "#1d4ed8";
    if (activeLayer === "Food") return "#ea580c";
    if (activeLayer === "CCTV") return "#0891b2";
    if (activeLayer === "Volunteers") return "#6d28d9";
    if (activeLayer === "Medical") return "#064e3b";
    if (activeLayer === "Waste") return "#78350f";
    if (activeLayer === "Transport") return "#4338ca";
    
    return "#1e293b";
  };

  const renderTier = (yOffset: number, rIn: number, rOut: number, h: number) => {
    const stands = [
      { name: "Zone 3 (East stands)", theta: -Math.PI / 4 },
      { name: "Zone 5 (South stands)", theta: Math.PI / 4 },
      { name: "Zone 4 (West stands)", theta: 3 * Math.PI / 4 },
      { name: "Zone 2 (Concourse North)", theta: 5 * Math.PI / 4 },
    ];

    return stands.map((st) => (
      <mesh key={st.name} position={[0, yOffset, 0]}>
        <cylinderGeometry
          args={[
            rOut, // radiusTop (outer)
            rIn,  // radiusBottom (inner)
            h,    // height
            16,   // segments
            1,    // height segments
            true, // open ended
            st.theta + 0.1,
            Math.PI / 2 - 0.2
          ]}
        />
        <meshStandardMaterial
          color={getStandColor(st.name)}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    ));
  };

  return (
    <group ref={groupRef}>
      {/* 1. Grass pitch with soccer boundaries */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[4.2, 2.8]} />
        <meshStandardMaterial color={activeLayer === "Emergency" ? "#7f1d1d" : "#14532d"} roughness={0.9} />
      </mesh>
      {/* Center ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.4, 0.43, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>

      {/* 2. Lower Bowl Seating Tier */}
      {renderTier(0.2, 2.0, 2.6, 0.4)}

      {/* 3. Upper Bowl Seating Tier */}
      {renderTier(0.55, 2.6, 3.2, 0.5)}
    </group>
  );
};

const TransitLoopMesh: React.FC = () => {
  const trainRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (trainRef.current) {
      const time = state.clock.getElapsedTime() * 0.18;
      const radius = 5.2;
      const x = Math.sin(time) * radius;
      const z = Math.cos(time) * radius;
      trainRef.current.position.set(x, 0.05, z);
      trainRef.current.rotation.y = time + Math.PI / 2;
    }
  });

  return (
    <group>
      {/* Circular rail line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[5.16, 5.24, 64]} />
        <meshBasicMaterial color="rgba(255,255,255,0.06)" />
      </mesh>
      {/* Moving 3-segment train */}
      <group ref={trainRef}>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.35, 0.08, 0.12]} />
          <meshStandardMaterial color="#06b6d4" emissive="#0891b2" roughness={0.2} />
        </mesh>
        <mesh position={[-0.4, 0.05, 0]}>
          <boxGeometry args={[0.32, 0.08, 0.12]} />
          <meshStandardMaterial color="#0891b2" roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};

const MedicalVehicleMesh: React.FC = () => {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = Math.sin(state.clock.getElapsedTime() * 15) > 0 ? 1.5 : 0;
    }
  });

  return (
    <group position={[-3.5, 0.05, 3.5]}>
      <mesh>
        <boxGeometry args={[0.4, 0.22, 0.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      <mesh position={[0.1, 0.02, 0.11]}>
        <boxGeometry args={[0.12, 0.04, 0.01]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      <pointLight ref={lightRef} position={[0, 0.2, 0]} color="#3b82f6" distance={2.0} decay={2.0} />
    </group>
  );
};

const ConcessionPlazaMesh: React.FC = () => {
  return (
    <group position={[3.5, 0.05, -3.5]}>
      <mesh>
        <boxGeometry args={[0.7, 0.15, 0.25]} />
        <meshStandardMaterial color="#475569" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.7, 0.02, 0.25]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0, 0.18, 0.1]}>
        <boxGeometry args={[0.5, 0.06, 0.02]} />
        <meshBasicMaterial color="#ea580c" />
      </mesh>
      <mesh position={[0.2, 0.05, 0.25]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={[-0.1, 0.05, 0.35]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
    </group>
  );
};

const RestroomPlazaMesh: React.FC = () => {
  return (
    <group position={[-3.5, 0.05, 3.5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.7, 0.5]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.1, -0.24]}>
        <boxGeometry args={[0.7, 0.2, 0.02]} />
        <meshStandardMaterial color="#475569" />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.02, 0.2, 0.48]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[-0.2, 0.05, 0.15]}>
        <boxGeometry args={[0.12, 0.08, 0.12]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.1} />
      </mesh>
      <mesh position={[0.2, 0.05, 0.15]}>
        <boxGeometry args={[0.12, 0.08, 0.12]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.1} />
      </mesh>
    </group>
  );
};

const SpectatorSeatingMesh: React.FC = () => {
  const spectators = [];
  const colors = ["#ef4444", "#3b82f6", "#ffffff", "#eab308", "#10b981", "#1e293b"];
  
  for (let r = 2.2; r <= 3.2; r += 0.3) {
    const height = r === 2.2 || r === 2.5 ? 0.32 : 0.72;
    const count = Math.floor(r * 22);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const angleMod = angle % (Math.PI / 2);
      if (angleMod > 0.15 && angleMod < (Math.PI / 2 - 0.15)) {
        spectators.push({
          position: [Math.cos(angle) * r, height + 0.03, Math.sin(angle) * r] as [number, number, number],
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
    }
  }
  
  return (
    <group>
      {spectators.map((spec, idx) => (
        <mesh key={idx} position={spec.position}>
          <sphereGeometry args={[0.022, 6, 6]} />
          <meshBasicMaterial color={spec.color} />
        </mesh>
      ))}
    </group>
  );
};

const VIPSuitesMesh: React.FC = () => {
  return (
    <group position={[-2.8, 0.65, 0]}>
      <mesh>
        <boxGeometry args={[0.3, 0.04, 1.8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>
      <mesh position={[0.14, 0.12, 0]}>
        <boxGeometry args={[0.01, 0.2, 1.8]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.3} />
      </mesh>
      <mesh position={[-0.08, 0.06, 0.4]}>
        <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.08, 0.06, -0.4]}>
        <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};

const ParkingLotMesh: React.FC = () => {
  const carCoords = [
    [-4.2, -4.2], [-4.6, -4.2], [-5.0, -4.2],
    [-4.2, -4.8], [-4.6, -4.8], [-5.0, -4.8],
    [-5.5, -4.2], [-5.9, -4.2], [-5.5, -4.8],
    [-3.8, -3.8], [-3.8, -4.4], [-3.8, -5.0]
  ];
  const carColors = ["#ef4444", "#3b82f6", "#ffffff", "#94a3b8", "#eab308"];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-4.8, 0.01, -4.5]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      {carCoords.map((coord, idx) => (
        <mesh key={idx} position={[coord[0], 0.06, coord[1]]}>
          <boxGeometry args={[0.22, 0.08, 0.12]} />
          <meshStandardMaterial color={carColors[idx % carColors.length]} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
};

const EntryGateCanopyMesh: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; label: string; queueCount: number }> = ({ position, rotation, label, queueCount }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* 1. Ground asphalt path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0.25]}>
        <planeGeometry args={[0.4, 0.5]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>
      
      {/* 2. Pillars */}
      {[-0.18, 0.18].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.1, -0.1]}>
            <cylinderGeometry args={[0.01, 0.01, 0.2, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
          <mesh position={[x, 0.1, 0.1]}>
            <cylinderGeometry args={[0.01, 0.01, 0.2, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* 3. Roof Canopy */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.42, 0.015, 0.28]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* 4. Glowing signboard */}
      <mesh position={[0, 0.225, 0.135]}>
        <boxGeometry args={[0.26, 0.04, 0.01]} />
        <meshBasicMaterial color={queueCount > 100 ? "#ef4444" : "#10b981"} />
      </mesh>

      {/* 5. Mini turnstiles */}
      {[-0.1, 0.1].map((tx, idx) => (
        <mesh key={idx} position={[tx, 0.04, 0]}>
          <boxGeometry args={[0.06, 0.08, 0.06]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
      ))}

      {/* 6. Static Queue Fan particles */}
      {Array.from({ length: Math.min(6, Math.ceil(queueCount / 10)) }).map((_, fIdx) => {
        const offsetZ = 0.22 + fIdx * 0.1;
        const offsetX = (Math.sin(fIdx) * 0.05);
        return (
          <mesh key={fIdx} position={[offsetX, 0.04, offsetZ]}>
            <sphereGeometry args={[0.032, 8, 8]} />
            <meshBasicMaterial color={queueCount > 100 ? "#ef4444" : "#3b82f6"} />
          </mesh>
        );
      })}
    </group>
  );
};

// 4 Floodlights
const FloodlightTowers: React.FC<{ activeLayer: string }> = ({ activeLayer }) => {
  return (
    <group>
      {[[4.0, -3.2], [-4.0, -3.2], [4.0, 3.2], [-4.0, 3.2]].map(([tx, tz], i) => (
        <group key={i} position={[tx, 0, tz]}>
          <mesh>
            <cylinderGeometry args={[0.04, 0.06, 1.8, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[0.3, 0.15, 0.1]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          <mesh position={[-tx * 0.15, 0.4, -tz * 0.15]} rotation={[0.4, 0, 0]}>
            <coneGeometry args={[0.4, 1.2, 16, 1, true]} />
            <meshBasicMaterial
              color={activeLayer === "Emergency" ? "#ef4444" : activeLayer === "CCTV" ? "#06b6d4" : "#22d3ee"}
              transparent
              opacity={0.12}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// 3D Clickable Glowing Hotspots representing gates/facilities
const HotspotMarker: React.FC<{
  name: string;
  position: [number, number, number];
  onSelect: (name: string) => void;
  selected: boolean;
}> = ({ name, position, onSelect, selected }) => {
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: any) => {
    e.stopPropagation();
    playBeep();
    onSelect(name);
  };

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  return (
    <group position={position}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerDown={handleClick}
      >
        <sphereGeometry args={[selected ? 0.15 : 0.08, 16, 16]} />
        <meshBasicMaterial color={selected ? "#06b6d4" : hovered ? "#eab308" : "#8b5cf6"} />
      </mesh>
      <mesh scale={[1.4, 1.4, 1.4]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial
          color={selected ? "#06b6d4" : "#8b5cf6"}
          wireframe
          opacity={selected || hovered ? 0.6 : 0.15}
          transparent
        />
      </mesh>
    </group>
  );
};

// Camera Controller translating viewport
const CameraController: React.FC<{ selectedHotspot: string | null; droneScanMode: boolean }> = ({ selectedHotspot, droneScanMode }) => {
  useFrame((state) => {
    if (droneScanMode) {
      const time = state.clock.getElapsedTime();
      const radius = 9.0;
      const hx = Math.sin(time * 0.2) * radius;
      const hz = Math.cos(time * 0.2) * radius;
      state.camera.position.set(hx, 4.0, hz);
      state.camera.lookAt(0, 0, 0);
      return;
    }

    const config = hotspotCoords[selectedHotspot || "Default"] || hotspotCoords.Default;
    const [cx, cy, cz] = config.cam;
    const [lx, ly, lz] = config.look;

    state.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.05);
    state.camera.lookAt(new THREE.Vector3(lx, ly, lz));
  });

  return null;
};

export const DigitalTwin: React.FC<DigitalTwinProps> = ({
  venueState,
  incidents,
  selectedHotspot,
  emergencyMode,
  heatmapMode,
  droneScanMode,
  onSelectHotspot
}) => {
  const [mounted, setMounted] = useState(false);
  const [activeLayer, setActiveLayer] = useState<string>("Crowd");
  const [layersCollapsed, setLayersCollapsed] = useState<boolean>(true);
  const { wheelchairMode } = useAccessibility();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync parent props to local layer status
  useEffect(() => {
    if (emergencyMode) {
      setActiveLayer("Emergency");
    } else if (heatmapMode) {
      setActiveLayer("Crowd");
    }
  }, [emergencyMode, heatmapMode]);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-slate-950/40 rounded-xl flex items-center justify-center text-xs text-gray-500">
        Initializing 3D Stadium OS Twin...
      </div>
    );
  }

  const getIncidentPosition = (location: string): [number, number, number] | null => {
    const loc = location.toLowerCase();
    if (loc.includes("gate c")) return [4.2, 0.8, 1.5];
    if (loc.includes("gate a")) return [0, 0.8, -4];
    if (loc.includes("zone 3") || loc.includes("east")) return [3.8, 0.8, -1];
    if (loc.includes("zone 4") || loc.includes("west")) return [-3.8, 0.8, 2];
    return [0, 0.8, 0];
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden bg-[#07080c] border border-white/5 shadow-2xl flex flex-col md:flex-row min-h-[460px]">
      
      {/* 3D WebGL Canvas Rendering */}
      <div className="flex-1 w-full h-full min-h-[450px]">
        <Canvas camera={{ position: [8.5, 6.0, 8.5], fov: 40 }}>
          <ambientLight intensity={(emergencyMode || activeLayer === "Emergency") ? 0.35 : 0.6} />
          <directionalLight
            position={[10, 15, 10]}
            intensity={1.25}
            color={(emergencyMode || activeLayer === "Emergency") ? "#ef4444" : "#ffffff"}
          />

          <CameraController selectedHotspot={selectedHotspot} droneScanMode={droneScanMode} />

          <StadiumMesh
            venueState={venueState}
            emergencyMode={emergencyMode || activeLayer === "Emergency"}
            heatmapMode={heatmapMode || activeLayer === "Crowd"}
            activeLayer={activeLayer}
          />

          <FloodlightTowers activeLayer={activeLayer} />

          {/* Conditional rain particle system */}
          {(activeLayer === "Weather" || activeLayer === "Micro Weather") && <WeatherRainParticles />}

          {/* Dynamic spectators particles */}
          <FanParticles count={activeLayer === "Emergency" ? 100 : 350} emergencyMode={emergencyMode} activeLayer={activeLayer} />

          <FootballMatchSimulation />

          <TransitLoopMesh />
          <MedicalVehicleMesh />
          <ConcessionPlazaMesh />
          <VIPSuitesMesh />
          <ParkingLotMesh />
          <RestroomPlazaMesh />
          <SpectatorSeatingMesh />

          {/* 3D Entry Gate turnstile canopies with live waiting queues */}
          <EntryGateCanopyMesh
            position={[0, 0.01, -3.9]}
            rotation={[0, 0, 0]}
            label="Gate A"
            queueCount={venueState?.gate_status["Gate A"]?.queue_length || 15}
          />
          <EntryGateCanopyMesh
            position={[0, 0.01, 3.9]}
            rotation={[0, Math.PI, 0]}
            label="Gate B"
            queueCount={venueState?.gate_status["Gate B"]?.queue_length || 22}
          />
          <EntryGateCanopyMesh
            position={[3.9, 0.01, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            label="Gate C"
            queueCount={venueState?.gate_status["Gate C"]?.queue_length || 12}
          />
          <EntryGateCanopyMesh
            position={[3.9, 0.01, 0.8]}
            rotation={[0, -Math.PI / 2, 0]}
            label="Gate C2"
            queueCount={venueState?.gate_status["Gate C2"]?.queue_length || 0}
          />

          {/* Drones hovering */}
          <DroneMesh position={[-2.0, 2.0, 2.0]} />
          <DroneMesh position={[2.2, 2.2, -1.8]} />

          {/* CCTV Dome Camera installations */}
          <CCTVCameraMesh position={[4.0, 0.8, -3.0]} rotation={[0, -Math.PI / 4, 0]} showFrustum={activeLayer === "CCTV" || activeLayer === "CCTV Vision AI"} />
          <CCTVCameraMesh position={[-4.0, 0.8, 3.0]} rotation={[0, Math.PI * 0.75, 0]} showFrustum={activeLayer === "CCTV" || activeLayer === "CCTV Vision AI"} />

          {/* Layer-Specific Pin Visualizers */}
          {(activeLayer === "Medical" || activeLayer === "Medical Bays") && (
            <group>
              {/* Medical Pin 1 */}
              <mesh position={[3.0, 0.25, -2.5]}>
                <boxGeometry args={[0.15, 0.15, 0.15]} />
                <meshBasicMaterial color="#10b981" />
              </mesh>
              {/* Medical Pin 2 */}
              <mesh position={[-3.0, 0.25, 2.5]}>
                <boxGeometry args={[0.15, 0.15, 0.15]} />
                <meshBasicMaterial color="#10b981" />
              </mesh>
            </group>
          )}

          {(activeLayer === "Waste" || activeLayer === "Waste Management") && (
            <group>
              {/* Bin 1 */}
              <mesh position={[-1.5, 0.1, -3.0]}>
                <cylinderGeometry args={[0.06, 0.06, 0.15, 8]} />
                <meshBasicMaterial color="#78350f" />
              </mesh>
              {/* Bin 2 */}
              <mesh position={[2.5, 0.1, 2.5]}>
                <cylinderGeometry args={[0.06, 0.06, 0.15, 8]} />
                <meshBasicMaterial color="#ef4444" /> {/* Full bin */}
              </mesh>
            </group>
          )}

          {/* Wheelchair accessible path indicator overlays */}
          {wheelchairMode && (
            <group>
              <mesh position={[-2.2, 0.05, 0.5]}><boxGeometry args={[1.5, 0.02, 0.15]} /><meshBasicMaterial color="#06b6d4" /></mesh>
              <mesh position={[-2.2, 0.05, -0.5]}><boxGeometry args={[1.5, 0.02, 0.15]} /><meshBasicMaterial color="#06b6d4" /></mesh>
              <mesh position={[2.2, 0.05, 0.5]}><boxGeometry args={[1.5, 0.02, 0.15]} /><meshBasicMaterial color="#06b6d4" /></mesh>
            </group>
          )}

          {activeLayer === "Volunteers" && (
            <group>
              <mesh position={[0.5, 0.08, -3.2]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#10b981" /></mesh>
              <mesh position={[3.2, 0.08, 0.4]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#10b981" /></mesh>
              <mesh position={[-2.8, 0.08, -1.2]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#10b981" /></mesh>
              <mesh position={[-0.8, 0.08, 2.8]}><sphereGeometry args={[0.04, 8, 8]} /><meshBasicMaterial color="#10b981" /></mesh>
            </group>
          )}

          {activeLayer === "Emergency" && (
            <group>
              <Line points={[[0, 0.05, 0], [0, 0.05, -3.8]]} color="#22c55e" lineWidth={2} />
              <Line points={[[0, 0.05, 0], [0, 0.05, 3.8]]} color="#22c55e" lineWidth={2} />
              <Line points={[[0, 0.05, 0], [3.8, 0.05, 0]]} color="#22c55e" lineWidth={2} />
              <Line points={[[0, 0.05, 0], [-3.8, 0.05, 0]]} color="#22c55e" lineWidth={2} />
            </group>
          )}

          {activeLayer === "Parking" && (
            <group>
              <mesh position={[-4.8, 0.5, -4.5]}>
                <boxGeometry args={[0.5, 0.12, 0.01]} />
                <meshBasicMaterial color="#eab308" />
              </mesh>
            </group>
          )}

          {activeLayer === "Food" && (
            <group>
              <mesh position={[3.5, 0.4, -3.5]}>
                <boxGeometry args={[0.4, 0.1, 0.01]} />
                <meshBasicMaterial color="#ea580c" />
              </mesh>
            </group>
          )}

          {activeLayer === "Security" && (
            <group>
              <mesh position={[0, 0.35, -3.9]}><boxGeometry args={[0.3, 0.08, 0.01]} /><meshBasicMaterial color="#06b6d4" /></mesh>
              <mesh position={[0, 0.35, 3.9]}><boxGeometry args={[0.3, 0.08, 0.01]} /><meshBasicMaterial color="#06b6d4" /></mesh>
              <mesh position={[3.9, 0.35, 0]}><boxGeometry args={[0.01, 0.08, 0.3]} /><meshBasicMaterial color="#06b6d4" /></mesh>
            </group>
          )}

          {/* Clickable Hotspots */}
          <HotspotMarker name="Gate A" position={[0, 0.2, -4.2]} onSelect={onSelectHotspot} selected={selectedHotspot === "Gate A"} />
          <HotspotMarker name="Gate C" position={[4.6, 0.2, 0]} onSelect={onSelectHotspot} selected={selectedHotspot === "Gate C"} />
          <HotspotMarker name="Concourse Restrooms" position={[-3.8, 0.2, 0]} onSelect={onSelectHotspot} selected={selectedHotspot === "Concourse Restrooms"} />
          <HotspotMarker name="Parking Lot" position={[-5.5, 0.1, -4.0]} onSelect={onSelectHotspot} selected={selectedHotspot === "Parking Lot"} />
          <HotspotMarker name="Match Pitch" position={[0, 0.05, 0]} onSelect={onSelectHotspot} selected={selectedHotspot === "Match Pitch"} />
          <HotspotMarker name="VIP Suites" position={[0, 0.8, -1.5]} onSelect={onSelectHotspot} selected={selectedHotspot === "VIP Suites"} />
          <HotspotMarker name="Player Tunnel" position={[-2.0, 0.05, -2.0]} onSelect={onSelectHotspot} selected={selectedHotspot === "Player Tunnel"} />

          {/* 3D Incident indicators */}
          {incidents
            .filter((inc) => inc.status !== "resolved")
            .map((inc) => {
              const pos = getIncidentPosition(inc.location);
              return pos ? <IncidentMarker key={inc.id} position={pos} /> : null;
            })}

          <OrbitControls
            enableZoom={true}
            maxPolarAngle={Math.PI / 2.1}
            minDistance={3}
            maxDistance={18}
            enabled={!selectedHotspot && !droneScanMode}
          />
          
          <Grid cellColor="#1e293b" sectionColor="#0f172a" infiniteGrid fadeDistance={25} />
        </Canvas>
      </div>

      {/* Floating HUD Legends */}
      <div className="absolute bottom-4 left-4 bg-slate-950/85 border border-white/10 rounded-xl p-3.5 text-[8px] text-gray-400 space-y-1 backdrop-blur-md pointer-events-none font-mono max-w-[200px]">
        <span className="font-bold text-white uppercase tracking-wider block mb-0.5">
          🛰️ Layer: {activeLayer}
        </span>
        
        {activeLayer === "Crowd Flow" && <p className="text-red-400">Bottlenecks detected at Gate C queues.</p>}
        {activeLayer === "Parking Lots" && <p className="text-amber-400">Lot C 92% capacity. Recommend detour Lot B.</p>}
        {activeLayer === "Food Courts" && <p className="text-orange-400">Food concession queues: nominal (3 min wait).</p>}
        {activeLayer === "Security Gates" && <p className="text-cyan-400">Canopy turnstiles online: Gates A, B, C, C2.</p>}
        {activeLayer === "Volunteers Map" && <p className="text-emerald-400">Steward volunteers active: 12 marshals deployed.</p>}
        {activeLayer === "Medical Bays" && <p className="text-emerald-400">Ambulance vehicle standby at Medical Bay.</p>}
        {activeLayer === "Micro Weather" && <p className="text-sky-400">Local weather radar: Temp 74F, Light Rain.</p>}
        {activeLayer === "Transit Lines" && <p className="text-cyan-300">Metro Train loop active. Segment speed: 45km/h.</p>}
        {activeLayer === "Waste Management" && <p className="text-amber-600">Bin Section 102 full: dispatching steward.</p>}
        {activeLayer === "Emergency Exits" && <p className="text-green-400">Evacuation routes illuminated green.</p>}
        {activeLayer === "CCTV Vision AI" && <p className="text-cyan-400">CCTV frustums active: 642 channels feeding core.</p>}
        
        <div className="pt-1.5 space-y-0.5 border-t border-white/5 mt-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded bg-[#8b5cf6]" /> Clickable Asset Pins
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded bg-blue-500" /> Blue Sphere (Staff/Players)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded bg-red-500" /> Red Sphere (Fans/Players)
          </div>
        </div>
      </div>

      {/* Collapsible Sensor Layers Panel (Floating sidebar over 3D twin) */}
      {layersCollapsed ? (
        <div className="absolute top-4 left-4 z-40 flex flex-col items-start gap-1 font-mono pointer-events-auto">
          <button
            onClick={() => {
              playBeep();
              setLayersCollapsed(false);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-950/95 border border-cyan-500/30 hover:border-cyan-400 text-[10px] font-bold text-cyan-400 flex items-center gap-2 shadow-lg backdrop-blur-md cursor-pointer transition-all border-none"
          >
            <span className="animate-pulse text-xs">📡</span> SENSOR LAYERS (11)
          </button>
        </div>
      ) : (
        <div className="absolute top-4 left-4 z-40 max-h-[380px] overflow-y-auto w-56 rounded-2xl bg-slate-950/95 border border-cyan-500/30 p-3.5 space-y-2.5 shadow-2xl backdrop-blur-md pointer-events-auto font-mono text-[9px] text-gray-300">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="animate-pulse">📡</span> SENSOR LAYERS
            </span>
            <button
              onClick={() => {
                playBeep();
                setLayersCollapsed(true);
              }}
              className="text-gray-500 hover:text-white text-[10px] cursor-pointer bg-transparent border-none"
            >
              Close
            </button>
          </div>
          <div className="space-y-1">
            {layersList.map((layer) => {
              const isActive = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => {
                    playBeep();
                    setActiveLayer(layer.id);
                    if (layer.id === "Parking") onSelectHotspot("Parking Lot");
                    else if (layer.id === "Food") onSelectHotspot("Concourse Restrooms");
                    else if (layer.id === "Security") onSelectHotspot("Gate C");
                    else if (layer.id === "Medical") onSelectHotspot("Player Tunnel");
                  }}
                  className={`w-full text-left p-2 rounded-lg text-[9px] font-bold transition-all border-none cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? "bg-cyan-500 text-slate-950 shadow-md"
                      : "bg-slate-900/50 hover:bg-slate-900 text-gray-300"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-slate-950" : "bg-gray-500"}`} />
                  <span>{layer.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(selectedHotspot || droneScanMode) && (
        <button
          onClick={() => {
            playBeep();
            onSelectHotspot("Default");
          }}
          className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 hover:border-white/20 text-xs font-bold text-gray-300 hover:text-white cursor-pointer transition-all border-none pointer-events-auto"
        >
          Reset Camera Zoom
        </button>
      )}
    </div>
  );
};

export default DigitalTwin;
