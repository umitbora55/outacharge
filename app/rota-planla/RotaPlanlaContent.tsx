"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import {
  ArrowLeft, MapPin, Navigation, Zap, Battery, Clock, Car,
  ChevronRight, Loader2, Route, AlertCircle, Check,
  Circle, Flag, Settings, Users, Briefcase, Thermometer,
  MessageCircle, Wind, Droplets
} from "lucide-react";
import {
  getElevationProfile,
  routeEnergy,
  VehiclePhysics,
  WeatherConditions
} from "@/lib/terrain";
import { getRouteWeather, RouteWeatherSummary } from "@/lib/weather-service";
import { optimizeChargingStops, OptimizationResult, compareChargingStrategies } from "@/lib/route-optimizer";
import { useAuth } from "@/lib/auth";
import { vehicles as localVehicles, vehiclesByBrand, brands as localBrands, Vehicle, calculateChargingTime, ChargingCurvePoint } from "@/data/vehicles";
import { fetchVehicle, toVehicleFormat, SUPPORTED_MAKES } from "@/lib/ev-api";
import RouteWeatherAnalysis from "../components/RouteWeatherAnalysis";
import RouteChatHub from "../components/RouteChatHub";
import RouteJourney from "../components/RouteJourney";
import RouteComparison from "../components/RouteComparison";
import "mapbox-gl/dist/mapbox-gl.css";

// Add after other imports
import { useEffect as useEffectForDB } from 'react';

