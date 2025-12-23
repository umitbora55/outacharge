"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Zap, Battery, Clock, Star, X, Navigation } from "lucide-react";
import Link from "next/link";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const stations = [
  {
    id: 1,
    name: "ZES Ankara Kizilay",
    lat: 39.9208,
    lng: 32.8541,
    operator: "ZES",
    power: "60 kW DC",
    status: "active",
    reliability: 94,
    connectors: ["CCS", "CHAdeMO"],
    price: "8.99 TL/kWh",
    lastReport: "10 dk once",
  },
  {
    id: 2,
    name: "Esarj Ankara Cankaya",
    lat: 39.9035,
    lng: 32.8597,
    operator: "Esarj",
    power: "120 kW DC",
    status: "active",
    reliability: 87,
    connectors: ["CCS"],
    price: "9.49 TL/kWh",
    lastReport: "25 dk once",
  },
  {
    id: 3,
    name: "Trugo Ankara Ulus",
    lat: 39.9412,
    lng: 32.8543,
    operator: "Trugo",
    power: "22 kW AC",
    status: "broken",
    reliability: 45,
    connectors: ["Type 2"],
    price: "7.99 TL/kWh",
    lastReport: "2 saat once",
  },
  {
    id: 4,
    name: "ZES Ankara Tunali",
    lat: 39.9105,
    lng: 32.8642,
    operator: "ZES",
    power: "90 kW DC",
    status: "busy",
    reliability: 91,
    connectors: ["CCS", "CHAdeMO"],
    price: "8.99 TL/kWh",
    lastReport: "5 dk once",
  },
  {
    id: 5,
    name: "Voltrun Ankara Bahcelievler",
    lat: 39.9256,
    lng: 32.8234,
    operator: "Voltrun",
    power: "180 kW DC",
    status: "active",
    reliability: 96,
    connectors: ["CCS"],
    price: "10.49 TL/kWh",
    lastReport: "3 dk once",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "#10b981";
    case "busy":
      return "#eab308";
    case "broken":
      return "#ef4444";
    default:
      return "#6b7280";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "active":
      return "Musait";
    case "busy":
      return "Dolu";
    case "broken":
      return "Arizali";
    default:
      return "Bilinmiyor";
  }
};

export default function HaritaPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedStation, setSelectedStation] = useState<typeof stations[0] | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [32.8541, 39.9208],
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    stations.forEach((station) => {
      const el = document.createElement("div");
      el.className = "marker";
      el.style.width = "36px";
      el.style.height = "36px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = getStatusColor(station.status);
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.cursor = "pointer";
      el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;

      el.addEventListener("click", () => {
        setSelectedStation(station);
        map.current?.flyTo({
          center: [station.lng, station.lat],
          zoom: 15,
        });
      });

      new mapboxgl.Marker(el)
        .setLngLat([station.lng, station.lat])
        .addTo(map.current!);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  return (
    <div className="h-screen w-full relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-emerald-400" />
            Outa<span className="text-emerald-400">Charge</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 text-sm text-white">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                Musait
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                Dolu
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Arizali
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Station Detail Panel */}
      {selectedStation && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:top-20 md:bottom-auto md:w-80 z-20">
          <div className="bg-slate-800 text-white p-4 rounded-xl shadow-xl">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg">{selectedStation.name}</h3>
                <p className="text-slate-400 text-sm">{selectedStation.operator}</p>
              </div>
              <button
                onClick={() => setSelectedStation(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span 
                className="px-2 py-1 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: getStatusColor(selectedStation.status) }}
              >
                {getStatusText(selectedStation.status)}
              </span>
              <span className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-yellow-400" />
                %{selectedStation.reliability} Guvenilirlik
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-emerald-400" />
                <span>{selectedStation.power}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>{selectedStation.connectors.join(", ")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Son rapor: {selectedStation.lastReport}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
              <span className="font-bold text-emerald-400">{selectedStation.price}</span>
              <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Yol Tarifi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Station List */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 p-4 md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-medium">{stations.length} istasyon bulundu</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stations.map((station) => (
            <div
              key={station.id}
              onClick={() => {
                setSelectedStation(station);
                map.current?.flyTo({
                  center: [station.lng, station.lat],
                  zoom: 15,
                });
              }}
              className="flex-shrink-0 bg-slate-800 rounded-xl p-3 min-w-[200px] cursor-pointer hover:bg-slate-700 transition"
            >
              <div className="flex items-center gap-2 mb-1">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getStatusColor(station.status) }}
                ></span>
                <span className="text-white font-medium text-sm truncate">{station.name}</span>
              </div>
              <div className="text-slate-400 text-xs">{station.power} - {station.price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}