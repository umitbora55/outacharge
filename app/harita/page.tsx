"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Zap, Battery, Clock, Star, X, Navigation, Locate, Filter, ChevronDown } from "lucide-react";
import Link from "next/link";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const stations = [
  {
    id: 1,
    name: "ZES Ankara Kızılay",
    lat: 39.9208,
    lng: 32.8541,
    operator: "ZES",
    power: 60,
    powerType: "DC",
    status: "active",
    reliability: 94,
    connectors: ["CCS", "CHAdeMO"],
    price: "8.99 TL/kWh",
    lastReport: "10 dk önce",
  },
  {
    id: 2,
    name: "Eşarj Ankara Çankaya",
    lat: 39.9035,
    lng: 32.8597,
    operator: "Eşarj",
    power: 120,
    powerType: "DC",
    status: "active",
    reliability: 87,
    connectors: ["CCS"],
    price: "9.49 TL/kWh",
    lastReport: "25 dk önce",
  },
  {
    id: 3,
    name: "Trugo Ankara Ulus",
    lat: 39.9412,
    lng: 32.8543,
    operator: "Trugo",
    power: 22,
    powerType: "AC",
    status: "broken",
    reliability: 45,
    connectors: ["Type 2"],
    price: "7.99 TL/kWh",
    lastReport: "2 saat önce",
  },
  {
    id: 4,
    name: "ZES Ankara Tunalı",
    lat: 39.9105,
    lng: 32.8642,
    operator: "ZES",
    power: 90,
    powerType: "DC",
    status: "busy",
    reliability: 91,
    connectors: ["CCS", "CHAdeMO"],
    price: "8.99 TL/kWh",
    lastReport: "5 dk önce",
  },
  {
    id: 5,
    name: "Voltrun Ankara Bahçelievler",
    lat: 39.9256,
    lng: 32.8234,
    operator: "Voltrun",
    power: 180,
    powerType: "DC",
    status: "active",
    reliability: 96,
    connectors: ["CCS"],
    price: "10.49 TL/kWh",
    lastReport: "3 dk önce",
  },
  {
    id: 6,
    name: "Sharz Ankara Kavaklıdere",
    lat: 39.8985,
    lng: 32.8612,
    operator: "Sharz",
    power: 22,
    powerType: "AC",
    status: "active",
    reliability: 78,
    connectors: ["Type 2"],
    price: "6.99 TL/kWh",
    lastReport: "1 saat önce",
  },
  {
    id: 7,
    name: "Eşarj Ankara Gaziosmanpaşa",
    lat: 39.8756,
    lng: 32.8534,
    operator: "Eşarj",
    power: 60,
    powerType: "DC",
    status: "active",
    reliability: 82,
    connectors: ["CCS", "CHAdeMO"],
    price: "9.49 TL/kWh",
    lastReport: "15 dk önce",
  },
];

const operators = ["Tümü", "ZES", "Eşarj", "Trugo", "Voltrun", "Sharz"];
const powerTypes = ["Tümü", "AC", "DC"];
const powerLevels = [
  { label: "Tümü", min: 0, max: 999 },
  { label: "22 kW ve altı", min: 0, max: 22 },
  { label: "23-60 kW", min: 23, max: 60 },
  { label: "61-120 kW", min: 61, max: 120 },
  { label: "120 kW üzeri", min: 121, max: 999 },
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
      return "Müsait";
    case "busy":
      return "Dolu";
    case "broken":
      return "Arızalı";
    default:
      return "Bilinmiyor";
  }
};