// Add this interface near other interfaces
interface SupabaseVehicle {
  id: string;
  make: string;
  model: string;
  variant: string | null;
  battery_kwh: number;
  range_wltp_km: number;
  power_hp: number;
  charge_dc_kw: number;
  connector_type: string;
  consumption_kwh_100km: number;
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// ===== ROUTE GEOMETRY HELPERS =====
type LngLat = [number, number];

function haversineKm(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sLat1 = toRad(lat1);
  const sLat2 = toRad(lat2);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(sLat1) * Math.cos(sLat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function samplePointsAlongRoute(coords: LngLat[], stepKm: number): { lng: number; lat: number; atKm: number; idx: number }[] {
  if (!coords || coords.length < 2) return [];
  const points: { lng: number; lat: number; atKm: number; idx: number }[] = [];
  let acc = 0;
  let total = 0;
  points.push({ lng: coords[0][0], lat: coords[0][1], atKm: 0, idx: 0 });
  for (let i = 1; i < coords.length; i++) {
    const segKm = haversineKm(coords[i - 1], coords[i]);
    total += segKm;
    acc += segKm;
    if (acc >= stepKm) {
      points.push({ lng: coords[i][0], lat: coords[i][1], atKm: Math.round(total * 10) / 10, idx: i });
      acc = 0;
    }
  }
  const last = coords.length - 1;
  const lastPt = points[points.length - 1];
  if (!lastPt || lastPt.idx !== last) {
    points.push({ lng: coords[last][0], lat: coords[last][1], atKm: Math.round(total * 10) / 10, idx: last });
  }
  return points;
}

function routeDistanceKm(coords: LngLat[]): number {
  if (!coords || coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += haversineKm(coords[i - 1], coords[i]);
  return total;
}

function pointToSegmentDistanceKm(p: LngLat, a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat0 = toRad(p[1]);
  const kx = 111.320 * Math.cos(lat0);
  const ky = 110.574;
  const px = p[0] * kx, py = p[1] * ky;
  const ax = a[0] * kx, ay = a[1] * ky;
  const bx = b[0] * kx, by = b[1] * ky;
  const abx = bx - ax, aby = by - ay;
  const apx = px - ax, apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  const cx = ax + t * abx, cy = ay + t * aby;
  const dx = px - cx, dy = py - cy;
  return Math.sqrt(dx * dx + dy * dy);
}

function distanceToPolylineKm(route: LngLat[], p: LngLat): { minKm: number; segIdx: number } {
  let minKm = Infinity;
  let segIdx = 0;
  for (let i = 1; i < route.length; i++) {
    const d = pointToSegmentDistanceKm(p, route[i - 1], route[i]);
    if (d < minKm) { minKm = d; segIdx = i - 1; }
  }
  return { minKm, segIdx };
}

function buildSpeedProfile(route: any) {
  const legs = route.legs || [];
  const segments: { fromKm: number; toKm: number; speedKmh: number }[] = [];
  let accKm = 0;
  for (const leg of legs) {
    for (const step of leg.steps) {
      const km = step.distance / 1000;
      const hours = step.duration / 3600;
      if (hours <= 0 || km <= 0) continue;
      const speed = km / hours;
      segments.push({ fromKm: Math.round(accKm * 10) / 10, toKm: Math.round((accKm + km) * 10) / 10, speedKmh: Math.round(speed) });
      accKm += km;
    }
  }
  return segments;
}

// ===== VEHICLE PHYSICS BUILDER =====
function buildVehiclePhysics(
  vehicle: Vehicle,
  passengerCount: number,
  luggageKg: number,
  hvacMode: "auto" | "off" | "eco",
  drivingStyle: "normal" | "eco" | "sport"
): VehiclePhysics {
  const passengerWeight = passengerCount * 75;
  const totalMass = vehicle.massKg + passengerWeight + luggageKg;

  let drivetrainEffMod = 1.0;
  let regenEffMod = 1.0;

  switch (drivingStyle) {
    case "eco":
      drivetrainEffMod = 1.05;
      regenEffMod = 1.1;
      break;
    case "sport":
      drivetrainEffMod = 0.9;
      regenEffMod = 0.85;
      break;
  }

  let hvacPower = vehicle.hvacPowerKw;
  switch (hvacMode) {
    case "off": hvacPower = 0; break;
    case "eco": hvacPower = vehicle.hvacPowerKw * 0.6; break;
  }

  return {
    massKg: totalMass,
    dragCoefficient: vehicle.dragCoefficient,
    frontalArea: vehicle.frontalArea,
    rollingResistance: vehicle.rollingResistance,
    drivetrainEfficiency: Math.min(0.98, vehicle.drivetrainEfficiency * drivetrainEffMod),
    regenEfficiency: Math.min(0.85, vehicle.regenEfficiency * regenEffMod),
    hvacPowerKw: hvacPower,
    batteryHeatingKw: vehicle.batteryHeatingKw,
    optimalBatteryTempC: vehicle.optimalBatteryTempC,
    tempEfficiencyLoss: vehicle.tempEfficiencyLoss,
    batteryCapacity: vehicle.batteryCapacity,
  };
}

// ===== INTERFACES =====
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
    distanceToRouteKm: number;
    detourKm: number;
    segIdx: number;
    anchorLng: number;
    anchorLat: number;
    detourMin: number | null;
    routeProgressKm: number;
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
  geometry: { type: "LineString"; coordinates: [number, number][] };
  chargingStops: ChargingStop[];
  totalChargingTime: number;
  totalChargingCost: number;
  arrivalCharge: number;
  energyUsed?: number;
  efficiency?: number;
}

// ===== MAIN COMPONENT =====
export default function RotaPlanlaPage() {
  const { user } = useAuth();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Location states
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [originSearch, setOriginSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [originResults, setOriginResults] = useState<{ place_name: string; center: [number, number] }[]>([]);
  const [destinationResults, setDestinationResults] = useState<{ place_name: string; center: [number, number] }[]>([]);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDestination, setSearchingDestination] = useState(false);

  // Vehicle & charge states
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [currentCharge, setCurrentCharge] = useState(80);
  const [minArrivalCharge, setMinArrivalCharge] = useState(20);

  // NEW: API-based vehicle search
  const [vehicleSearchMode, setVehicleSearchMode] = useState<"local" | "api">("local");
  const [apiModelSearch, setApiModelSearch] = useState("");
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  // NEW: Trip settings
  const [passengerCount, setPassengerCount] = useState(1);
  const [luggageKg, setLuggageKg] = useState(20);
  const [hvacMode, setHvacMode] = useState<"auto" | "off" | "eco">("auto");
  const [drivingStyle, setDrivingStyle] = useState<"normal" | "eco" | "sport">("normal");

  // NEW: Weather state
  const [routeWeather, setRouteWeather] = useState<RouteWeatherSummary | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // UI states
  const [calculating, setCalculating] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [error, setError] = useState("");
  const [showVehicleSelect, setShowVehicleSelect] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [showChatHub, setShowChatHub] = useState(false);
  const [strategy, setStrategy] = useState<"fastest" | "fewest" | "cheapest">("fastest");
  const [comparisonResults, setComparisonResults] = useState<{
    fastest: any;
    fewest: any;
    cheapest: any;
  } | null>(null);

  const [supabaseVehicles, setSupabaseVehicles] = useState<SupabaseVehicle[]>([]);
  const [supabaseBrands, setSupabaseBrands] = useState<string[]>([]);
  const [loadingSupabase, setLoadingSupabase] = useState(false);

  // Add after other useEffect hooks
  useEffectForDB(() => {
    const fetchSupabaseVehicles = async () => {
      setLoadingSupabase(true);
      try {
        const response = await fetch('/api/vehicles');
        const data = await response.json();
        if (data.success) {
          setSupabaseVehicles(data.vehicles);
          const uniqueBrands = [...new Set(data.vehicles.map((v: SupabaseVehicle) => v.make))];
          setSupabaseBrands(uniqueBrands as string[]);
        }
      } catch (error) {
        console.error('Supabase vehicles fetch error:', error);
      }
      setLoadingSupabase(false);
    };

    if (vehicleSearchMode === 'local') {
      fetchSupabaseVehicles();
    }
  }, [vehicleSearchMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // Auto-select user's vehicle
  useEffect(() => {
    if (user && user.vehicleBrand && user.vehicleModel && !selectedVehicle) {
      const userVehicle = localVehicles.find(v => v.brand === user.vehicleBrand && v.model === user.vehicleModel);
      if (userVehicle) setSelectedVehicle(userVehicle);
    }
  }, [user, selectedVehicle]);

  // API'den araç getirme fonksiyonu
  const fetchVehicleFromAPI = async (brand: string, model: string) => {
    setApiLoading(true);
    setApiError("");
    try {
      const data = await fetchVehicle(brand, model);
      if (data) {
        const formatted = toVehicleFormat(data);
        // Vehicle tipine dönüştür
        const vehicle: Vehicle = {
          id: formatted.id,
          brand: formatted.brand,
          model: formatted.model,
          year: formatted.year,
          batteryCapacity: formatted.batteryCapacity,
          maxDCPower: formatted.maxDCPower,
          maxACPower: formatted.maxACPower,
          connectors: formatted.connectors,
          range: formatted.range,
          massKg: formatted.massKg,
          dragCoefficient: formatted.dragCoefficient,
          frontalArea: formatted.frontalArea,
          rollingResistance: formatted.rollingResistance,
          drivetrainEfficiency: formatted.drivetrainEfficiency,
          regenEfficiency: formatted.regenEfficiency,
          hvacPowerKw: formatted.hvacPowerKw,
          batteryHeatingKw: formatted.batteryHeatingKw,
          optimalBatteryTempC: formatted.optimalBatteryTempC,
          tempEfficiencyLoss: formatted.tempEfficiencyLoss,
          chargingCurve: formatted.chargingCurve as ChargingCurvePoint[],
        };
        setSelectedVehicle(vehicle);
        setShowVehicleSelect(false);
        console.log("[API] Araç yüklendi:", vehicle);
      } else {
        setApiError("Araç bulunamadı");
      }
    } catch (err) {
      setApiError("API hatası: " + String(err));
    }
    setApiLoading(false);
  };

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    const container = mapContainer.current;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      const timer = setTimeout(() => {
        if (mapContainer.current && !map.current) {
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [32.8541, 39.9208],
            zoom: 6,
          });
          map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
          map.current.on("load", () => { map.current?.resize(); });
        }
      }, 100);
      return () => {
        clearTimeout(timer);
        if (map.current) { map.current.remove(); map.current = null; }
      };
    }
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [32.8541, 39.9208],
      zoom: 6,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.on("load", () => { map.current?.resize(); });
    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
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
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=10`
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
  const selectLocation = (feature: { place_name: string; center: [number, number] }, type: "origin" | "destination") => {
    const location: Location = { name: feature.place_name, lat: feature.center[1], lng: feature.center[0] };
    if (type === "origin") {
      setOrigin(location);
      setOriginSearch(feature.place_name);
      setOriginResults([]);
    } else {
      setDestination(location);
      setDestinationSearch(feature.place_name);
      setDestinationResults([]);
    }
    if (map.current) {
      map.current.flyTo({ center: [location.lng, location.lat], zoom: 10 });
    }
  };

  // Fetch charging stations
  const fetchStationsAlongRoute = useCallback(async (coordinates: [number, number][]) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const stations: any[] = [];
    // Increase sample interval to reduce API calls (100km)
    const samplePoints = samplePointsAlongRoute(coordinates, 100);
    const corridorKm = 15; // 15km corridor for finding stations

    // Helper function for delay
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper function for fetch with retry
    const fetchWithRetry = async (url: string, retries = 3): Promise<any> => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(url, { signal: ac.signal });
          if (response.status === 429) {
            // Rate limited - wait longer before retry
            await delay(2000 * (i + 1));
            continue;
          }
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          return await response.json();
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") throw e;
          if (i === retries - 1) throw e;
          await delay(1000 * (i + 1));
        }
      }
      return [];
    };

    for (let i = 0; i < samplePoints.length; i++) {
      const sp = samplePoints[i];
      if (ac.signal.aborted) return [];

      try {
        // Add delay between requests to avoid rate limiting (500ms)
        if (i > 0) await delay(500);

        const data = await fetchWithRetry(
          `/api/ocm?lat=${sp.lat}&lng=${sp.lng}&distance=50&maxresults=30`
        );

        if (!Array.isArray(data)) continue;

        for (const item of data) {
          const id = item.ID;
          if (stations.find(s => s.id === id)) continue;

          const connections = item.Connections || [];
          const maxPower = Math.max(...connections.map((c: any) => c.PowerKW || 0), 0);
          const powerType = connections.some((c: any) => c.CurrentTypeID === 30) ? "DC" : "AC";

          const lat = item.AddressInfo?.Latitude;
          const lng = item.AddressInfo?.Longitude;
          if (typeof lat !== "number" || typeof lng !== "number") continue;
          // Minimum 22kW for fast charging (includes AC Type 2 and DC)
          if (maxPower < 22) continue;

          const { minKm, segIdx } = distanceToPolylineKm(coordinates, [lng, lat]);
          if (minKm > corridorKm) continue;

          stations.push({
            id,
            name: item.AddressInfo?.Title || "Unknown Station",
            operator: item.OperatorInfo?.Title || "Unknown",
            lat, lng,
            power: maxPower,
            powerType,
            address: item.AddressInfo?.AddressLine1 || "",
            distanceToRouteKm: Math.round(minKm * 10) / 10,
            detourKm: Math.round((2 * minKm) * 10) / 10,
            segIdx,
            anchorLng: coordinates[segIdx][0],
            anchorLat: coordinates[segIdx][1],
            detourMin: null,
            routeProgressKm: Math.round(routeDistanceKm(coordinates.slice(0, segIdx + 1)) * 10) / 10,
          });
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") throw e;
        console.error("OCM error:", e);
      }
    }

    // Detour calculation for top candidates
    const candWindowKm = 50;
    const candBuckets = new Map<number, any[]>();
    for (const s of stations) {
      const key = Math.floor(s.routeProgressKm / candWindowKm);
      const arr = candBuckets.get(key) || [];
      arr.push(s);
      candBuckets.set(key, arr);
    }
    const candidates: any[] = [];
    for (const arr of candBuckets.values()) {
      arr.sort((a, b) => a.distanceToRouteKm - b.distanceToRouteKm);
      candidates.push(...arr.slice(0, 3));
    }

    for (const s of candidates) {
      if (ac.signal.aborted) return [];
      try {
        const coords = `${s.anchorLng},${s.anchorLat};${s.lng},${s.lat}`;
        const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}?annotations=duration&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`;
        const res = await fetch(url, { signal: ac.signal });
        const data = await res.json();
        const aToB = data?.durations?.[0]?.[1];
        const bToA = data?.durations?.[1]?.[0];
        if (typeof aToB === "number" && typeof bToA === "number") {
          s.detourMin = Math.round(((aToB + bToA) / 60) * 10) / 10;
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") throw e;
      }
    }

    return stations;
  }, [strategy]);

  // Draw on map
  const drawOnMap = (routeGeo: any, orig: Location, dest: Location, stops: ChargingStop[]) => {
    const m = map.current;
    if (!m) return;

    const applyRoute = () => {
      const feature: GeoJSON.Feature = { type: "Feature", properties: {}, geometry: routeGeo };
      const src = m.getSource("route") as mapboxgl.GeoJSONSource | undefined;
      if (src) { src.setData(feature as any); return; }
      m.addSource("route", { type: "geojson", data: feature as any });
      const beforeId = m.getLayer("road-label")?.id || m.getLayer("waterway-label")?.id || (m.getStyle().layers || []).find(l => l.type === "symbol")?.id;
      m.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#10b981", "line-width": 5, "line-opacity": 1 },
      }, beforeId);
    };

    const tryApply = (attempt = 0) => {
      try { applyRoute(); } catch (e) {
        if (attempt < 30) requestAnimationFrame(() => tryApply(attempt + 1));
        else console.error("[route] apply failed", e);
      }
    };
    tryApply();

    // Markers
    try {
      markersRef.current.forEach(mk => { try { mk.remove(); } catch { } });
      markersRef.current = [];

      const mkEl = (bg: string, text?: string) => {
        const el = document.createElement("div");
        el.style.cssText = `width:22px;height:22px;border-radius:9999px;background:${bg};border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;z-index:9999;`;
        el.innerText = text ?? "";
        return el;
      };

      const addMarker = (lng: number, lat: number, el: HTMLElement) => {
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(m);
        markersRef.current.push(marker);
      };

      addMarker(orig.lng, orig.lat, mkEl("#3b82f6", "A"));
      addMarker(dest.lng, dest.lat, mkEl("#ef4444", "B"));
      stops.forEach((stop, idx) => addMarker(stop.station.lng, stop.station.lat, mkEl("#10b981", String(idx + 1))));
    } catch (e) {
      console.log("[map] marker phase FAILED", e);
    }

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([orig.lng, orig.lat]);
    bounds.extend([dest.lng, dest.lat]);
    stops.forEach(s => bounds.extend([s.station.lng, s.station.lat]));
    m.resize();
    m.fitBounds(bounds, { padding: 50, duration: 800 });
  };

  // ===== MAIN CALCULATE ROUTE =====
  const calculateRoute = async (forcedStrategy?: "fastest" | "fewest" | "cheapest") => {
    const currentStrategy = forcedStrategy || strategy;
    if (!origin || !destination || !selectedVehicle) {
      setError("Lütfen başlangıç, bitiş noktası ve araç seçin.");
      return;
    }

    setCalculating(true);
    setError("");
    setRouteResult(null);
    setRouteWeather(null);

    try {
      // 1. Get route from Mapbox
      const routeResponse = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&steps=true&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      );
      const routeData = await routeResponse.json();

      if (!routeData.routes || routeData.routes.length === 0) {
        setError("Rota bulunamadı.");
        setCalculating(false);
        return;
      }

      const route = routeData.routes[0];
      const coordinates = route.geometry.coordinates as [number, number][];
      const distanceKm = route.distance / 1000;
      const durationMin = route.duration / 60;

      // 2. Fetch weather data
      setWeatherLoading(true);
      let weather: RouteWeatherSummary;
      try {
        weather = await getRouteWeather(coordinates, routeDistanceKm, 50);
        setRouteWeather(weather);
      } catch (e) {
        console.error("Weather fetch failed:", e);
        weather = {
          points: [],
          average: { temperature: 20, windSpeed: 10, headwindComponent: 0, precipitation: 0, humidity: 50 },
          conditions: { isCold: false, isHot: false, isRainy: false, isWindy: false, rainIntensity: 0 },
          warnings: [],
        };
      }
      setWeatherLoading(false);

      // 3. Build speed profile
      const speedProfile = buildSpeedProfile(route);

      // 4. Get elevation profile
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
      const elevationProfile = await getElevationProfile(coordinates, token, 50, routeDistanceKm);

      // 5. Calculate average altitude
      const elevations = elevationProfile.map(p => p.elev).filter((e): e is number => e !== null);
      const avgAltitude = elevations.length > 0 ? elevations.reduce((a, b) => a + b, 0) / elevations.length : 500;

      // 6. Build vehicle physics with user inputs
      const vehiclePhysics = buildVehiclePhysics(selectedVehicle, passengerCount, luggageKg, hvacMode, drivingStyle);

      // 7. Build weather conditions
      const weatherConditions: WeatherConditions = {
        temperatureC: weather.average.temperature,
        headwindKmh: weather.average.headwindComponent,
        rainIntensity: weather.conditions.rainIntensity,
        altitude: avgAltitude,
      };

      // 8. Basic energy check
      const availableEnergy = (currentCharge / 100) * selectedVehicle.batteryCapacity;
      const minEnergyAtArrival = (minArrivalCharge / 100) * selectedVehicle.batteryCapacity;
      const usableEnergy = availableEnergy - minEnergyAtArrival;

      if (usableEnergy <= 0) {
        setError(`Mevcut şarj (%${currentCharge}) min. varış şarjından (%${minArrivalCharge}) düşük.`);
        setCalculating(false);
        return;
      }

      // 9. Build segments and calculate energy with NEW PHYSICS ENGINE
      const segments = speedProfile.map((sp) => {
        const segElevations = elevationProfile.filter(
          e => e.atKm >= sp.fromKm && e.atKm <= sp.toKm && e.elev !== null
        );
        let gradePercent = 0;
        if (segElevations.length >= 2) {
          const startElev = segElevations[0].elev!;
          const endElev = segElevations[segElevations.length - 1].elev!;
          const deltaElev = endElev - startElev;
          const deltaKm = segElevations[segElevations.length - 1].atKm - segElevations[0].atKm;
          if (deltaKm > 0) gradePercent = (deltaElev / (deltaKm * 1000)) * 100;
        }
        return {
          distanceKm: sp.toKm - sp.fromKm,
          speedKmh: sp.speedKmh,
          gradePercent,
        };
      });

      // Calculate total energy with physics engine
      const energyResult = routeEnergy(segments, vehiclePhysics, weatherConditions);
      const totalEnergyNeeded = energyResult.netKwh;

      console.log("[PHYSICS ENGINE]", {
        totalKm: distanceKm,
        totalKwh: totalEnergyNeeded.toFixed(2),
        efficiency: (energyResult.efficiency * 100).toFixed(1) + " Wh/km",
        breakdown: energyResult.breakdown,
        weather: weatherConditions,
        vehicle: { mass: vehiclePhysics.massKg, hvac: vehiclePhysics.hvacPowerKw },
      });

      // 10. Determine if charging stops needed - GRAPH-BASED OPTIMIZATION
      const chargingStops: ChargingStop[] = [];
      let totalChargingTime = 0;
      let totalChargingCost = 0;
      let arrivalCharge = 0;

      if (totalEnergyNeeded > usableEnergy) {
        const stations = await fetchStationsAlongRoute(coordinates);

        let optimizationResult: OptimizationResult;
        try {
          // 10.1 Compare all strategies
          const comparison = compareChargingStrategies(
            selectedVehicle,
            { name: origin.name, lng: origin.lng, lat: origin.lat },
            { name: destination.name, lng: destination.lng, lat: destination.lat },
            stations.map(s => ({
              id: s.id.toString(),
              name: s.name,
              lng: s.lng,
              lat: s.lat,
              power: s.power,
              powerType: s.powerType as "DC" | "AC",
              operator: s.operator,
              routeProgressKm: s.routeProgressKm,
              detourKm: s.distanceToRouteKm,
              detourMin: s.detourMin ?? undefined,
            })),
            {
              distanceKm,
              durationMin,
              energyPerKm: energyResult.efficiency * 1000,
            },
            {
              startSoC: currentCharge,
              minArrivalSoC: minArrivalCharge,
              batteryTemp: weather.average.temperature,
            }
          );

          setComparisonResults({
            fastest: { ...comparison.fastest, strategy: "fastest", label: "En Hızlı", icon: "zap" },
            fewest: { ...comparison.fewest, strategy: "fewest", label: "Az Durak", icon: "map-pin" },
            cheapest: { ...comparison.cheapest, strategy: "cheapest", label: "En Ucuz", icon: "wallet" },
          });

          // Use graph-based optimizer for current strategy
          optimizationResult = (comparison as any)[currentStrategy];
        } catch (err) {
          console.error("[OPTIMIZER ERROR]", err);
          optimizationResult = {
            success: false,
            stops: [],
            nodesExplored: 0,
            totalDrivingMin: 0,
            totalChargingMin: 0,
            totalTimeMin: 0,
            totalCostTL: 0,
            arrivalSoC: 0
          };
        }

        console.log("[OPTIMIZER RESULT]", {
          success: optimizationResult.success,
          stops: optimizationResult.stops?.length || 0,
          nodesExplored: optimizationResult.nodesExplored,
          totalTimeMin: optimizationResult.totalTimeMin,
          arrivalSoC: optimizationResult.arrivalSoC,
        });

        if (optimizationResult.success) {
          // Convert optimizer stops to ChargingStop format
          let lastProgressKm = 0;
          for (const stop of optimizationResult.stops) {
            const originalStation = stations.find(s => s.id.toString() === stop.station.id);
            if (!originalStation) continue;

            chargingStops.push({
              station: originalStation,
              arrivalCharge: stop.arrivalSoC,
              departureCharge: stop.departureSoC,
              chargingTime: stop.chargingTimeMin,
              chargingCost: stop.chargingCostTL,
              distanceFromPrev: Math.round(stop.station.routeProgressKm - lastProgressKm),
            });

            console.log("[CHARGING]", {
              station: stop.station.name,
              arrivalSoC: stop.arrivalSoC,
              targetSoC: stop.departureSoC,
              stationPower: stop.station.power,
              vehicleMaxPower: selectedVehicle.maxDCPower,
              minutes: stop.chargingTimeMin,
              energyKwh: stop.energyChargedKwh,
            });

            lastProgressKm = stop.station.routeProgressKm;
          }

          totalChargingTime = optimizationResult.totalChargingMin;
          totalChargingCost = optimizationResult.totalCostTL;
          arrivalCharge = optimizationResult.arrivalSoC;
        } else {
          // Fallback: Basit greedy algoritma
          console.warn("[OPTIMIZER] Failed, using greedy fallback");
          let currentEnergy = availableEnergy;
          let lastStopProgressKm = 0;

          const ordered = [...stations].sort((a, b) => a.routeProgressKm - b.routeProgressKm);
          const candidates = ordered.filter(s => s.routeProgressKm >= 30);

          for (const station of candidates) {
            const deltaKm = Math.max(0, station.routeProgressKm - lastStopProgressKm);
            if (deltaKm < 20) continue;

            const progressRatio = deltaKm / distanceKm;
            const energyToStation = totalEnergyNeeded * progressRatio;
            const chargeAtStation = ((currentEnergy - energyToStation) / selectedVehicle.batteryCapacity) * 100;

            if (chargeAtStation < minArrivalCharge + 10 && chargeAtStation > 0) {
              const targetSoC = strategy === "fastest" ? 65 : 90;
              const chargingPower = Math.min(station.power, selectedVehicle.maxDCPower);
              const batteryTemp = weather.average.temperature;

              const chargeResult = calculateChargingTime(
                selectedVehicle,
                chargeAtStation,
                targetSoC,
                chargingPower,
                batteryTemp
              );

              const pricePerKwh = station.powerType === "DC" ? 12.5 : 9;
              const chargingCost = chargeResult.energyKwh * pricePerKwh;

              chargingStops.push({
                station,
                arrivalCharge: Math.round(chargeAtStation),
                departureCharge: targetSoC,
                chargingTime: chargeResult.minutes,
                chargingCost: Math.round(chargingCost),
                distanceFromPrev: Math.round(deltaKm),
              });

              totalChargingTime += (chargeResult.minutes + (station.detourMin ?? 0));
              totalChargingCost += chargingCost;
              currentEnergy = currentEnergy - energyToStation + chargeResult.energyKwh;
              lastStopProgressKm = station.routeProgressKm;

              if (chargingStops.length >= 3) break;
            }
          }

          // Calculate arrival charge for fallback
          const totalEnergyCharged = chargingStops.reduce((sum, stop) =>
            sum + ((stop.departureCharge - stop.arrivalCharge) / 100) * selectedVehicle.batteryCapacity, 0
          );
          const finalEnergy = availableEnergy - totalEnergyNeeded + totalEnergyCharged;
          arrivalCharge = Math.round((finalEnergy / selectedVehicle.batteryCapacity) * 100);
        }
      } else {
        // No charging needed
        const finalEnergy = availableEnergy - totalEnergyNeeded;
        arrivalCharge = Math.round((finalEnergy / selectedVehicle.batteryCapacity) * 100);
      }

      // 11. Set result (arrivalCharge already calculated above)
      setRouteResult({
        distance: Math.round(distanceKm),
        duration: Math.round(durationMin),
        geometry: route.geometry,
        chargingStops,
        totalChargingTime: Math.round(totalChargingTime),
        totalChargingCost: Math.round(totalChargingCost),
        arrivalCharge: Math.max(0, Math.min(100, arrivalCharge)),
        energyUsed: Math.round(totalEnergyNeeded * 10) / 10,
        efficiency: Math.round(energyResult.efficiency * 1000) / 10,
      });

      // 12. Draw on map
      if (map.current) {
        drawOnMap(route.geometry, origin, destination, chargingStops);
      }

    } catch (err) {
      console.error("Route calculation error:", err);
      setError("Rota hesaplanırken bir hata oluştu.");
    } finally {
      setCalculating(false);
      setWeatherLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} dk`;
    return `${hours} sa ${mins} dk`;
  };

  // ===== RENDER =====
  return (
    <div className="h-screen flex flex-col bg-white dark:bg-[#000000]">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900 flex-shrink-0">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex flex-col">
              <span className="text-zinc-400 text-[9px] font-bold tracking-[0.3em] uppercase">Navigation</span>
              <h1 className="text-lg font-light text-zinc-900 dark:text-white tracking-tight">Route Planner</h1>
            </div>
          </div>
          <Route className="w-5 h-5 text-emerald-500" />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden h-full">
        {/* Sidebar */}
        <div className="w-full md:w-[420px] bg-white dark:bg-zinc-950 overflow-y-auto flex-shrink-0 border-r border-zinc-100 dark:border-zinc-900">
          <div className="p-6 space-y-6">
            {/* Origin */}
            <div>
              <label className="block text-zinc-400 text-[10px] font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                <Circle className="w-3 h-3 text-emerald-500" />
                Origin
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={originSearch}
                  onChange={(e) => { setOriginSearch(e.target.value); searchLocation(e.target.value, "origin"); }}
                  placeholder="Search city or address..."
                  className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-light placeholder:text-zinc-400"
                />
                {searchingOrigin && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />}
                {originResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl z-10 max-h-60 overflow-y-auto">
                    {originResults.map((result, index) => (
                      <button key={index} onClick={() => selectLocation(result, "origin")} className="w-full px-5 py-4 text-left text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center gap-3 first:rounded-t-2xl last:rounded-b-2xl">
                        <MapPin className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        <span className="truncate text-sm font-light">{result.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-zinc-400 text-[10px] font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                <Flag className="w-3 h-3 text-red-500" />
                Destination
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={destinationSearch}
                  onChange={(e) => { setDestinationSearch(e.target.value); searchLocation(e.target.value, "destination"); }}
                  placeholder="Search city or address..."
                  className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-light placeholder:text-zinc-400"
                />
                {searchingDestination && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />}
                {destinationResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl z-10 max-h-60 overflow-y-auto">
                    {destinationResults.map((result, index) => (
                      <button key={index} onClick={() => selectLocation(result, "destination")} className="w-full px-5 py-4 text-left text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center gap-3 first:rounded-t-2xl last:rounded-b-2xl">
                        <MapPin className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                        <span className="truncate text-sm font-light">{result.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Selection */}
            <div>
              <label className="block text-zinc-400 text-[10px] font-bold tracking-widest uppercase mb-3 flex items-center gap-2">
                <Car className="w-3 h-3" />
                Vehicle
              </label>
              <button onClick={() => setShowVehicleSelect(!showVehicleSelect)} className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-left flex items-center justify-between hover:border-zinc-200 dark:hover:border-zinc-700 transition-all">
                <span className="font-light">{selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "Select vehicle"}</span>
                <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${showVehicleSelect ? "rotate-90" : ""}`} />
              </button>
              {showVehicleSelect && (
                <div className="mt-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 space-y-4">
                  {/* Mode Toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setVehicleSearchMode("local")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${vehicleSearchMode === "local"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-200 text-zinc-700 hover:bg-gray-300"
                        }`}
                    >
                      Kayıtlı ({localVehicles.length})
                    </button>
                    <button
                      onClick={() => setVehicleSearchMode("api")}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${vehicleSearchMode === "api"
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-200 text-zinc-700 hover:bg-gray-300"
                        }`}
                    >
                      API Ara
                    </button>
                  </div>

                  {/* Local Vehicle Selection */}
                  {vehicleSearchMode === "local" && (
                    <>
                      <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="w-full bg-gray-200 text-zinc-900 rounded-lg px-3 py-2 text-sm">
                        <option value="">Marka seçin</option>
                        {loadingSupabase ? (
                          <option disabled>Yükleniyor...</option>
                        ) : (
                          supabaseBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)
                        )}
                      </select>
                      {selectedBrand && (
                        <select
                          value={selectedVehicle?.id || ""}
                          onChange={(e) => {
                            // Önce Supabase'den ara
                            const supabaseVehicle = supabaseVehicles.find(v => v.id === e.target.value);
                            if (supabaseVehicle) {
                              // Supabase verisini local Vehicle formatına çevir
                              const convertedVehicle: Vehicle = {
                                id: supabaseVehicle.id,
                                brand: supabaseVehicle.make,
                                model: `${supabaseVehicle.model} ${supabaseVehicle.variant || ''}`.trim(),
                                year: "2024", // Default
                                batteryCapacity: supabaseVehicle.battery_kwh,
                                maxDCPower: supabaseVehicle.charge_dc_kw,
                                maxACPower: 11, // Default
                                connectors: [supabaseVehicle.connector_type],
                                range: supabaseVehicle.range_wltp_km,
                                massKg: 2100, // Average EV weight
                                dragCoefficient: 0.28,
                                frontalArea: 2.5,
                                rollingResistance: 0.010,
                                drivetrainEfficiency: 0.90,
                                regenEfficiency: 0.70,
                                hvacPowerKw: 2.5,
                                batteryHeatingKw: 5,
                                optimalBatteryTempC: 25,
                                tempEfficiencyLoss: 8, // 8% per 10°C
                                chargingCurve: [], // Will use default curve
                              };
                              setSelectedVehicle(convertedVehicle);
                            } else {
                              // Fallback: local vehicles
                              const vehicle = localVehicles.find(v => v.id === e.target.value);
                              setSelectedVehicle(vehicle || null);
                            }
                            setShowVehicleSelect(false);
                          }}
                          className="w-full bg-gray-200 text-zinc-900 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="">Model seçin</option>
                          {supabaseVehicles
                            .filter(v => v.make === selectedBrand)
                            .map(vehicle => (
                              <option key={vehicle.id} value={vehicle.id}>
                                {vehicle.model} {vehicle.variant} ({vehicle.range_wltp_km} km)
                              </option>
                            ))}
                        </select>
                      )}
                    </>
                  )}

                  {/* API Vehicle Search */}
                  {vehicleSearchMode === "api" && (
                    <>
                      <select value={selectedBrand} onChange={(e) => { setSelectedBrand(e.target.value); setApiModelSearch(""); }} className="w-full bg-gray-200 text-zinc-900 rounded-lg px-3 py-2 text-sm">
                        <option value="">Marka seçin</option>
                        {SUPPORTED_MAKES.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                      </select>
                      {selectedBrand && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={apiModelSearch}
                            onChange={(e) => setApiModelSearch(e.target.value)}
                            placeholder="Model adı yazın (örn: Model 3)"
                            className="w-full bg-gray-200 text-zinc-900 rounded-lg px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => fetchVehicleFromAPI(selectedBrand, apiModelSearch)}
                            disabled={!apiModelSearch.trim() || apiLoading}
                            className="w-full bg-emerald-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {apiLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Aranıyor...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                API&apos;den Getir
                              </>
                            )}
                          </button>
                          {apiError && (
                            <p className="text-red-500 text-xs">{apiError}</p>
                          )}
                          <p className="text-gray-500 text-xs">
                            Model adını tam yazın: "Model 3", "IONIQ 5", "ID.4" gibi
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              {selectedVehicle && (
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
                  <span className="flex items-center gap-1"><Battery className="w-3 h-3" />{selectedVehicle.batteryCapacity} kWh</span>
                  <span className="flex items-center gap-1"><Navigation className="w-3 h-3" />{selectedVehicle.range} km</span>
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{selectedVehicle.maxDCPower} kW DC</span>
                </div>
              )}
            </div>

            {/* Charge Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 text-xs mb-1">Mevcut Şarj</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="10" max="100" value={currentCharge} onChange={(e) => setCurrentCharge(Number(e.target.value))} className="flex-1 accent-emerald-500" />
                  <span className="text-zinc-900 text-sm w-12 text-right">%{currentCharge}</span>
                </div>
              </div>
              <div>
                <label className="block text-gray-500 text-xs mb-1">Min. Varış Şarjı</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="10" max="50" value={minArrivalCharge} onChange={(e) => setMinArrivalCharge(Number(e.target.value))} className="flex-1 accent-emerald-500" />
                  <span className="text-zinc-900 text-sm w-12 text-right">%{minArrivalCharge}</span>
                </div>
              </div>
            </div>

            {/* Trip Settings */}
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
              <h3 className="text-zinc-900 dark:text-white font-medium mb-4 flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4 text-zinc-400" />
                Trip Configuration
              </h3>
              <div className="space-y-4">
                {/* Passengers */}
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold tracking-widest uppercase mb-2 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Passengers
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="1" max="5" value={passengerCount} onChange={(e) => setPassengerCount(Number(e.target.value))} className="flex-1 accent-emerald-500" />
                    <span className="text-zinc-900 dark:text-white text-sm font-medium w-8 text-right tabular-nums">{passengerCount}</span>
                  </div>
                </div>
                {/* Luggage */}
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold tracking-widest uppercase mb-2 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Luggage (kg)
                  </label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="100" step="10" value={luggageKg} onChange={(e) => setLuggageKg(Number(e.target.value))} className="flex-1 accent-emerald-500" />
                    <span className="text-zinc-900 dark:text-white text-sm font-medium w-12 text-right tabular-nums">{luggageKg} kg</span>
                  </div>
                </div>
                {/* HVAC Mode */}
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold tracking-widest uppercase mb-2">Climate</label>
                  <div className="flex gap-2">
                    {(["auto", "eco", "off"] as const).map((mode) => (
                      <button key={mode} onClick={() => setHvacMode(mode)} className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition ${hvacMode === mode ? "bg-emerald-500 text-white" : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"}`}>
                        {mode === "auto" ? "Auto" : mode === "eco" ? "Eco" : "Off"}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Driving Style */}
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold tracking-widest uppercase mb-2">Drive Mode</label>
                  <div className="flex gap-2">
                    {(["eco", "normal", "sport"] as const).map((style) => (
                      <button key={style} onClick={() => setDrivingStyle(style)} className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition ${drivingStyle === style ? "bg-emerald-500 text-white" : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"}`}>
                        {style === "eco" ? "Eco" : style === "normal" ? "Normal" : "Sport"}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Optimization Strategy */}
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold tracking-widest uppercase mb-2">Charging Strategy</label>
                  <div className="flex gap-2">
                    {(["fastest", "fewest", "cheapest"] as const).map((s) => (
                      <button key={s} onClick={() => setStrategy(s)} className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-xl transition ${strategy === s ? "bg-emerald-500 text-white" : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"}`}>
                        {s === "fastest" ? "Fastest" : s === "fewest" ? "Fewest" : "Cheapest"}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-2">
                    {strategy === "fastest" && "Minimizes total travel time"}
                    {strategy === "fewest" && "Minimizes number of stops"}
                    {strategy === "cheapest" && "Minimizes charging cost"}
                  </p>
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
            <button onClick={() => calculateRoute()} disabled={calculating || !origin || !destination || !selectedVehicle} className="w-full py-4 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:cursor-not-allowed text-white dark:text-black rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-zinc-900/10 dark:shadow-white/10">
              {calculating ? (<><Loader2 className="w-4 h-4 animate-spin" />Calculating...</>) : (<><Route className="w-4 h-4" />Calculate Route</>)}
            </button>

            {/* Weather Loading */}
            {weatherLoading && (
              <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching weather data...
              </div>
            )}

            {/* Weather Display */}
            {routeWeather && (
              <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5">
                <h3 className="text-zinc-900 dark:text-white font-medium mb-4 flex items-center gap-2 text-sm">
                  <Thermometer className="w-4 h-4 text-blue-500" />
                  Route Weather
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="text-gray-500 text-xs">Sıcaklık</div>
                      <div className="text-zinc-900 font-medium">{routeWeather.average.temperature}°C</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="w-5 h-5 text-cyan-500" />
                    <div>
                      <div className="text-gray-500 text-xs">Rüzgar</div>
                      <div className="text-zinc-900 font-medium">
                        {routeWeather.average.headwindComponent > 0 ? "Karşı " : routeWeather.average.headwindComponent < 0 ? "Arkadan " : ""}
                        {Math.abs(Math.round(routeWeather.average.headwindComponent))} km/h
                      </div>
                    </div>
                  </div>
                  {routeWeather.conditions.isRainy && (
                    <div className="flex items-center gap-2 col-span-2">
                      <Droplets className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="text-gray-500 text-xs">Yağış</div>
                        <div className="text-zinc-900 font-medium">
                          {routeWeather.conditions.rainIntensity === 1 ? "Hafif" : routeWeather.conditions.rainIntensity === 2 ? "Orta" : "Şiddetli"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {routeWeather.warnings.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200 space-y-1">
                    {routeWeather.warnings.map((warning, idx) => (
                      <div key={idx} className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">{warning}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Route Result */}
            {routeResult && selectedVehicle && (
              <div className="space-y-4">
                {/* Strategy Comparison */}
                {comparisonResults && (
                  <RouteComparison
                    results={comparisonResults}
                    selectedStrategy={strategy}
                    onSelect={(s) => {
                      setStrategy(s);
                      // Re-calculate with new strategy immediately
                      calculateRoute(s);
                    }}
                  />
                )}

                {/* NEW: Beautiful Journey Component */}
                <RouteJourney
                  origin={origin?.name || "Başlangıç"}
                  destination={destination?.name || "Varış"}
                  totalDistance={routeResult.distance}
                  totalDuration={routeResult.duration}
                  totalChargingTime={routeResult.totalChargingTime}
                  totalChargingCost={routeResult.totalChargingCost}
                  startCharge={currentCharge}
                  arrivalCharge={routeResult.arrivalCharge}
                  energyUsed={routeResult.energyUsed || 0}
                  efficiency={routeResult.efficiency || 0}
                  chargingStops={routeResult.chargingStops}
                  vehicleName={`${selectedVehicle.brand} ${selectedVehicle.model}`}
                  vehicleRange={selectedVehicle.range}
                  batteryCapacity={selectedVehicle.batteryCapacity}
                />

                {/* Weather Analysis Component */}
                <RouteWeatherAnalysis
                  routeCoordinates={routeResult.geometry.coordinates}
                  vehicleSpecs={{ batteryCapacity: selectedVehicle.batteryCapacity, range: selectedVehicle.range }}
                />

                {/* Chat Hub Button */}
                {routeResult.chargingStops.length > 0 && (
                  <button onClick={() => setShowChatHub(true)} className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition flex items-center justify-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Durak Chat&apos;lerine Katıl
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div ref={mapContainer} className="flex-1 min-h-[400px] md:min-h-0" style={{ background: "#e5e5e5" }} />
      </div>

      {/* Route Chat Hub */}
      {routeResult && routeResult.chargingStops.length > 0 && (
        <RouteChatHub chargingStops={routeResult.chargingStops} isOpen={showChatHub} onClose={() => setShowChatHub(false)} />
      )}
    </div>
  );
}
