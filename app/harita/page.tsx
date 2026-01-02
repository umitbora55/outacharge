"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Zap, Battery, Clock, X, Navigation, Locate, Filter, ChevronDown, Loader2, Search, MessageSquare, CheckCircle, XCircle, Car, DollarSign, Calculator, Heart } from "lucide-react";
import Link from "next/link";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/lib/supabase";
import { vehicles, vehiclesByBrand, brands, calculateCompatibility, Vehicle } from "@/data/vehicles";
import { operators, getOperatorById, ChargingOperator } from "@/data/operators";
import { useAuth } from "@/lib/auth";
import StationReviews from "../components/StationReviews";
import StationCheckIn from "../components/StationCheckIn";
import StationChat from "../components/StationChat";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface Station {
  id: number;
  name: string;
  lat: number;
  lng: number;
  operator: string;
  power: number;
  powerType: string;
  status: string;
  connectors: string[];
  address: string;
  numberOfPoints: number;
}

const connectionTypes: Record<number, string> = {
  1: "Type 1",
  2: "CHAdeMO",
  25: "Type 2",
  27: "Tesla",
  30: "Tesla",
  32: "CCS Type 1",
  33: "CCS Type 2",
};

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

const matchOperator = (operatorName: string, stationName: string = ""): ChargingOperator | null => {
  const lowerName = operatorName.toLowerCase();
  const lowerStationName = stationName.toLowerCase();
  const searchText = lowerName + " " + lowerStationName;
  
  if (searchText.includes("zes") || searchText.includes("zorlu")) return getOperatorById("zes") || null;
  if (searchText.includes("eşarj") || searchText.includes("esarj") || searchText.includes("enerjisa")) return getOperatorById("esarj") || null;
  if (searchText.includes("trugo") || searchText.includes("togg")) return getOperatorById("trugo") || null;
  if (searchText.includes("tesla") || searchText.includes("supercharger")) return getOperatorById("tesla") || null;
  if (searchText.includes("voltrun")) return getOperatorById("voltrun") || null;
  if (searchText.includes("petrol ofisi") || searchText.includes("e-power") || searchText.includes("epower") || searchText.includes("po ")) return getOperatorById("epower") || null;
  if (searchText.includes("beefull") || searchText.includes("bee full")) return getOperatorById("beefull") || null;
  if (searchText.includes("aksa")) return getOperatorById("aksasarj") || null;
  if (searchText.includes("sharz")) return getOperatorById("sharz") || null;
  if (searchText.includes("astor")) return getOperatorById("astor") || null;
  if (searchText.includes("gersan") || searchText.includes("g-charge") || searchText.includes("gcharge")) return getOperatorById("gcharge") || null;
  if (searchText.includes("oncharge") || searchText.includes("on charge")) return getOperatorById("oncharge") || null;
  if (searchText.includes("wat ") || searchText.includes("wat mobilite")) return getOperatorById("wat") || null;
  if (searchText.includes("enyakıt") || searchText.includes("enyakit") || searchText.includes("en yakıt")) return getOperatorById("enyakit") || null;
  if (searchText.includes("shell") && !searchText.includes("trugo")) return getOperatorById("trugo") || null;
  
  return null;
};

const getStationPrice = (operator: ChargingOperator | null, power: number, powerType: string): number | null => {
  if (!operator) return null;
  
  if (powerType === "AC") {
    return operator.pricing.ac || null;
  }
  
  if (power >= 180) {
    return operator.pricing.dcHigh || operator.pricing.dcMid || null;
  } else if (power >= 100) {
    return operator.pricing.dcMid || operator.pricing.dcLow || null;
  } else {
    return operator.pricing.dcLow || null;
  }
};

