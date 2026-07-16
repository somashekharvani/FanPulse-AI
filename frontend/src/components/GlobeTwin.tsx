"use client";

import React, { useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import { playBeep } from "@/utils/audio";

interface CityPin {
  name: string;
  lat: number;
  lon: number;
  status: "nominal" | "heavy" | "critical";
  position: [number, number, number];
}

interface GlobeTwinProps {
  onZoomComplete: (cityName: string) => void;
  flagshipCity?: string;
  onShowToast?: (message: string) => void;
}

// Convert Lat/Lon coordinates to 3D Sphere coordinates
function latLonToVector3(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.sin(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.cos(theta);

  return [x, y, z];
}

const citiesData: Omit<CityPin, "position">[] = [
  { name: "Dallas", lat: 32.7767, lon: -96.797, status: "heavy" },
  { name: "Toronto", lat: 43.6532, lon: -79.3832, status: "nominal" },
  { name: "Mexico City", lat: 19.4326, lon: -99.1332, status: "nominal" },
  { name: "Los Angeles", lat: 34.0522, lon: -118.2437, status: "nominal" },
  { name: "Atlanta", lat: 33.749, lon: -84.388, status: "nominal" },
  { name: "New York", lat: 40.7128, lon: -74.006, status: "nominal" },
  { name: "Vancouver", lat: 49.2827, lon: -123.1207, status: "nominal" },
  { name: "Miami", lat: 25.7617, lon: -80.1918, status: "nominal" }
];

const radius = 3.0;
const pins: CityPin[] = citiesData.map(c => ({
  ...c,
  position: latLonToVector3(c.lat, c.lon, radius)
}));

// Earth Spherical Grid Mesh
const EarthGlobe: React.FC<{ selectedCity: string | null }> = ({ selectedCity }) => {
  const globeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (globeRef.current && !selectedCity) {
      globeRef.current.rotation.y = state.clock.getElapsedTime() * 0.04;
    }
  });

  return (
    <group ref={globeRef}>
      <mesh>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color="#0e7490" wireframe opacity={0.12} transparent />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius - 0.05, 16, 16]} />
        <meshBasicMaterial color="#0b0f19" opacity={0.65} transparent />
      </mesh>
      <gridHelper args={[radius * 2, 24, "#0891b2", "#115e59"]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} />
    </group>
  );
};

// Holographic network arcs connecting nodes
const NetworkArcs: React.FC = () => {
  return (
    <group>
      {pins.map((pin, index) => {
        const nextPin = pins[(index + 1) % pins.length];
        return (
          <Line
            key={index}
            points={[pin.position, nextPin.position]}
            color="#06b6d4"
            lineWidth={0.5}
            opacity={0.3}
            transparent
          />
        );
      })}
    </group>
  );
};

// 3D City Marker Pins
const CityMarker: React.FC<{
  pin: CityPin;
  onSelect: (name: string) => void;
  isZooming: boolean;
}> = ({ pin, onSelect, isZooming }) => {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1.0 + Math.sin(state.clock.getElapsedTime() * 6) * 0.15;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  const getMarkerColor = () => {
    if (pin.status === "critical") return "#ef4444";
    if (pin.status === "heavy") return "#f57c00";
    return "#10b981";
  };

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (isZooming) return;
    playBeep();
    onSelect(pin.name);
  };

  useEffect(() => {
    document.body.style.cursor = hovered && !isZooming ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered, isZooming]);

  return (
    <group position={pin.position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onPointerDown={handlePointerDown}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={getMarkerColor()} />
      </mesh>
      <mesh scale={[1.4, 1.4, 1.4]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial color={getMarkerColor()} wireframe opacity={hovered ? 0.6 : 0.25} transparent />
      </mesh>
    </group>
  );
};

export const GlobeTwin: React.FC<GlobeTwinProps> = ({
  onZoomComplete,
  flagshipCity = "Dallas",
  onShowToast
}) => {
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<[number, number, number]>([8, 6, 8]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelectCity = (cityName: string) => {
    const interactiveCities = ["dallas", "toronto", "mexico city", "vancouver", "miami"];
    const isInteractive = interactiveCities.includes(cityName.toLowerCase());
    
    if (!isInteractive) {
      if (onShowToast) {
        onShowToast(`Establishing Link: ${cityName} coming soon for Group Stage Day 3.`);
      }
      return;
    }

    setSelectedCity(cityName);
    const targetPin = pins.find(p => p.name === cityName);
    if (targetPin) {
      const [tx, ty, tz] = targetPin.position;
      setCameraTarget([tx * 2.2, ty * 2.2, tz * 2.2]);
      
      setTimeout(() => {
        onZoomComplete(cityName);
      }, 1500);
    }
  };

  const CameraController: React.FC = () => {
    useFrame((state) => {
      if (selectedCity) {
        state.camera.position.lerp(new THREE.Vector3(...cameraTarget), 0.05);
        state.camera.lookAt(0, 0, 0);
      }
    });
    return null;
  };

  if (!mounted) {
    return (
      <div className="w-full h-full bg-slate-950/20 rounded-xl flex items-center justify-center text-xs text-gray-500">
        Initializing 3D World Model Globe...
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[450px] relative rounded-3xl overflow-hidden bg-slate-950/80 border border-white/5 shadow-2xl">
      <Canvas camera={{ position: [7, 5, 7], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 10, 5]} intensity={1.2} />

        <EarthGlobe selectedCity={selectedCity} />
        <NetworkArcs />

        <CameraController />

        {pins.map((pin) => (
          <CityMarker
            key={pin.name}
            pin={pin}
            onSelect={handleSelectCity}
            isZooming={!!selectedCity}
          />
        ))}

        {!selectedCity && (
          <OrbitControls
            enableZoom={true}
            minDistance={4}
            maxDistance={12}
            autoRotate
            autoRotateSpeed={0.4}
          />
        )}
      </Canvas>

      {/* Floating HUD */}
      <div className="absolute top-4 left-4 bg-slate-950/80 border border-white/10 rounded-xl p-4 text-[10px] text-gray-400 space-y-2 backdrop-blur-md pointer-events-none">
        <span className="font-bold text-white uppercase tracking-wider block">Global Stadium Matrix</span>
        <div className="space-y-1.5 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Toronto: <strong>NOMINAL</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Mexico City: <strong>NOMINAL</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>{flagshipCity}: <strong>ACTIVE HOST</strong></span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-4 bg-slate-950/80 border border-white/10 rounded-xl p-3 text-[9px] text-cyan-400 font-mono backdrop-blur-md pointer-events-none">
        Click any Flagship Pin to Zoom & Deploy
      </div>
    </div>
  );
};

export default GlobeTwin;
