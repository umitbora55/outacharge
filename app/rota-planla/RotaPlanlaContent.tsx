"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import {
  ArrowLeft, MapPin, Navigation, Zap, Battery, Clock, Car,
  ChevronRight, Loader2, Route, AlertCircle, Check,
  Circle, Flag, Settings,
  X, MessageCircle
} from "lucide-react";
import { getElevationProfile, elevationStats, gradeEnergyKwhFromProfile, energyBetweenKm, consumptionAtSpeed } from "@/lib/terrain";
import { useAuth } from "@/lib/auth";
import { vehicles, vehiclesByBrand, brands, Vehicle } from "@/data/vehicles";
import RouteWeatherAnalysis from "../components/RouteWeatherAnalysis";
import RouteChatHub from "../components/RouteChatHub";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// ===== ROUTE GEOMETRY HELPERS (Gerçek Geometri Hesaplamaları) =====
type LngLat = [number, number];

// İki nokta arasındaki gerçek mesafeyi hesaplar (Haversine Formülü)
function haversineKm(a: LngLat, b: LngLat): number {
  const toRad = (d: number) => (d * Math.PI) / 180;

  const [lng1, lat1] = a;
  const [lng2, lat2] = b;

  const R = 6371; // Dünya yarıçapı (km)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const sLat1 = toRad(lat1);
  const sLat2 = toRad(lat2);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(sLat1) * Math.cos(sLat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

// Rota çizgisi boyunca belirli aralıklarla (stepKm) örnek noktalar alır
function samplePointsAlongRoute(
  coords: LngLat[],
  stepKm: number
): { lng: number; lat: number; atKm: number; idx: number }[] {
  if (!coords || coords.length < 2) return [];

  const points: { lng: number; lat: number; atKm: number; idx: number }[] = [];
  let acc = 0; // Son örnekten beri biriken mesafe
  let total = 0;

  // İlk noktayı her zaman ekle
  points.push({ lng: coords[0][0], lat: coords[0][1], atKm: 0, idx: 0 });

  for (let i = 1; i < coords.length; i++) {
    const segKm = haversineKm(coords[i - 1], coords[i]);
    total += segKm;
    acc += segKm;

    if (acc >= stepKm) {
      points.push({
        lng: coords[i][0],
        lat: coords[i][1],
        atKm: Math.round(total * 10) / 10,
        idx: i,
      });
      acc = 0;
    }
  }

  // Son nokta eksik kalmasın (eğer son örneklemeye denk gelmediyse)
  const last = coords.length - 1;
  const lastPt = points[points.length - 1];
  if (!lastPt || lastPt.idx !== last) {
    points.push({
      lng: coords[last][0],
      lat: coords[last][1],
      atKm: Math.round(total * 10) / 10,
      idx: last,
    });
  }

  return points;
}

// Rotanın toplam gerçek uzunluğunu hesaplar
function routeDistanceKm(coords: LngLat[]): number {
  if (!coords || coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) total += haversineKm(coords[i - 1], coords[i]);
  return total;
}

function pointToSegmentDistanceKm(p: LngLat, a: LngLat, b: LngLat): number {
  // Equirectangular approx (fast) -> convert degrees to km-ish plane around p latitude
  const toRad = (d: number) => (d * Math.PI) / 180;
  const lat0 = toRad(p[1]);
  const kx = 111.320 * Math.cos(lat0); // km per degree lon
  const ky = 110.574;                  // km per degree lat

  const px = (p[0]) * kx;
  const py = (p[1]) * ky;
  const ax = (a[0]) * kx;
  const ay = (a[1]) * ky;
  const bx = (b[0]) * kx;
  const by = (b[1]) * ky;

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const ab2 = abx * abx + aby * aby;
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));

  const cx = ax + t * abx;
  const cy = ay + t * aby;

  const dx = px - cx;
  const dy = py - cy;

  return Math.sqrt(dx * dx + dy * dy);
}

