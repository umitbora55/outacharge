"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import { 
  ArrowLeft, MapPin, Navigation, Zap, Battery, Clock, Car,
  ChevronRight, Loader2, Route, AlertCircle, Check, X,
  Circle, Flag, Plus, Trash2
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { vehicles, vehiclesByBrand, brands, Vehicle } from "@/data/vehicles";
import { operators, getOperatorById } from "@/data/operators";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface Location {
  name: string;
  lat: number;
  lng: number;
}

interface ChargingStop {
  station: {
    id: number;
    name: string;
    operator: string;
    lat: number;
    lng: number;
    power: number;
    powerType: string;
    address: string;
  };
  arrivalCharge: number;
  departureCharge: number;
  chargingTime: number;
  chargingCost: number;
  distanceFromPrev: number;
}

interface RouteResult {
  distance: number;
  duration: number;
  geometry: any;
  chargingStops: ChargingStop[];
  totalChargingTime: number;
  totalChargingCost: number;
  arrivalCharge: number;
}

export default function RotaPlanlaPage() {
  const { user } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [originSearch, setOriginSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [originResults, setOriginResults] = useState<any[]>([]);
  const [destinationResults, setDestinationResults] = useState<any[]>([]);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDestination, setSearchingDestination] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [currentCharge, setCurrentCharge] = useState(80);
  const [minArrivalCharge, setMinArrivalCharge] = useState(20);

  const [calculating, setCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState("");

  const [showVehicleSelect, setShowVehicleSelect] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("");

  // Auto-select user's vehicle
  useEffect(() => {
    if (user && user.vehicleBrand && user.vehicleModel && !selectedVehicle) {
      const userVehicle = vehicles.find(
        v => v.brand === user.vehicleBrand && v.model === user.vehicleModel
      );
      if (userVehicle) {
        setSelectedVehicle(userVehicle);
      }
    }
  }, [user]);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [32.8541, 39.9208],
      zoom: 6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
    };
  }, []);

  // Search location
  const searchLocation = async (query: string, type: "origin" | "destination") => {
    if (!query.trim()) {
      type === "origin" ? setOriginResults([]) : setDestinationResults([]);
      return;
    }

    type === "origin" ? setSearchingOrigin(true) : setSearchingDestination(true);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=TR&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      );
      const data = await response.json();

      if (data.features) {
        type === "origin" ? setOriginResults(data.features) : setDestinationResults(data.features);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      type === "origin" ? setSearchingOrigin(false) : setSearchingDestination(false);
    }
  };

  // Select location
  const selectLocation = (feature: any, type: "origin" | "destination") => {
    const location: Location = {
      name: feature.place_name,
      lat: feature.center[1],
      lng: feature.center[0],
    };

    if (type === "origin") {
      setOrigin(location);
      setOriginSearch(feature.place_name);
      setOriginResults([]);
    } else {
      setDestination(location);
      setDestinationSearch(feature.place_name);
      setDestinationResults([]);
    }

    // Update map
    if (map.current) {
      map.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 10,
      });
    }
  };

  // Fetch charging stations along route
  const fetchStationsAlongRoute = async (coordinates: [number, number][]) => {
    const stations: any[] = [];
    
    // Sample points along the route (every ~50km)
    const samplePoints: [number, number][] = [];
    let totalDist = 0;
    
    for (let i = 1; i < coordinates.length; i++) {
      const [lng1, lat1] = coordinates[i - 1];
      const [lng2, lat2] = coordinates[i];
      const dist = Math.sqrt(Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2)) * 111; // Approximate km
      totalDist += dist;
      
      if (totalDist >= 50) {
        samplePoints.push([lat2, lng2]);
        totalDist = 0;
      }
    }

    // Fetch stations near sample points
    for (const [lat, lng] of samplePoints.slice(0, 5)) { // Limit API calls
      try {
        const response = await fetch(
          `https://api.openchargemap.io/v3/poi/?output=json&countrycode=TR&latitude=${lat}&longitude=${lng}&distance=30&distanceunit=KM&maxresults=10&compact=true&verbose=false&key=${process.env.NEXT_PUBLIC_OCM_API_KEY}`
        );
        const data = await response.json();
        
        data.forEach((item: any) => {
          if (!stations.find(s => s.id === item.ID)) {
            const connections = item.Connections || [];
            const maxPower = Math.max(...connections.map((c: any) => c.PowerKW || 0), 0);
            const powerType = connections.some((c: any) => c.CurrentTypeID === 30) ? "DC" : "AC";
            
            if (maxPower >= 50) { // Only DC fast chargers for trips
              stations.push({
                id: item.ID,
                name: item.AddressInfo?.Title || "Bilinmeyen İstasyon",
                operator: item.OperatorInfo?.Title || "Bilinmeyen",
                lat: item.AddressInfo?.Latitude,
                lng: item.AddressInfo?.Longitude,
                power: maxPower,
                powerType,
                address: item.AddressInfo?.AddressLine1 || "",
              });
            }
          }
        });
      } catch (err) {
        console.error("Station fetch error:", err);
      }
    }

    return stations;
  };

  // Calculate route
  const calculateRoute = async () => {
    if (!origin || !destination || !selectedVehicle) {
      setError("Lütfen başlangıç, bitiş noktası ve araç seçin.");
      return;
    }

    setCalculating(true);
    setError("");
    setRouteResult(null);

    try {
      // Get route from Mapbox
      const routeResponse = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      );
      const routeData = await routeResponse.json();

      if (!routeData.routes || routeData.routes.length === 0) {
        setError("Rota bulunamadı.");
        setCalculating(false);
        return;
      }

      const route = routeData.routes[0];
      const distanceKm = route.distance / 1000;
      const durationMin = route.duration / 60;

      // Calculate if charging is needed
      const consumption = selectedVehicle.batteryCapacity / selectedVehicle.range; // kWh per km
      const energyNeeded = distanceKm * consumption;
      const availableEnergy = (currentCharge / 100) * selectedVehicle.batteryCapacity;
      const minEnergyAtArrival = (minArrivalCharge / 100) * selectedVehicle.batteryCapacity;
      const usableEnergy = availableEnergy - minEnergyAtArrival;

      let chargingStops: ChargingStop[] = [];
      let totalChargingTime = 0;
      let totalChargingCost = 0;

      if (energyNeeded > usableEnergy) {
        // Need charging stops
        const stations = await fetchStationsAlongRoute(route.geometry.coordinates);
        
        // Simple algorithm: add stops when charge would drop below minimum
        let currentEnergy = availableEnergy;
        let distanceCovered = 0;
        const maxRange = (currentCharge / 100) * selectedVehicle.range;
        let prevLat = origin.lat;
        let prevLng = origin.lng;

        // Sort stations by distance from origin
        const sortedStations = stations
          .map(s => ({
            ...s,
            distanceFromOrigin: Math.sqrt(
              Math.pow(s.lat - origin.lat, 2) + Math.pow(s.lng - origin.lng, 2)
            ) * 111
          }))
          .sort((a, b) => a.distanceFromOrigin - b.distanceFromOrigin);

        for (const station of sortedStations) {
          const distanceToStation = Math.sqrt(
            Math.pow(station.lat - prevLat, 2) + Math.pow(station.lng - prevLng, 2)
          ) * 111;

          const energyToStation = distanceToStation * consumption;
          const chargeAtStation = ((currentEnergy - energyToStation) / selectedVehicle.batteryCapacity) * 100;

          if (chargeAtStation < minArrivalCharge + 10 && chargeAtStation > 5) {
            // Need to charge here
            const chargeToAdd = 80 - chargeAtStation; // Charge to 80%
            const energyToAdd = (chargeToAdd / 100) * selectedVehicle.batteryCapacity;
            
            // Estimate charging time (simplified)
            const chargingPower = Math.min(station.power, selectedVehicle.maxDCPower);
            const chargingTime = (energyToAdd / chargingPower) * 60; // minutes
            
            // Estimate cost
            const pricePerKwh = station.powerType === "DC" ? 12.5 : 9; // Average
            const chargingCost = energyToAdd * pricePerKwh;

            chargingStops.push({
              station,
              arrivalCharge: Math.round(chargeAtStation),
              departureCharge: 80,
              chargingTime: Math.round(chargingTime),
              chargingCost: Math.round(chargingCost),
              distanceFromPrev: Math.round(distanceToStation),
            });

            totalChargingTime += chargingTime;
            totalChargingCost += chargingCost;
            currentEnergy = 0.8 * selectedVehicle.batteryCapacity;
            prevLat = station.lat;
            prevLng = station.lng;

            if (chargingStops.length >= 3) break; // Max 3 stops
          }
        }
      }

      // Calculate arrival charge
      const totalEnergyUsed = distanceKm * consumption;
      const totalEnergyCharged = chargingStops.reduce((sum, stop) => 
        sum + ((stop.departureCharge - stop.arrivalCharge) / 100) * selectedVehicle.batteryCapacity, 0
      );
      const finalEnergy = availableEnergy - totalEnergyUsed + totalEnergyCharged;
      const arrivalCharge = Math.round((finalEnergy / selectedVehicle.batteryCapacity) * 100);

      setRouteResult({
        distance: Math.round(distanceKm),
        duration: Math.round(durationMin),
        geometry: route.geometry,
        chargingStops,
        totalChargingTime: Math.round(totalChargingTime),
        totalChargingCost: Math.round(totalChargingCost),
        arrivalCharge: Math.max(0, Math.min(100, arrivalCharge)),
      });

      // Draw route on map
      if (map.current) {
        // Remove existing route
        if (map.current.getSource("route")) {
          map.current.removeLayer("route");
          map.current.removeSource("route");
        }

        // Add route line
        map.current.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          },
        });

        map.current.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#10b981",
            "line-width": 5,
          },
        });

        // Clear existing markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // Add origin marker
        const originEl = document.createElement("div");
        originEl.innerHTML = `<div style="width:30px;height:30px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg></div>`;
        const originMarker = new mapboxgl.Marker({ element: originEl })
          .setLngLat([origin.lng, origin.lat])
          .addTo(map.current);
        markersRef.current.push(originMarker);

        // Add destination marker
        const destEl = document.createElement("div");
        destEl.innerHTML = `<div style="width:30px;height:30px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg></div>`;
        const destMarker = new mapboxgl.Marker({ element: destEl })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map.current);
        markersRef.current.push(destMarker);

        // Add charging stop markers
        chargingStops.forEach((stop, index) => {
          const stopEl = document.createElement("div");
          stopEl.innerHTML = `<div style="width:36px;height:36px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);font-weight:bold;color:white;font-size:14px">${index + 1}</div>`;
          const stopMarker = new mapboxgl.Marker({ element: stopEl })
            .setLngLat([stop.station.lng, stop.station.lat])
            .addTo(map.current!);
          markersRef.current.push(stopMarker);
        });

        // Fit bounds
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([origin.lng, origin.lat]);
        bounds.extend([destination.lng, destination.lat]);
        chargingStops.forEach(stop => {
          bounds.extend([stop.station.lng, stop.station.lat]);
        });
        map.current.fitBounds(bounds, { padding: 50 });
      }

    } catch (err) {
      console.error("Route calculation error:", err);
      setError("Rota hesaplanırken bir hata oluştu.");
    } finally {
      setCalculating(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} dk`;
    return `${hours} sa ${mins} dk`;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Route className="w-6 h-6 text-emerald-400" />
            Rota Planlayıcı
          </h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-full md:w-96 bg-slate-800 overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-4">
            {/* Origin */}
            <div>
              <label className="block text-slate-400 text-sm mb-2 flex items-center gap-2">
                <Circle className="w-4 h-4 text-blue-400" />
                Başlangıç
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={originSearch}
                  onChange={(e) => {
                    setOriginSearch(e.target.value);
                    searchLocation(e.target.value, "origin");
                  }}
                  placeholder="Şehir veya adres ara..."
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                {searchingOrigin && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 animate-spin" />
                )}
                {originResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                    {originResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => selectLocation(result, "origin")}
                        className="w-full px-4 py-3 text-left text-white hover:bg-slate-600 transition flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{result.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-slate-400 text-sm mb-2 flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-400" />
                Varış
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={destinationSearch}
                  onChange={(e) => {
                    setDestinationSearch(e.target.value);
                    searchLocation(e.target.value, "destination");
                  }}
                  placeholder="Şehir veya adres ara..."
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                {searchingDestination && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 animate-spin" />
                )}
                {destinationResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                    {destinationResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => selectLocation(result, "destination")}
                        className="w-full px-4 py-3 text-left text-white hover:bg-slate-600 transition flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{result.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Selection */}
            <div>
              <label className="block text-slate-400 text-sm mb-2 flex items-center gap-2">
                <Car className="w-4 h-4" />
                Araç
              </label>
              <button
                onClick={() => setShowVehicleSelect(!showVehicleSelect)}
                className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 text-left flex items-center justify-between hover:bg-slate-600 transition"
              >
                <span>
                  {selectedVehicle 
                    ? `${selectedVehicle.brand} ${selectedVehicle.model}` 
                    : "Araç seçin"}
                </span>
                <ChevronRight className={`w-5 h-5 transition-transform ${showVehicleSelect ? "rotate-90" : ""}`} />
              </button>

              {showVehicleSelect && (
                <div className="mt-2 bg-slate-700 rounded-lg p-3 space-y-2">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full bg-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Marka seçin</option>
                    {brands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                  {selectedBrand && (
                    <select
                      value={selectedVehicle?.id || ""}
                      onChange={(e) => {
                        const vehicle = vehicles.find(v => v.id === e.target.value);
                        setSelectedVehicle(vehicle || null);
                        setShowVehicleSelect(false);
                      }}
                      className="w-full bg-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Model seçin</option>
                      {vehiclesByBrand[selectedBrand]?.map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.model} ({vehicle.range} km)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {selectedVehicle && (
                <div className="mt-2 text-xs text-slate-400 flex items-center gap-4">
                  <span>🔋 {selectedVehicle.batteryCapacity} kWh</span>
                  <span>📏 {selectedVehicle.range} km</span>
                  <span>⚡ {selectedVehicle.maxDCPower} kW DC</span>
                </div>
              )}
            </div>

            {/* Charge Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Mevcut Şarj</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={currentCharge}
                    onChange={(e) => setCurrentCharge(Number(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-white text-sm w-12 text-right">%{currentCharge}</span>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Min. Varış Şarjı</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={minArrivalCharge}
                    onChange={(e) => setMinArrivalCharge(Number(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-white text-sm w-12 text-right">%{minArrivalCharge}</span>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Calculate Button */}
            <button
              onClick={calculateRoute}
              disabled={calculating || !origin || !destination || !selectedVehicle}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full font-medium transition flex items-center justify-center gap-2"
            >
              {calculating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Hesaplanıyor...
                </>
              ) : (
                <>
                  <Route className="w-5 h-5" />
                  Rotayı Hesapla
                </>
              )}
            </button>

            {/* Route Result */}
            {routeResult && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-3">Rota Özeti</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-400">Mesafe:</span>
                      <span className="text-white font-medium">{routeResult.distance} km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-400">Süre:</span>
                      <span className="text-white font-medium">{formatDuration(routeResult.duration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-400">Şarj:</span>
                      <span className="text-white font-medium">{formatDuration(routeResult.totalChargingTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Battery className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-400">Varış:</span>
                      <span className={`font-medium ${routeResult.arrivalCharge < 20 ? "text-red-400" : "text-emerald-400"}`}>
                        %{routeResult.arrivalCharge}
                      </span>
                    </div>
                  </div>
                  {routeResult.totalChargingCost > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600 flex items-center justify-between">
                      <span className="text-slate-400">Tahmini Şarj Maliyeti:</span>
                      <span className="text-emerald-400 font-bold text-lg">₺{routeResult.totalChargingCost}</span>
                    </div>
                  )}
                </div>

                {/* Charging Stops */}
                {routeResult.chargingStops.length > 0 ? (
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <h3 className="text-white font-medium mb-3">Şarj Durakları ({routeResult.chargingStops.length})</h3>
                    <div className="space-y-3">
                      {routeResult.chargingStops.map((stop, index) => (
                        <div key={index} className="bg-slate-800 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="text-white font-medium flex-1 truncate">{stop.station.name}</span>
                          </div>
                          <div className="text-xs text-slate-400 space-y-1">
                            <div className="flex justify-between">
                              <span>Operatör: {stop.station.operator}</span>
                              <span>{stop.station.power} kW {stop.station.powerType}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Varış: %{stop.arrivalCharge} → Çıkış: %{stop.departureCharge}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400">
                              <span>⏱ {stop.chargingTime} dk şarj</span>
                              <span>💰 ₺{stop.chargingCost}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                    <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-400 font-medium">Şarj durağı gerekmez!</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Mevcut şarjınızla hedefinize ulaşabilirsiniz.
                    </p>
                  </div>
                )}

                {/* Total Time */}
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Toplam Seyahat Süresi:</span>
                    <span className="text-emerald-400 font-bold text-xl">
                      {formatDuration(routeResult.duration + routeResult.totalChargingTime)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div ref={mapContainer} className="flex-1 hidden md:block" />
      </div>
    </div>
  );
}