export default function HaritaPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<number[]>([]);
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const [filterPowerType, setFilterPowerType] = useState("Tümü");
  const [filterMinPower, setFilterMinPower] = useState(0);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStatus, setReportStatus] = useState<"active" | "broken" | "busy">("active");
  const [reportComment, setReportComment] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: "success" | "error" }>({
    show: false,
    message: "",
    type: "success",
  });

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>("");

  // Debounced values
  const debouncedFilterPowerType = useDebounce(filterPowerType, 150);
  const debouncedFilterMinPower = useDebounce(filterMinPower, 150);

  useEffect(() => {
    if (user) {
      fetchUserFavorites();
    }
  }, [user]);

  // YENİ EKLENEN KISIM: Kullanıcı giriş yaptığında aracı varsa otomatik seç
  useEffect(() => {
    // @ts-ignore - user objesinde bu propertylerin oldugunu varsayıyoruz
    if (user && user.vehicleBrand && user.vehicleModel && !selectedVehicle) {
      const userVehicle = vehicles.find(
        // @ts-ignore
        v => v.brand === user.vehicleBrand && v.model === user.vehicleModel
      );
      if (userVehicle) {
        setSelectedVehicle(userVehicle);
        setToast({
          show: true,
          message: `Kayıtlı aracınız (${userVehicle.brand} ${userVehicle.model}) yüklendi.`,
          type: "success",
        });
        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
      }
    }
  }, [user]);

  const fetchUserFavorites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("favorites")
      .select("station_id")
      .eq("user_id", user.id);
    if (data) {
      setFavorites(data.map(f => f.station_id));
    }
  };

  const toggleFavorite = async (station: Station) => {
    if (!user) {
      setToast({ show: true, message: "Favorilere eklemek için giriş yapın.", type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
      return;
    }

    setTogglingFavorite(true);
    const isFavorite = favorites.includes(station.id);

    try {
      if (isFavorite) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("station_id", station.id);
        setFavorites(prev => prev.filter(id => id !== station.id));
        setToast({ show: true, message: "Favorilerden kaldırıldı.", type: "success" });
      } else {
        await supabase
          .from("favorites")
          .insert({
            user_id: user.id,
            station_id: station.id,
            station_name: station.name,
            station_operator: station.operator,
            station_address: station.address,
            station_lat: station.lat,
            station_lng: station.lng,
            station_power: station.power,
            station_power_type: station.powerType,
          });
        setFavorites(prev => [...prev, station.id]);
        setToast({ show: true, message: "Favorilere eklendi!", type: "success" });
      }
    } catch (err) {
      setToast({ show: true, message: "Bir hata oluştu.", type: "error" });
    } finally {
      setTogglingFavorite(false);
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
    }
  };

  const powerTypes = ["Tümü", "AC", "DC"];
  const powerLevels = [
    { label: "Tümü", value: 0 },
    { label: "22 kW+", value: 22 },
    { label: "50 kW+", value: 50 },
    { label: "100 kW+", value: 100 },
    { label: "150 kW+", value: 150 },
  ];

  const filteredStations = stations.filter((station) => {
    if (filterPowerType !== "Tümü" && station.powerType !== filterPowerType) return false;
    if (station.power < filterMinPower) return false;
    
    if (selectedVehicle) {
      const compatibility = calculateCompatibility(
        selectedVehicle,
        station.connectors,
        station.power,
        station.powerType
      );
      if (compatibility.score === 0) return false;
    }
    
    return true;
  });

  const fetchStations = async (lat: number, lng: number, searchAll: boolean = false) => {
    setLoading(true);
    try {
      const url = searchAll
        ? `https://api.openchargemap.io/v3/poi/?output=json&countrycode=TR&maxresults=500&compact=true&verbose=false&key=${process.env.NEXT_PUBLIC_OCM_API_KEY}`
        : `https://api.openchargemap.io/v3/poi/?output=json&countrycode=TR&latitude=${lat}&longitude=${lng}&distance=50&distanceunit=KM&maxresults=200&compact=true&verbose=false&key=${process.env.NEXT_PUBLIC_OCM_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      const formattedStations: Station[] = data.map((item: any) => {
        const connections = item.Connections || [];
        const maxPower = Math.max(...connections.map((c: any) => c.PowerKW || 0), 0);
        const powerType = connections.some((c: any) => c.CurrentTypeID === 30) ? "DC" : "AC";
        const connectorTypes = [...new Set(connections.map((c: any) => connectionTypes[c.ConnectionTypeID] || "Diğer"))];

        let status = "active";
        if (item.StatusTypeID === 30 || item.StatusTypeID === 100) status = "broken";
        else if (item.StatusTypeID === 20) status = "busy";

        return {
          id: item.ID,
          name: item.AddressInfo?.Title || "Bilinmeyen İstasyon",
          lat: item.AddressInfo?.Latitude,
          lng: item.AddressInfo?.Longitude,
          operator: item.OperatorInfo?.Title || "Bilinmeyen Operatör",
          power: maxPower,
          powerType,
          status,
          connectors: connectorTypes,
          address: item.AddressInfo?.AddressLine1 || "",
          numberOfPoints: item.NumberOfPoints || 1,
        };
      });

      setStations(formattedStations);
    } catch (error) {
      console.error("İstasyonlar yüklenemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?country=TR&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;

        map.current?.flyTo({
          center: [lng, lat],
          zoom: 12,
        });

        fetchStations(lat, lng, false);
      } else {
        alert("Konum bulunamadı. Lütfen farklı bir arama yapın.");
      }
    } catch (error) {
      console.error("Arama hatası:", error);
    } finally {
      setSearching(false);
    }
  };

  const submitReport = async () => {
    if (!selectedStation) return;

    setReportSubmitting(true);
    try {
      const { error } = await supabase.from("reports").insert([
        {
          station_id: selectedStation.id,
          station_name: selectedStation.name,
          status: reportStatus,
          comment: reportComment,
        },
      ]);

      if (error) {
        setToast({ show: true, message: "Bildirim gönderilemedi. Lütfen tekrar deneyin.", type: "error" });
        console.error(error);
      } else {
        if (reportStatus === "broken") {
          await fetch("/api/report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              stationName: selectedStation.name,
              stationId: selectedStation.id,
              status: reportStatus,
              comment: reportComment,
              address: selectedStation.address,
              operator: selectedStation.operator,
              lat: selectedStation.lat,
              lng: selectedStation.lng,
            }),
          });
        }

        setToast({ show: true, message: "Teşekkürler! Bildiriminiz kaydedildi.", type: "success" });
        setShowReportModal(false);
        setReportComment("");

        setStations((prev) =>
          prev.map((s) => (s.id === selectedStation.id ? { ...s, status: reportStatus } : s))
        );
        setSelectedStation({ ...selectedStation, status: reportStatus });
      }
    } catch (err) {
      setToast({ show: true, message: "Bir hata oluştu.", type: "error" });
      console.error(err);
    } finally {
      setReportSubmitting(false);
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
    }
  };

  const locateUser = () => {
    if (!navigator.geolocation) {
      alert("Tarayıcınız konum özelliğini desteklemiyor.");
      return;
    }

    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        if (map.current) {
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 13,
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

        fetchStations(latitude, longitude, false);
        setLocatingUser(false);
      },
      (error) => {
        console.error("Konum alınamadı:", error);
        alert("Konum alınamadı. Varsayılan konum kullanılıyor.");
        setLocatingUser(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const updateMarkers = () => {
    if (markersRef.current.length > 0) {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    }

    if (!map.current) return;

    const newMarkers: mapboxgl.Marker[] = [];

    filteredStations.forEach((station) => {
      let compatibilityScore = 100;
      let markerColor = getStatusColor(station.status);

      if (selectedVehicle) {
        const compatibility = calculateCompatibility(
          selectedVehicle,
          station.connectors,
          station.power,
          station.powerType
        );
        compatibilityScore = compatibility.score;

        if (compatibilityScore >= 90) {
          markerColor = "#059669";
        } else if (compatibilityScore >= 80) {
          markerColor = "#10b981";
        } else if (compatibilityScore >= 70) {
          markerColor = "#34d399";
        } else if (compatibilityScore >= 60) {
          markerColor = "#fbbf24";
        } else if (compatibilityScore >= 50) {
          markerColor = "#f97316";
        } else if (compatibilityScore > 0) {
          markerColor = "#ef4444";
        } else {
          markerColor = "#6b7280";
        }
      }

      const el = document.createElement("div");
      el.className = "station-marker";

      Object.assign(el.style, {
        width: selectedVehicle ? "40px" : "36px",
        height: selectedVehicle ? "40px" : "36px",
        borderRadius: "50%",
        backgroundColor: markerColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        border: selectedVehicle ? "3px solid white" : "none",
        opacity: selectedVehicle && compatibilityScore < 40 ? "0.6" : "1",
        transform: selectedVehicle && compatibilityScore < 40 ? "scale(0.8)" : "scale(1)",
      });

      if (selectedVehicle && compatibilityScore > 0) {
        el.innerHTML = `<span style="color:white;font-size:11px;font-weight:bold">${compatibilityScore}</span>`;
      } else {
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
      }

      el.onclick = () => {
        setSelectedStation(station);
        map.current?.flyTo({
          center: [station.lng, station.lat],
          zoom: 15,
        });
      };

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([station.lng, station.lat])
        .addTo(map.current!);

      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;
  };

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [32.8541, 39.9208],
      zoom: 6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      fetchStations(39.9208, 32.8541, true);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (map.current && stations.length > 0) {
      updateMarkers();
    }
  }, [stations, debouncedFilterPowerType, debouncedFilterMinPower, selectedVehicle]);

  const openDirections = (station: Station) => {
    const url = userLocation
      ? `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${station.lat},${station.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    window.open(url, "_blank");
  };

  const activeFilterCount = [filterPowerType !== "Tümü", filterMinPower > 0].filter(Boolean).length;

  const stationCompatibility = selectedStation && selectedVehicle
    ? calculateCompatibility(selectedVehicle, selectedStation.connectors, selectedStation.power, selectedStation.powerType)
    : null;

  const selectedStationOperator = selectedStation ? matchOperator(selectedStation.operator, selectedStation.name) : null;
  const selectedStationPrice = selectedStation && selectedStationOperator 
    ? getStationPrice(selectedStationOperator, selectedStation.power, selectedStation.powerType)
    : null;

  const estimatedChargeCost = selectedVehicle && selectedStationPrice
    ? (selectedVehicle.batteryCapacity * 0.6 * selectedStationPrice)
    : null;

  return (
    <div className="h-screen w-full relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-white flex items-center gap-2 flex-shrink-0">
            <Zap className="w-6 h-6 text-emerald-400" />
            <span className="hidden sm:inline">
              Outa<span className="text-emerald-400">Charge</span>
            </span>
          </Link>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Şehir veya adres ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    handleSearch();
                  }
                }}
                className="w-full bg-slate-700 text-white rounded-full px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />
              )}
            </div>
          </div>

          <button
            onClick={() => setShowVehicleModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition flex-shrink-0 ${
              selectedVehicle
                ? "bg-emerald-500 text-white"
                : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
          >
            <Car className="w-4 h-4" />
            <span className="hidden sm:inline">
              {selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "Araç Seç"}
            </span>
          </button>

          <Link
            href="/hesaplayici"
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full text-sm font-medium transition"
          >
            <Calculator className="w-4 h-4" />
            <span>Hesaplayıcı</span>
          </Link>

          {selectedVehicle && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 text-xs">
                Uyumluluk modu aktif
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                showFilters || activeFilterCount > 0
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-700 text-white hover:bg-slate-600"
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtre</span>
              {activeFilterCount > 0 && (
                <span className="bg-white text-emerald-500 px-2 py-0.5 rounded-full text-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="hidden md:flex items-center gap-3 text-sm text-white">
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

        {showFilters && (
          <div className="border-t border-slate-700 bg-slate-800/95 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-medium">Filtreler</span>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Şarj Tipi</label>
                  <div className="relative">
                    <select
                      value={filterPowerType}
                      onChange={(e) => setFilterPowerType(e.target.value)}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer"
                    >
                      {powerTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-1">Minimum Güç</label>
                  <div className="relative">
                    <select
                      value={filterMinPower}
                      onChange={(e) => setFilterMinPower(Number(e.target.value))}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer"
                    >
                      {powerLevels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={locateUser}
                    disabled={locatingUser}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                  >
                    {locatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Locate className="w-4 h-4" />}
                    Konumumu Bul
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
                <span className="text-slate-400 text-sm">
                  {loading ? "Yükleniyor..." : `${filteredStations.length} istasyon bulundu`}
                </span>
                <button
                  onClick={() => {
                    setFilterPowerType("Tümü");
                    setFilterMinPower(0);
                    setSelectedVehicle(null);
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

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-30">
          <div className="bg-slate-800 rounded-xl p-6 flex items-center gap-4">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <span className="text-white font-medium">İstasyonlar yükleniyor...</span>
          </div>
        </div>
      )}

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
        <div className="absolute bottom-32 md:bottom-8 left-4 right-4 md:right-auto md:left-4 md:w-96 z-20">
          <div className="bg-slate-800 text-white p-4 rounded-xl shadow-xl">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg">{selectedStation.name}</h3>
                <div className="flex items-center gap-2">
                  <p className="text-slate-400 text-sm">{selectedStation.operator}</p>
                  {selectedStationOperator && (
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: selectedStationOperator.color }}
                    />
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedStation(null)} className="text-slate-400 hover:text-white">
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
              <span className="text-sm text-slate-300">{selectedStation.numberOfPoints} şarj noktası</span>
            </div>

            {/* Fiyat Bilgisi */}
            {selectedStationPrice ? (
              <div className="mb-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Tahmini Fiyat</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-emerald-400">{selectedStationPrice.toFixed(2)} ₺</span>
                    <span className="text-slate-400 text-sm">/kWh</span>
                  </div>
                </div>
                {estimatedChargeCost && selectedVehicle && (
                  <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      %20 → %80 şarj ({(selectedVehicle.batteryCapacity * 0.6).toFixed(0)} kWh)
                    </span>
                    <span className="text-sm font-medium text-white">
                      ≈ {estimatedChargeCost.toFixed(0)} ₺
                    </span>
                  </div>
                )}
                <div className="mt-2 text-xs text-slate-500">
                  * {selectedStationOperator?.name} tarifesi, güncel fiyatlar farklılık gösterebilir.
                </div>
              </div>
            ) : (
              <div className="mb-3 p-3 rounded-lg bg-slate-700/50">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <DollarSign className="w-4 h-4" />
                  <span>Fiyat bilgisi mevcut değil</span>
                </div>
                <Link 
                  href="/hesaplayici" 
                  className="mt-2 text-emerald-400 text-xs hover:text-emerald-300 flex items-center gap-1"
                >
                  <Calculator className="w-3 h-3" />
                  Tüm operatör fiyatlarını karşılaştır →
                </Link>
              </div>
            )}
            {/* Check-in */}
            <StationCheckIn 
  stationId={selectedStation.id} 
  stationName={selectedStation.name}
  stationOperator={selectedStation.operator}
  stationPower={selectedStation.power}
  stationPowerType={selectedStation.powerType}
/>

            {/* Uyumluluk Skoru */}
            {stationCompatibility && selectedVehicle && (
              <div className={`mb-3 p-3 rounded-lg ${
                stationCompatibility.score >= 70 ? "bg-emerald-500/20 border border-emerald-500/30" :
                stationCompatibility.score >= 40 ? "bg-yellow-500/20 border border-yellow-500/30" :
                "bg-red-500/20 border border-red-500/30"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {selectedVehicle.brand} {selectedVehicle.model} Uyumluluğu
                  </span>
                  <span className={`text-lg font-bold ${
                    stationCompatibility.score >= 70 ? "text-emerald-400" :
                    stationCompatibility.score >= 40 ? "text-yellow-400" :
                    "text-red-400"
                  }`}>
                    %{stationCompatibility.score}
                  </span>
                </div>
                <div className="space-y-1">
                  {stationCompatibility.reasons.map((reason, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-emerald-300">
                      <CheckCircle className="w-3 h-3" />
                      {reason}
                    </div>
                  ))}
                  {stationCompatibility.warnings.map((warning, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-yellow-300">
                      <XCircle className="w-3 h-3" />
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-emerald-400" />
                <span>
                  {selectedStation.power} kW {selectedStation.powerType}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>{selectedStation.connectors.join(", ")}</span>
              </div>
              {selectedStation.address && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-emerald-400 mt-0.5" />
                  <span className="text-slate-400">{selectedStation.address}</span>
                </div>
              )}
            </div>
            {/* Chat */}
<StationChat stationId={selectedStation.id} stationName={selectedStation.name} />
            {/* Reviews */}
            <StationReviews stationId={selectedStation.id} stationName={selectedStation.name} />  
            <div className="mt-4 pt-3 border-t border-slate-700 flex gap-2">
              <button
                onClick={() => toggleFavorite(selectedStation)}
                disabled={togglingFavorite}
                className={`p-2 rounded-full transition ${
                  favorites.includes(selectedStation.id)
                    ? "bg-red-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                <Heart className={`w-5 h-5 ${favorites.includes(selectedStation.id) ? "fill-current" : ""}`} />
              </button>
              <button
                onClick={() => openDirections(selectedStation)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Yol Tarifi
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Bildir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Selection Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Aracınızı Seçin</h3>
              <button onClick={() => setShowVehicleModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Marka Secimi */}
            <div className="mb-4">
              <label className="block text-slate-400 text-xs mb-2">Marka</label>
              <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                {brands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => setSelectedBrand(brand)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                      selectedBrand === brand
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Listesi */}
            {selectedBrand && (
              <div className="flex-1 overflow-y-auto">
                <label className="block text-slate-400 text-xs mb-2">Model</label>
                <div className="space-y-2">
                  {vehiclesByBrand[selectedBrand]?.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setShowVehicleModal(false);
                        setToast({
                          show: true,
                          message: `${vehicle.brand} ${vehicle.model} seçildi. Haritada uyumluluk skorları gösteriliyor.`,
                          type: "success",
                        });
                        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
                      }}
                      className={`w-full p-4 rounded-lg text-left transition ${
                        selectedVehicle?.id === vehicle.id
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-700 text-white hover:bg-slate-600"
                      }`}
                    >
                      <div className="font-medium">{vehicle.model}</div>
                      <div className="text-sm opacity-75 mt-1">
                        {vehicle.batteryCapacity} kWh • {vehicle.range} km • DC {vehicle.maxDCPower} kW
                      </div>
                      <div className="text-xs opacity-60 mt-1">
                        {vehicle.connectors.join(", ")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Secimi Kaldir */}
            {selectedVehicle && (
              <button
                onClick={() => {
                  setSelectedVehicle(null);
                  setShowVehicleModal(false);
                }}
                className="mt-4 w-full py-3 rounded-full bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition"
              >
                Araç Seçimini Kaldır
              </button>
            )}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && selectedStation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">İstasyon Durumu Bildir</h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-400 text-sm mb-4">{selectedStation.name}</p>

            <div className="space-y-3 mb-4">
              <label className="block text-slate-300 text-sm font-medium mb-2">Durum</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setReportStatus("active")}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    reportStatus === "active"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Çalışıyor
                </button>
                <button
                  onClick={() => setReportStatus("busy")}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    reportStatus === "busy"
                      ? "bg-yellow-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Dolu
                </button>
                <button
                  onClick={() => setReportStatus("broken")}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    reportStatus === "broken"
                      ? "bg-red-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Arızalı
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-slate-300 text-sm font-medium mb-2">Yorum (Opsiyonel)</label>
              <textarea
                value={reportComment}
                onChange={(e) => setReportComment(e.target.value)}
                placeholder="Ek bilgi ekleyin..."
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                rows={3}
              />
            </div>

            <button
              onClick={submitReport}
              disabled={reportSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white py-3 rounded-full font-medium transition flex items-center justify-center gap-2"
            >
              {reportSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                "Bildirimi Gönder"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 transition-all ${
            toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-6 h-6 text-white" />
          ) : (
            <XCircle className="w-6 h-6 text-white" />
          )}
          <span className="text-white font-medium">{toast.message}</span>
        </div>
      )}

      {/* Mobile Station List */}
      {!loading && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 p-4 md:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">{filteredStations.length} istasyon bulundu</span>
            <Link href="/hesaplayici" className="text-emerald-400 text-sm flex items-center gap-1">
              <Calculator className="w-3 h-3" />
              Fiyat Hesapla
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {filteredStations.slice(0, 20).map((station) => {
              const operator = matchOperator(station.operator, station.name);
              const price = operator ? getStationPrice(operator, station.power, station.powerType) : null;
              
              return (
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
                  <div className="text-slate-400 text-xs">
                    {station.power} kW {station.powerType} - {station.connectors[0]}
                  </div>
                  {price && (
                    <div className="text-emerald-400 text-xs mt-1 font-medium">
                      {price.toFixed(2)} ₺/kWh
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}