function distanceToPolylineKm(route: LngLat[], p: LngLat): { minKm: number; segIdx: number } {
  let minKm = Infinity;
  let segIdx = 0;
  for (let i = 1; i < route.length; i++) {
    const d = pointToSegmentDistanceKm(p, route[i - 1], route[i]);
    if (d < minKm) {
      minKm = d;
      segIdx = i - 1;
    }
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

      segments.push({
        fromKm: Math.round(accKm * 10) / 10,
        toKm: Math.round((accKm + km) * 10) / 10,
        speedKmh: Math.round(speed),
      });

      accKm += km;
    }
  }

  return segments;
}

// This function is already imported from "@/lib/terrain".
// If you intend to override or define it locally, please remove the import.
// For now, I'm adding it as per your instruction, but be aware of potential conflicts.
function effectiveChargingPower(soc: number, maxPower: number) {
  if (soc < 55) return maxPower;
  if (soc < 70) return maxPower * 0.7;
  if (soc < 80) return maxPower * 0.45;
  return maxPower * 0.25;
}

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
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
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
  const abortRef = useRef<AbortController | null>(null);

  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [originSearch, setOriginSearch] = useState("");
  const [destinationSearch, setDestinationSearch] = useState("");
  const [originResults, setOriginResults] = useState<{ place_name: string; center: [number, number] }[]>([]);
  const [destinationResults, setDestinationResults] = useState<{ place_name: string; center: [number, number] }[]>([]);
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
  const [showChatHub, setShowChatHub] = useState(false);
  const [strategy, setStrategy] = useState<"fastest" | "fewest">("fastest");

  // Unmount cleanup
  useEffect(() => {
    return () => {
      abortRef.current?.abort(); // unmount olunca fetchleri iptal et
    };
  }, []);

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

    // Wait for container to have dimensions
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
          map.current.on("load", () => {
            map.current?.resize();
          });
        }
      }, 100);
      return () => {
        clearTimeout(timer);
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [32.8541, 39.9208],
      zoom: 6,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.on("load", () => {
      map.current?.resize();
    });

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
      if (type === "origin") {
        setOriginResults([]);
      } else {
        setDestinationResults([]);
      }
      return;
    }

    if (type === "origin") {
      setSearchingOrigin(true);
    } else {
      setSearchingDestination(true);
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=TR&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      );
      const data = await response.json();

      if (data.features) {
        if (type === "origin") {
          setOriginResults(data.features);
        } else {
          setDestinationResults(data.features);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      if (type === "origin") {
        setSearchingOrigin(false);
      } else {
        setSearchingDestination(false);
      }
    }
  };

  // Select location
  const selectLocation = (feature: { place_name: string; center: [number, number] }, type: "origin" | "destination") => {
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
  const fetchStationsAlongRoute = useCallback(async (coordinates: [number, number][]) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const stations: any[] = []; // Geçici olarak any, yapıyı bozmamak için

    // 1. ADIM: Rota üzerinde gerçek 50km'lik örnek noktalar al
    const samplePoints = samplePointsAlongRoute(coordinates, 50);

    // LOGLARI BAS
    console.log("===== ROTA GEOMETRİ ANALİZİ BAŞLANGIÇ =====");
    console.log(`[route] Polyline nokta sayısı: ${coordinates.length}`);
    console.log(`[route] Gerçek hesaplanan mesafe: ${routeDistanceKm(coordinates).toFixed(1)} km`);

    const maxSample = samplePoints.length;
    const corridorKm = strategy === "fastest" ? 4 : 10;

    for (const sp of samplePoints.slice(0, maxSample)) {
      if (ac.signal.aborted) return [];
      try {
        const response = await fetch(
          `https://api.openchargemap.io/v3/poi/?output=json&countrycode=TR&latitude=${sp.lat}&longitude=${sp.lng}&distance=30&distanceunit=KM&maxresults=50&compact=true&verbose=false&key=${process.env.NEXT_PUBLIC_OCM_API_KEY}`,
          { signal: ac.signal }
        );
        const data = await response.json();

        for (const item of data) {
          const id = item.ID;
          if (stations.find(s => s.id === id)) continue;

          const connections = item.Connections || [];
          const maxPower = Math.max(...connections.map((c: any) => c.PowerKW || 0), 0);
          const powerType = connections.some((c: any) => c.CurrentTypeID === 30) ? "DC" : "AC";

          const lat = item.AddressInfo?.Latitude;
          const lng = item.AddressInfo?.Longitude;
          if (typeof lat !== "number" || typeof lng !== "number") continue;

          if (maxPower < 50) continue;         // min power
          if (powerType !== "DC") continue;    // MVP: DC only

          const { minKm, segIdx } = distanceToPolylineKm(coordinates, [lng, lat]);
          if (minKm > corridorKm) continue;

          stations.push({
            id,
            name: item.AddressInfo?.Title || "Bilinmeyen İstasyon",
            operator: item.OperatorInfo?.Title || "Bilinmeyen",
            lat,
            lng,
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

    // Build a small candidate set: best 3 per 50km by distanceToRoute (fast filter)
    const candWindowKm = 50;
    const perWindowCandidates = 3;

    const candBuckets = new Map<number, any[]>();
    for (const s of stations) {
      const key = Math.floor(s.routeProgressKm / candWindowKm);
      const arr = candBuckets.get(key) || [];
      arr.push(s);
      candBuckets.set(key, arr);
    }

    const candidates: any[] = [];
    for (const arr of candBuckets.values()) {
      arr.sort((a, b) => (a.distanceToRouteKm - b.distanceToRouteKm));
      candidates.push(...arr.slice(0, perWindowCandidates));
    }

    // Compute detourMin for candidates only
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

    // Update map source safely
    if (!ac.signal.aborted && map.current) {
      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: stations.map((s: any) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lng, s.lat] },
          properties: { name: s.name, power: s.power },
        })),
      };
      updateStationsSource(geojson);
    }

    return stations;
  }, [strategy]);

  const ensureStationsLayer = () => {
    const m = map.current;
    if (!m) return false;
    if (!m.isStyleLoaded()) return false;

    // source yoksa ekle
    if (!m.getSource("stations")) {
      m.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      m.addLayer({
        id: "stations",
        type: "circle",
        source: "stations",
        paint: {
          "circle-radius": 6,
          "circle-color": "#10b981",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }

    return true;
  };

  const updateStationsSource = (geojson: GeoJSON.FeatureCollection) => {
    const m = map.current;
    if (!m) return;

    // style hazır değilse load eventini bekle
    if (!m.isStyleLoaded()) {
      m.once("load", () => {
        if (!ensureStationsLayer()) return;
        const src = m.getSource("stations") as mapboxgl.GeoJSONSource | undefined;
        src?.setData(geojson as any);
      });
      return;
    }

    if (!ensureStationsLayer()) return;
    const src = m.getSource("stations") as mapboxgl.GeoJSONSource | undefined;
    src?.setData(geojson as any);
  };

  const drawOnMap = (routeGeo: any, origin: Location, destination: Location, chargingStops: ChargingStop[]) => {
    const m = map.current;
    if (!m) return;

    const applyRoute = () => {
      const feature: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: routeGeo,
      };

      // source varsa sadece setData
      const src = m.getSource("route") as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData(feature as any);
        return;
      }

      // source yoksa ekle + layer ekle
      m.addSource("route", { type: "geojson", data: feature as any });

      const beforeId =
        m.getLayer("road-label")?.id ||
        m.getLayer("waterway-label")?.id ||
        (m.getStyle().layers || []).find(l => l.type === "symbol")?.id;

      m.addLayer(
        {
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#10b981",
            "line-width": 5,
            "line-opacity": 1,
          },
        },
        beforeId
      );
    };

    // 🔥 asıl kritik: "load" eventine güvenme, retry ile garantiye al
    const tryApply = (attempt = 0) => {
      try {
        applyRoute();
        console.log("[route] applied OK");
      } catch (e) {
        // Style not loaded / cannot add source gibi durumlar
        if (attempt < 30) {
          requestAnimationFrame(() => tryApply(attempt + 1));
        } else {
          console.error("[route] apply failed after retries", e);
        }
      }
    };

    tryApply();

    // marker'lar
    try {
      markersRef.current.forEach((m) => { try { m.remove(); } catch { } });
      markersRef.current = [];

      const mkEl = (bg: string, text?: string) => {
        const el = document.createElement("div");
        el.style.width = "22px";
        el.style.height = "22px";
        el.style.borderRadius = "9999px";
        el.style.background = bg;
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.35)";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.color = "white";
        el.style.fontWeight = "700";
        el.style.fontSize = "12px";
        el.style.zIndex = "9999";
        el.innerText = text ?? "";
        return el;
      };

      const addMarker = (lng: number, lat: number, el: HTMLElement) => {
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(m);
        markersRef.current.push(marker);
      };

      addMarker(origin.lng, origin.lat, mkEl("#3b82f6", "A"));
      addMarker(destination.lng, destination.lat, mkEl("#ef4444", "B"));
      chargingStops.forEach((stop, idx) => addMarker(stop.station.lng, stop.station.lat, mkEl("#10b981", String(idx + 1))));
    } catch (e) {
      console.log("[map] marker phase FAILED", e);
    }

    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([origin.lng, origin.lat]);
    bounds.extend([destination.lng, destination.lat]);
    chargingStops.forEach(s => bounds.extend([s.station.lng, s.station.lat]));

    m.resize();
    m.fitBounds(bounds, { padding: 50, duration: 800 });
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
        `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&overview=full&steps=true&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
      );
      const routeData = await routeResponse.json();

      if (!routeData.routes || routeData.routes.length === 0) {
        setError("Rota bulunamadı.");
        setCalculating(false);
        return;
      }

      const route = routeData.routes[0];
      const speedProfile = buildSpeedProfile(route);

      console.log("[speed-profile]");
      speedProfile.slice(0, 10).forEach(s => {
        console.log(`km ${s.fromKm}–${s.toKm}: ${s.speedKmh} km/h`);
      });

      const distanceKm = route.distance / 1000;
      const durationMin = route.duration / 60;

      // Calculate if charging is needed
      const consumption = selectedVehicle.batteryCapacity / selectedVehicle.range;
      const energyNeeded = distanceKm * consumption;
      const availableEnergy = (currentCharge / 100) * selectedVehicle.batteryCapacity;
      const minEnergyAtArrival = (minArrivalCharge / 100) * selectedVehicle.batteryCapacity;
      const usableEnergy = availableEnergy - minEnergyAtArrival;

      if (usableEnergy <= 0) {
        setError(`Mevcut şarj (%${currentCharge}) min. varış şarjından (%${minArrivalCharge}) düşük. Min varış şarjını düşür veya başlangıçta daha fazla şarj et.`);
        setCalculating(false);
        return;
      }

      // Prepare elevation profile and energy parameters for terrain-aware calculation
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
      const profile = await getElevationProfile(route.geometry.coordinates, token, 50, routeDistanceKm);
      const massKg = (selectedVehicle as any).massKg ?? 1700;
      const drivetrainEff = (selectedVehicle as any).drivetrainEfficiency ?? 0.9;
      const regenEff = (selectedVehicle as any).regenEfficiency ?? 0.65;

      const chargingStops: ChargingStop[] = [];
      let totalChargingTime = 0;
      let totalChargingCost = 0;

      if (energyNeeded > usableEnergy) {
        console.log("[speed-adjusted-consumption]");
        speedProfile.slice(0, 8).forEach(s => {
          const adj = consumptionAtSpeed(consumption, s.speedKmh);
          console.log(
            `km ${s.fromKm}-${s.toKm} @ ${s.speedKmh} km/h → ${adj.toFixed(3)} kWh/km`
          );
        });

        // Need charging stops
        const stations = await fetchStationsAlongRoute(route.geometry.coordinates);

        console.log("[stations] fetched total:", stations.length);

        let currentEnergy = availableEnergy;
        let lastStopProgressKm = 0;
        let currentSoC = currentCharge;

        // Use route order: sort by progress along route
        const ordered = [...stations].sort((a, b) => a.routeProgressKm - b.routeProgressKm);

        // Only consider stations ahead on the route (skip early-city noise)
        const startKm = 30; // ignore first 30km for intercity suggestions
        const candidates = ordered.filter(s => s.routeProgressKm >= startKm);

        console.log("[plan] start", {
          routeKm: distanceKm,
          consumptionKwhPerKm: consumption,
          availableEnergyKwh: availableEnergy,
          usableEnergyKwh: usableEnergy,
          currentCharge,
          minArrivalCharge,
          candidates: candidates.length,
        });

        let dbg = 0;

        for (const station of candidates) {
          const deltaKm = Math.max(0, station.routeProgressKm - lastStopProgressKm);
          if (deltaKm < 20) continue; // 20 km'den kısa stop ASLA alma (şehir içi spam koruması)
          // terrain-aware energy calculation
          const stationProgress = station.routeProgressKm;
          const energyToStationResult = energyBetweenKm(
            lastStopProgressKm,
            stationProgress,
            profile,
            consumption,
            speedProfile,
            massKg,
            drivetrainEff,
            regenEff
          );
          const energyToStation = energyToStationResult.netKwh;
          const chargeAtStation = ((currentEnergy - energyToStation) / selectedVehicle.batteryCapacity) * 100;

          if (dbg < 8) {
            console.log("[plan] probe", {
              atKm: station.routeProgressKm,
              name: station.name,
              deltaKm: Math.round(deltaKm),
              chargeAtStation: Math.round(chargeAtStation),
              detourMin: station.detourMin,
              power: station.power,
            });
            dbg++;
          }

          // If we would arrive too low, plan a stop here
          if (chargeAtStation < minArrivalCharge + 10 && chargeAtStation > 0) {
            console.log("[plan] STOP_SELECTED", { atKm: station.routeProgressKm, name: station.name, chargeAtStation: Math.round(chargeAtStation) });
            console.log("[next-leg-preview]", {
              fromKm: lastStopProgressKm,
              toKm: station.routeProgressKm,
              energyNeededKwh: energyToStation.toFixed(2),
              arrivalSoC: Math.round(chargeAtStation),
            });
            const provisionalSoC = strategy === "fastest" ? 65 : 90;
            const provisionalEnergy = (provisionalSoC / 100) * selectedVehicle.batteryCapacity;

            const pickBridgeStation = (fromKm: number, candidates: any[]) => {
              const windows = [
                { min: 60, max: 140 },   // hedef band
                { min: 40, max: 170 },   // genişlet
                { min: 20, max: 200 },   // daha da genişlet
              ];

              for (const w of windows) {
                const pool = candidates.filter(s =>
                  (s.routeProgressKm - fromKm) >= w.min &&
                  (s.routeProgressKm - fromKm) <= w.max
                );

                if (pool.length > 0) {
                  // score: detourMin (küçük iyi), power (büyük iyi)
                  pool.sort((a, b) => {
                    const da = (a.detourMin ?? 999);
                    const db = (b.detourMin ?? 999);
                    if (da !== db) return da - db;
                    return (b.power ?? 0) - (a.power ?? 0);
                  });
                  return pool[0];
                }
              }
              return null;
            };

            // 1) next leg hedefini bul (bir sonraki "zorunlu durak" ya da varış)
            let nextKm: number | null = null;

            for (let j = candidates.findIndex(s => s.id === station.id) + 1; j < candidates.length; j++) {
              const s2 = candidates[j];

              if (
                strategy === "fastest" &&
                (s2.routeProgressKm - stationProgress) >= 20 &&
                (s2.routeProgressKm - stationProgress) <= 120 &&
                s2.power >= 120 &&
                (s2.detourMin ?? 999) <= 10
              ) {
                nextKm = s2.routeProgressKm;
                break;
              }
              const e = energyBetweenKm(
                stationProgress,          // <-- DİKKAT: buradan itibaren
                s2.routeProgressKm,
                profile,
                consumption,
                speedProfile,
                massKg,
                drivetrainEff,
                regenEff
              ).netKwh;

              const socAtS2 = ((provisionalEnergy - e) / selectedVehicle.batteryCapacity) * 100;

              if (strategy === "fewest") {
                if (socAtS2 < minArrivalCharge + 10) { // bir sonraki zorunlu stop eşiği
                  nextKm = s2.routeProgressKm;
                  break;
                }
              }
            }

            if (strategy === "fastest" && nextKm === null) {
              const bridge = pickBridgeStation(stationProgress, candidates);
              nextKm = bridge ? bridge.routeProgressKm : Math.min(stationProgress + 120, distanceKm);
            }

            if (strategy === "fewest" && nextKm === null) {
              nextKm = distanceKm;
            }

            // 2) targetSoC: bu istasyondan nextKm’ye + min arrival buffer ile
            const eNext = energyBetweenKm(
              stationProgress,
              nextKm!,
              profile,
              consumption,
              speedProfile,
              massKg,
              drivetrainEff,
              regenEff
            ).netKwh;

            const bufferKwh = (minArrivalCharge / 100) * selectedVehicle.batteryCapacity;
            const requiredSoC = ((eNext + bufferKwh) / selectedVehicle.batteryCapacity) * 100;

            const baseCap = strategy === "fastest" ? 70 : 95;
            const dynamicCap = strategy === "fastest"
              ? (requiredSoC > baseCap ? Math.min(90, Math.ceil(requiredSoC + 3)) : baseCap)
              : 95;
            const targetSoC = Math.min(dynamicCap, Math.max(Math.ceil(requiredSoC + 5), 10));

            console.log("[dynamic-target]", {
              station: station.name,
              stationKm: stationProgress,
              nextKm,
              requiredSoC: Number(requiredSoC.toFixed(1)),
              targetSoC,
            });
            const chargeToAdd = Math.max(0, targetSoC - chargeAtStation);
            const energyToAdd = (chargeToAdd / 100) * selectedVehicle.batteryCapacity;

            const chargingPower = Math.min(station.power, selectedVehicle.maxDCPower);

            // Simulation loop for charging time with curve
            let remainingKwh = energyToAdd;
            let currentTempSoC = chargeAtStation;
            let minutes = 0;

            while (remainingKwh > 0 && currentTempSoC < targetSoC) {
              const power = effectiveChargingPower(currentTempSoC, chargingPower);
              const delta = Math.min(remainingKwh, power / 60); // 1 minute of charging
              remainingKwh -= delta;
              currentTempSoC += (delta / selectedVehicle.batteryCapacity) * 100;
              minutes++;
            }
            const chargingTime = minutes;

            console.log("[charge-curve]", {
              station: station.name,
              arrivalSoC: Math.round(chargeAtStation),
              targetSoC,
              energyToAddKwh: Number(energyToAdd.toFixed(2)),
              minutes: chargingTime,
              detourMin: station.detourMin ?? null,
            });

            const pricePerKwh = station.powerType === "DC" ? 12.5 : 9;
            const chargingCost = energyToAdd * pricePerKwh;

            chargingStops.push({
              station,
              arrivalCharge: Math.round(chargeAtStation),
              departureCharge: targetSoC,
              chargingTime: Math.round(chargingTime),
              chargingCost: Math.round(chargingCost),
              distanceFromPrev: Math.round(deltaKm),
            });

            const detour = station.detourMin ?? 0;
            totalChargingTime += (chargingTime + detour);
            totalChargingCost += chargingCost;

            // update energy state after charging
            currentEnergy = Math.min(
              selectedVehicle.batteryCapacity,
              currentEnergy - energyToStation + energyToAdd
            );
            lastStopProgressKm = station.routeProgressKm;
            currentSoC = targetSoC;

            if (chargingStops.length >= 3) break;
          }
        }

        console.log("[plan] stops selected:", chargingStops.map(s => ({ atKm: s.station.routeProgressKm, name: s.station.name, arrival: s.arrivalCharge })));
      }

      // Calculate arrival charge
      const routeEnergyResult = energyBetweenKm(
        0,
        distanceKm,
        profile,
        consumption,
        speedProfile,
        massKg,
        drivetrainEff,
        regenEff
      );
      const totalEnergyUsed = routeEnergyResult.netKwh;

      const totalEnergyCharged = chargingStops.reduce((sum, stop) =>
        sum + ((stop.departureCharge - stop.arrivalCharge) / 100) * selectedVehicle.batteryCapacity, 0
      );
      const finalEnergy = availableEnergy - totalEnergyUsed + totalEnergyCharged;
      const arrivalCharge = Math.round((finalEnergy / selectedVehicle.batteryCapacity) * 100);

      console.log("[UI] chargingStops length before setRouteResult:", chargingStops.length);
      console.log("[UI] chargingStops preview:", chargingStops.map(s => ({
        name: s.station.name,
        atKm: s.station.routeProgressKm,
        arrival: s.arrivalCharge,
        depart: s.departureCharge,
      })));

      setRouteResult({
        distance: Math.round(distanceKm),
        duration: Math.round(durationMin),
        geometry: route.geometry,
        chargingStops,
        totalChargingTime: Math.round(totalChargingTime),
        totalChargingCost: Math.round(totalChargingCost),
        arrivalCharge: Math.max(0, Math.min(100, arrivalCharge)),
      });

      if (map.current) {
        drawOnMap(route.geometry, origin, destination, chargingStops);
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="w-full px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-zinc-900 transition">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Route className="w-6 h-6 text-emerald-400" />
            Rota Planlayıcı
          </h1>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden h-full">
        {/* Sidebar */}
        <div className="w-full md:w-96 bg-white overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-4">
            {/* Origin */}
            <div>
              <label className="block text-gray-500 text-sm mb-2 flex items-center gap-2">
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
                  className="w-full bg-gray-100 text-zinc-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                {searchingOrigin && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 animate-spin" />
                )}
                {originResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-100 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                    {originResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => selectLocation(result, "origin")}
                        className="w-full px-4 py-3 text-left text-zinc-900 hover:bg-gray-200 transition flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="truncate">{result.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-gray-500 text-sm mb-2 flex items-center gap-2">
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
                  className="w-full bg-gray-100 text-zinc-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                {searchingDestination && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400 animate-spin" />
                )}
                {destinationResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-100 rounded-lg shadow-xl z-10 max-h-60 overflow-y-auto">
                    {destinationResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => selectLocation(result, "destination")}
                        className="w-full px-4 py-3 text-left text-zinc-900 hover:bg-gray-200 transition flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="truncate">{result.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Selection */}
            <div>
              <label className="block text-gray-500 text-sm mb-2 flex items-center gap-2">
                <Car className="w-4 h-4" />
                Araç
              </label>
              <button
                onClick={() => setShowVehicleSelect(!showVehicleSelect)}
                className="w-full bg-gray-100 text-zinc-900 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:bg-gray-200 transition"
              >
                <span>
                  {selectedVehicle
                    ? `${selectedVehicle.brand} ${selectedVehicle.model}`
                    : "Araç seçin"}
                </span>
                <ChevronRight className={`w-5 h-5 transition-transform ${showVehicleSelect ? "rotate-90" : ""}`} />
              </button>

              {showVehicleSelect && (
                <div className="mt-2 bg-gray-100 rounded-lg p-3 space-y-2">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full bg-gray-200 text-zinc-900 rounded-lg px-3 py-2 text-sm"
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
                      className="w-full bg-gray-200 text-zinc-900 rounded-lg px-3 py-2 text-sm"
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
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-4">
                  <span>🔋 {selectedVehicle.batteryCapacity} kWh</span>
                  <span>📏 {selectedVehicle.range} km</span>
                  <span>⚡ {selectedVehicle.maxDCPower} kW DC</span>
                </div>
              )}
            </div>

            {/* Charge Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-500 text-xs mb-1">Mevcut Şarj</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={currentCharge}
                    onChange={(e) => setCurrentCharge(Number(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-zinc-900 text-sm w-12 text-right">%{currentCharge}</span>
                </div>
              </div>
              <div>
                <label className="block text-gray-500 text-xs mb-1">Min. Varış Şarjı</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={minArrivalCharge}
                    onChange={(e) => setMinArrivalCharge(Number(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-zinc-900 text-sm w-12 text-right">%{minArrivalCharge}</span>
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
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-full font-medium transition flex items-center justify-center gap-2"
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
            {routeResult && selectedVehicle && (
              <div className="space-y-4">
                {/* Weather Analysis */}
                <RouteWeatherAnalysis
                  routeCoordinates={routeResult.geometry.coordinates}
                  vehicleSpecs={{
                    batteryCapacity: selectedVehicle.batteryCapacity,
                    range: selectedVehicle.range,
                  }}
                />

                {/* Summary */}
                <div className="bg-gray-100 rounded-xl p-4">
                  <h3 className="text-zinc-900 font-medium mb-3">Rota Özeti</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-emerald-400" />
                      <span className="text-gray-500">Mesafe:</span>
                      <span className="text-zinc-900 font-medium">{routeResult.distance} km</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span className="text-gray-500">Süre:</span>
                      <span className="text-zinc-900 font-medium">{formatDuration(routeResult.duration)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      <span className="text-gray-500">Şarj:</span>
                      <span className="text-zinc-900 font-medium">{formatDuration(routeResult.totalChargingTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Battery className="w-4 h-4 text-emerald-400" />
                      <span className="text-gray-500">Varış:</span>
                      <span className={`font-medium ${routeResult.arrivalCharge < 20 ? "text-red-400" : "text-emerald-400"}`}>
                        %{routeResult.arrivalCharge}
                      </span>
                    </div>
                  </div>
                  {routeResult.totalChargingCost > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300 flex items-center justify-between">
                      <span className="text-gray-500">Tahmini Şarj Maliyeti:</span>
                      <span className="text-emerald-400 font-bold text-lg">₺{routeResult.totalChargingCost}</span>
                    </div>
                  )}
                </div>

                {/* Charging Stops */}
                {routeResult.chargingStops.length > 0 ? (
                  <>
                    <div className="bg-gray-100 rounded-xl p-4">
                      <h3 className="text-zinc-900 font-medium mb-3">Şarj Durakları ({routeResult.chargingStops.length})</h3>
                      <div className="space-y-3">
                        {routeResult.chargingStops.map((stop, index) => (
                          <div key={index} className="bg-white rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-zinc-900 text-xs font-bold">
                                {index + 1}
                              </div>
                              <span className="text-zinc-900 font-medium flex-1 truncate">{stop.station.name}</span>
                            </div>
                            <div className="text-xs text-gray-500 space-y-1">
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

                    {/* Chat Hub Button */}
                    <button
                      onClick={() => setShowChatHub(true)}
                      className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Durak Chat&apos;lerine Katıl
                    </button>
                  </>
                ) : (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                    <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-400 font-medium">Şarj durağı gerekmez!</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Mevcut şarjınızla hedefinize ulaşabilirsiniz.
                    </p>
                  </div>
                )}

                {/* Total Time */}
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Toplam Seyahat Süresi:</span>
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
        <div ref={mapContainer} className="flex-1 min-h-[400px] md:min-h-0" style={{ background: "#e5e5e5" }} />
      </div>

      {/* Route Chat Hub */}
      {routeResult && routeResult.chargingStops.length > 0 && (
        <RouteChatHub
          chargingStops={routeResult.chargingStops}
          isOpen={showChatHub}
          onClose={() => setShowChatHub(false)}
        />
      )}
    </div>
  );
}