export default function HaritaPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [selectedStation, setSelectedStation] = useState<typeof stations[0] | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filterOperator, setFilterOperator] = useState("Tümü");
  const [filterPowerType, setFilterPowerType] = useState("Tümü");
  const [filterPowerLevel, setFilterPowerLevel] = useState(powerLevels[0]);
  const [filterOnlyAvailable, setFilterOnlyAvailable] = useState(false);

  const filteredStations = stations.filter((station) => {
    if (filterOperator !== "Tümü" && station.operator !== filterOperator) return false;
    if (filterPowerType !== "Tümü" && station.powerType !== filterPowerType) return false;
    if (station.power < filterPowerLevel.min || station.power > filterPowerLevel.max) return false;
    if (filterOnlyAvailable && station.status !== "active") return false;
    return true;
  });

  const locateUser = () => {
    if (!navigator.geolocation) {
      alert("Tarayıcınız konum özelliğini desteklemiyor.");
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (map.current) {
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 14,
          });

          if (userMarker.current) {
            userMarker.current.setLngLat([longitude, latitude]);
          } else {
            const el = document.createElement("div");
            el.className = "user-marker";
            el.style.width = "20px";
            el.style.height = "20px";
            el.style.borderRadius = "50%";
            el.style.backgroundColor = "#3b82f6";
            el.style.border = "3px solid white";
            el.style.boxShadow = "0 2px 10px rgba(59,130,246,0.5)";

            userMarker.current = new mapboxgl.Marker(el)
              .setLngLat([longitude, latitude])
              .addTo(map.current);
          }
        }
        setLocatingUser(false);
      },
      (error) => {
        console.error("Konum alınamadı:", error);
        alert("Konum alınamadı. Lütfen konum izni verin.");
        setLocatingUser(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const updateMarkers = () => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!map.current) return;

    filteredStations.forEach((station) => {
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

      const marker = new mapboxgl.Marker(el)
        .setLngLat([station.lng, station.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [32.8541, 39.9208],
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      updateMarkers();
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (map.current) {
      updateMarkers();
    }
  }, [filterOperator, filterPowerType, filterPowerLevel, filterOnlyAvailable]);

  const openDirections = (station: typeof stations[0]) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    window.open(url, "_blank");
  };

  const activeFilterCount = [
    filterOperator !== "Tümü",
    filterPowerType !== "Tümü",
    filterPowerLevel.label !== "Tümü",
    filterOnlyAvailable,
  ].filter(Boolean).length;

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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                showFilters || activeFilterCount > 0
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-700 text-white hover:bg-slate-600"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtre
              {activeFilterCount > 0 && (
                <span className="bg-white text-emerald-500 px-2 py-0.5 rounded-full text-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="hidden sm:flex items-center gap-4 text-sm text-white">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                Müsait
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                Dolu
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Arızalı
              </span>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="border-t border-slate-700 bg-slate-800/95 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Operator Filter */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Operatör</label>
                  <div className="relative">
                    <select
                      value={filterOperator}
                      onChange={(e) => setFilterOperator(e.target.value)}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer"
                    >
                      {operators.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Power Type Filter */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Şarj Tipi</label>
                  <div className="relative">
                    <select
                      value={filterPowerType}
                      onChange={(e) => setFilterPowerType(e.target.value)}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer"
                    >
                      {powerTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Power Level Filter */}
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Güç Seviyesi</label>
                  <div className="relative">
                    <select
                      value={filterPowerLevel.label}
                      onChange={(e) => {
                        const level = powerLevels.find((l) => l.label === e.target.value);
                        if (level) setFilterPowerLevel(level);
                      }}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer"
                    >
                      {powerLevels.map((level) => (
                        <option key={level.label} value={level.label}>{level.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Only Available Filter */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterOnlyAvailable}
                      onChange={(e) => setFilterOnlyAvailable(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-white text-sm">Sadece müsait</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                <span className="text-slate-400 text-sm">
                  {filteredStations.length} istasyon bulundu
                </span>
                <button
                  onClick={() => {
                    setFilterOperator("Tümü");
                    setFilterPowerType("Tümü");
                    setFilterPowerLevel(powerLevels[0]);
                    setFilterOnlyAvailable(false);
                  }}
                  className="text-emerald-400 text-sm hover:text-emerald-300 transition"
                >
                  Filtreleri Temizle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Locate User Button */}
      <button
        onClick={locateUser}
        disabled={locatingUser}
        className="absolute bottom-32 md:bottom-8 right-4 z-10 bg-white hover:bg-gray-100 text-slate-900 p-3 rounded-full shadow-lg transition disabled:opacity-50"
        title="Konumumu Bul"
      >
        <Locate className={`w-6 h-6 ${locatingUser ? "animate-pulse" : ""}`} />
      </button>

      {/* Station Detail Panel */}
      {selectedStation && (
        <div className="absolute bottom-32 md:bottom-auto left-4 right-4 md:left-auto md:right-4 md:top-20 md:w-80 z-20">
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
                %{selectedStation.reliability} Güvenilirlik
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-emerald-400" />
                <span>{selectedStation.power} kW {selectedStation.powerType}</span>
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
              <button 
                onClick={() => openDirections(selectedStation)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2"
              >
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
          <span className="text-white font-medium">{filteredStations.length} istasyon bulundu</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {filteredStations.map((station) => (
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
              <div className="text-slate-400 text-xs">{station.power} kW {station.powerType} - {station.price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}