"use client";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Search, MapPin, Navigation, Filter, Battery, Zap, Plus, Minus, MoveRight, Layers, Eye, Info, RotateCcw } from "lucide-react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Operatör eşleştirme - istasyon adından operatör tespiti
const operatorPatterns: { pattern: RegExp; name: string }[] = [
  { pattern: /\bzes\b/i, name: "ZES" },
  { pattern: /\beşarj\b|esarj/i, name: "Eşarj" },
  { pattern: /\btrugo\b/i, name: "Trugo" },
  { pattern: /\btesla\b|supercharger/i, name: "Tesla Supercharger" },
  { pattern: /\bvoltrun\b/i, name: "Voltrun" },
  { pattern: /\be-power\b|epower|petrol ofisi/i, name: "Petrol Ofisi e-POwer" },
  { pattern: /\bbeefull\b/i, name: "Beefull" },
  { pattern: /\baksa\s*şarj\b|aksasarj/i, name: "Aksa Şarj" },
  { pattern: /\bsharz\b/i, name: "Sharz.net" },
  { pattern: /\bastor\b/i, name: "Astor Enerji" },
  { pattern: /\benyakit\b|en\s*yakıt/i, name: "En Yakıt" },
  { pattern: /\bg-charge\b|gcharge|gersan/i, name: "G-Charge" },
  { pattern: /\boncharge\b/i, name: "OnCharge" },
  { pattern: /\bwat\b/i, name: "Wat Mobilite" },
];

function detectOperator(stationTitle: string, operatorTitle?: string): string {
  if (operatorTitle && operatorTitle.trim() !== "") return operatorTitle;
  for (const { pattern, name } of operatorPatterns) {
    if (pattern.test(stationTitle)) return name;
  }
  return "Bilinmeyen Operatör";
}

interface Station {
  ID: number;
  AddressInfo: {
    Title: string;
    Latitude: number;
    Longitude: number;
    AddressLine1: string;
  };
  OperatorInfo?: {
    Title: string;
  };
  Connections?: {
    PowerKW: number;
    CurrentTypeID: number;
  }[];
}

export default function TestMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    minPower: 0,
    operator: "Tümü",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [selectedFeature, setSelectedFeature] = useState<any | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  // Use a Ref for the setupLayers function to avoid stale closures in Mapbox events
  const setupLayersRef = useRef<() => void>(() => { });

  // Detect theme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isDark = document.documentElement.classList.contains("dark");
          setTheme(isDark ? "dark" : "light");
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Update map style on theme change
  useEffect(() => {
    if (!map.current) return;
    const style = theme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";
    map.current.setStyle(style);
  }, [theme]);

  const updateSource = useCallback((stationsData: Station[]) => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    // Apply Active Filters
    let filtered = stationsData;

    if (activeFilters.minPower > 0) {
      filtered = filtered.filter(s => {
        const maxPower = Math.max(...(s.Connections?.map(c => c.PowerKW) || [0]));
        return maxPower >= activeFilters.minPower;
      });
    }

    if (activeFilters.operator !== "Tümü") {
      filtered = filtered.filter(s => {
        const op = detectOperator(s.AddressInfo.Title, s.OperatorInfo?.Title);
        return op.toLowerCase().includes(activeFilters.operator.toLowerCase());
      });
    }

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: filtered.map((station) => ({
        type: "Feature",
        id: station.ID, // Top-level ID for feature-state (critical!)
        properties: {
          id: station.ID,
          title: station.AddressInfo.Title,
          operator: detectOperator(station.AddressInfo.Title, station.OperatorInfo?.Title),
          address: station.AddressInfo.AddressLine1 || "",
          power: Math.max(...(station.Connections?.map(c => c.PowerKW) || [0])),
        },
        geometry: {
          type: "Point",
          coordinates: [station.AddressInfo.Longitude, station.AddressInfo.Latitude],
        },
      })),
    };

    const source = map.current.getSource("stations") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(geojson);
    }
  }, [activeFilters]);

  // Store stations data to allow local filtering without refetching
  const [lastFetchedStations, setLastFetchedStations] = useState<Station[]>([]);

  const fetchStations = useCallback(async () => {
    if (!map.current) return;

    setLoading(true);
    try {
      const response = await fetch('/api/stations');

      if (!response.ok) throw new Error("Station fetch failed");
      const data: Station[] = await response.json();
      setLastFetchedStations(data);
      updateSource(data);
    } catch (error) {
      console.error("Error fetching stations:", error);
    } finally {
      setLoading(false);
    }
  }, [updateSource]);


  // Trigger local filter update when activeFilters change
  useEffect(() => {
    updateSource(lastFetchedStations);
  }, [activeFilters, updateSource, lastFetchedStations]);

  // Move layer addition logic to a reusable function
  const setupLayers = useCallback(() => {
    if (!map.current) return;
    const m = map.current;

    // --- 1️⃣ BASE MAP APPEARANCE (Apple Maps Style) - Refined ---
    if (theme === 'light') {
      if (m.getLayer('land')) m.setPaintProperty('land', 'background-color', '#F7F7F8');
      if (m.getLayer('background')) m.setPaintProperty('background', 'background-color', '#F7F7F8');
      if (m.getLayer('water')) m.setPaintProperty('water', 'fill-color', '#E3E4E6');
      if (m.getLayer('admin-1-boundary')) {
        m.setPaintProperty('admin-1-boundary', 'line-color', '#E2E2E5');
        m.setPaintProperty('admin-1-boundary', 'line-width', 0.5);
      }
    }

    // Add Sky for depth
    m.setFog({
      'range': [0.5, 10],
      'color': theme === 'dark' ? '#0F172A' : '#FFFFFF',
      'horizon-blend': 0.05,
      'high-color': theme === 'dark' ? '#020617' : '#E8EAED',
      'space-color': theme === 'dark' ? '#020617' : '#E8EAED',
      'star-intensity': theme === 'dark' ? 0.3 : 0
    });

    // --- 2️⃣ PREMIUM 3D MATTE MARKER (SVG ICON) ---
    // Generates a sharp, 3-layer marker:
    // 1. Tight Drop Shadow (Physical lift, not glow)
    // 2. Main Body (Matte Gradient #1AD59B -> #00C98A)
    // 3. Crisp Edge Highlight (Top-lit white 0.9 -> Bottom-shaded black 0.2)
    const markerSvg = `
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity="0.3"/>
        </filter>
        <circle cx="22" cy="22" r="18" fill="url(#grad)" filter="url(#shadow)"/>
        <circle cx="22" cy="22" r="18" stroke="url(#innerLight)" stroke-width="1.5"/>
        <circle cx="22" cy="22" r="5" fill="white" fill-opacity="0.95"/>
        <defs>
          <linearGradient id="grad" x1="22" y1="4" x2="22" y2="40" gradientUnits="userSpaceOnUse">
            <stop stop-color="#1AD59B"/>
            <stop offset="1" stop-color="#00C98A"/>
          </linearGradient>
          <linearGradient id="innerLight" x1="22" y1="2" x2="22" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="white" stop-opacity="0.9"/>
            <stop offset="0.3" stop-color="white" stop-opacity="0"/>
            <stop offset="0.7" stop-color="black" stop-opacity="0"/>
            <stop offset="1" stop-color="black" stop-opacity="0.2"/>
          </linearGradient>
        </defs>
      </svg>
    `;

    const markeImg = new Image(44, 44);
    markeImg.onload = () => {
      if (!m.hasImage('premium-marker')) {
        m.addImage('premium-marker', markeImg);
      }
    };
    markeImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markerSvg);


    if (!m.getSource("stations")) {
      m.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 24, // Clusters expand only at very high zoom or physical distance
        clusterRadius: 40,
        promoteId: "id" // Critical for feature-state hover effects
      });
    }

    // --- 3️⃣ INTELLIGENT CLUSTERS (Density-Aware) ---
    // Layer 1: Cluster Glow (Soft Halo)
    if (!m.getLayer('clusters-glow')) {
      m.addLayer({
        id: "clusters-glow",
        type: "circle",
        source: "stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "#6EE7B7", 20,  // < 20: Light Green (High Vis, Low Weight)
            "#10B981", 100, // 20-100: Standard Emerald
            "#047857"       // 100+: Deep Emerald (High Weight)
          ],
          "circle-radius": [
            "step", ["get", "point_count"],
            25, 20,
            35, 100,
            50
          ],
          "circle-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.5, 0.35], // Intensify pulse on hover
          "circle-blur": 0.5,
        },
      });
    }

    // Layer 2: Cluster Body (Matte)
    if (!m.getLayer('clusters')) {
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: "stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step", ["get", "point_count"],
            "#34D399", 20,  // < 20: Fresh, Light
            "#00C98A", 100, // 20-100: Primary Matte
            "#064E3B"       // 100+: Heavy, Premium Dark
          ],
          "circle-radius": [
            "*",
            ["step", ["get", "point_count"], 18, 20, 26, 100, 36],
            ["case", ["boolean", ["feature-state", "hover"], false], 1.06, 1] // 6% Scale on Hover
          ],
          "circle-stroke-width": 3,
          "circle-stroke-color": theme === 'dark' ? "#0f172a" : "#ffffff",
          "circle-radius-transition": { duration: 300, delay: 0 }
        },
      });
    }

    // Layer 3: Cluster Text
    if (!m.getLayer('cluster-count')) {
      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "stations",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 14,
          "text-allow-overlap": true
        },
        paint: {
          "text-color": ["case", ["boolean", ["feature-state", "hover"], false], "#E2E2E2", "#ffffff"] // Darken 10% on hover
        }
      });
    }

    // --- 4️⃣ UNCLUSTERED POINTS (Using Premium Icon) ---
    // NOTE: We switched from 'circle' layer to 'symbol' layer to use the SVG icon
    if (!m.getLayer('unclustered-point')) {
      m.addLayer({
        id: "unclustered-point",
        type: "symbol",
        source: "stations",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": "premium-marker",
          "icon-size": 0.8, // Static size (updated dynamically on hover)
          "icon-allow-overlap": true,
          "icon-anchor": "center"
        },
        paint: {
          "icon-opacity": 1,
          // Note: symbol layers animate differently than circles.
          // We use icon-halo or just efficient icon-size transitions if needed.
        }
      });
    }

    // Update the source with existing data if available
    if (lastFetchedStations.length > 0) {
      updateSource(lastFetchedStations);
    }
  }, [theme, lastFetchedStations, updateSource]);

  // Update setupLayersRef whenever setupLayers changes
  useEffect(() => {
    setupLayersRef.current = setupLayers;
  }, [setupLayers]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: document.documentElement.classList.contains("dark") ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11",
      center: [35.2433, 39.0],
      zoom: 5.2,
      pitch: 0,
      bearing: 0,
      antialias: true,
      projection: { name: 'mercator' }
    });

    const m = map.current;

    const onStyleLoad = () => {
      if (setupLayersRef.current) {
        setupLayersRef.current();
      }
    };

    m.on("style.load", onStyleLoad);

    m.on("load", () => {
      // --- 5️⃣ HOVER INTERACTIONS (Hybrid Approach) ---
      // Clusters (Paint) -> Feature State (Performant)
      // Icons (Layout) -> setLayoutProperty (Compatible)

      let hoveredStateId: string | number | null = null;
      let hoveredLayerId: string | null = null;

      const hoverLayers = ["unclustered-point", "clusters"];

      hoverLayers.forEach(layer => {
        m.on("mousemove", layer, (e) => {
          if (e.features && e.features.length > 0) {
            m.getCanvas().style.cursor = "pointer";
            const newId = e.features[0].id;

            // Only proceed if we have a valid ID
            if (newId !== undefined && newId !== null && hoveredStateId !== newId) {
              // Reset previous
              if (hoveredStateId !== null) {
                m.setFeatureState(
                  { source: "stations", id: hoveredStateId },
                  { hover: false }
                );
              }

              // Set new
              hoveredStateId = newId;
              hoveredLayerId = layer;
              m.setFeatureState(
                { source: "stations", id: hoveredStateId },
                { hover: true }
              );

              // SCALE EFFECT FOR ICONS (Layout Property limitation fix)
              if (layer === 'unclustered-point') {
                m.setLayoutProperty('unclustered-point', 'icon-size',
                  ['case', ['==', ['id'], hoveredStateId], 0.85, 0.8]
                );
              }
            }
          }
        });

        m.on("mouseleave", layer, () => {
          m.getCanvas().style.cursor = "";
          if (hoveredStateId !== null) {
            m.setFeatureState(
              { source: "stations", id: hoveredStateId },
              { hover: false }
            );

            // Reset Icon Scale
            if (hoveredLayerId === 'unclustered-point') {
              m.setLayoutProperty('unclustered-point', 'icon-size', 0.8);
            }
          }
          hoveredStateId = null;
          hoveredLayerId = null;
        });
      });

      // Track interaction for Compact Mode
      m.on('movestart', () => setIsInteracting(true));
      m.on('moveend', () => setTimeout(() => setIsInteracting(false), 1500)); // Delay return


      // --- EVENTS ---
      m.on("click", "clusters", (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0].properties!.cluster_id;
        (m.getSource("stations") as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;
            m.easeTo({
              center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: Math.min(zoom!, 18), // Don't zoom too far on cluster click
              duration: 1000,
              easing: (t) => t * (1.1 - t) // Slightly snappier easing
            });
          }
        );
      });

      m.on("click", "unclustered-point", (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates.slice();
        const { title, operator, address, power } = feature.properties as any;

        m.flyTo({
          center: coordinates as [number, number],
          zoom: 16,
          speed: 1.2,
          curve: 1.1,
          essential: true
        });

        setSelectedFeature({
          title, operator, address, power, coordinates
        });
      });

      fetchStations();
    });

    return () => {
      m.off("style.load", onStyleLoad);
      m.remove();
    };
  }, [fetchStations, setIsInteracting]); // Added setIsInteracting to dependencies

  // Handle layer updates when setupLayers changes
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      setupLayers();
    }
  }, [setupLayers]);

  const handleMyLocation = () => {
    if (!navigator.geolocation || !map.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      map.current!.flyTo({
        center: [pos.coords.longitude, pos.coords.latitude],
        zoom: 14,
        pitch: 0,
        speed: 1.5
      });
    });
  };

  const handleResetView = () => {
    if (!map.current) return;
    map.current.flyTo({
      center: [35.2433, 39.0],
      zoom: 5.2,
      pitch: 0,
      bearing: 0,
      speed: 1.2
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || !map.current) return;

    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchTerm)}.json?access_token=${mapboxgl.accessToken}`)
      .then(res => res.json())
      .then(data => {
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          map.current!.flyTo({ center: [lng, lat], zoom: 12, duration: 2000 });
        }
      });
  };

  return (
    <div className="map-page relative w-full h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-900">
      <style jsx global>{`
        .mapboxgl-popup.premium-popup .mapboxgl-popup-content {
          padding: 18px;
          border-radius: 20px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.08),
            0 24px 48px -12px rgba(0, 0, 0, 0.45);
          background: ${theme === 'dark' ? 'rgba(10, 10, 10, 0.85)' : 'rgba(255, 255, 255, 0.85)'};
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
        }
        .mapboxgl-popup.premium-popup .mapboxgl-popup-tip {
          border-top-color: ${theme === 'dark' ? 'rgba(10, 10, 10, 0.85)' : 'rgba(255, 255, 255, 0.85)'};
        }
        /* Hide all Mapbox default controls */
        .mapboxgl-ctrl-bottom-right,
        .mapboxgl-ctrl-bottom-left,
        .mapboxgl-ctrl-top-right,
        .mapboxgl-ctrl-top-left,
        .mapboxgl-ctrl-compass,
        .mapboxgl-ctrl-geolocate,
        .mapboxgl-ctrl-attrib,
        .mapboxgl-ctrl-logo {
           display: none !important;
        }
      `}</style>

      {/* --- SEARCH BAR WRAPPER (Sticky Overlay) --- */}
      <div className="map-search-wrapper sticky z-50 flex justify-center pointer-events-none" style={{ top: '100px' }}>
        <div className={`map-search pointer-events-auto transition-all duration-500 ${isInteracting ? 'compact' : ''
          }`} style={{
            width: 'min(720px, calc(100% - 32px))',
            transform: isInteracting ? 'scale(0.94)' : 'scale(1)',
            opacity: isInteracting ? 0.9 : 1
          }}>
          <div className="relative group">
            <div className="absolute inset-0 bg-white/85 dark:bg-zinc-900/85 rounded-full border border-white/40 dark:border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300 group-hover:bg-white/95 dark:group-hover:bg-zinc-900/95 group-hover:scale-[1.01] overflow-hidden" style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none z-10 w-fit">
                <Search className="w-5 h-5 text-zinc-500 dark:text-zinc-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="İstasyon, lokasyon veya bölge ara..."
                className="w-full h-16 pl-14 pr-32 bg-transparent rounded-full text-base font-medium text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-[3px] focus:ring-emerald-500/20 focus:scale-[1.01] transition-all duration-300"
              />
              <div className="absolute right-2 top-2 bottom-2">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`h-full px-5 rounded-full flex items-center gap-2 font-bold text-xs transition-all duration-300 ${showFilters
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80'
                    }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filtrele</span>
                </button>
              </div>
            </form>
          </div>

          {/* FILTER PANEL */}
          {showFilters && (
            <div className="mt-4 p-5 bg-white/85 dark:bg-zinc-900/85 rounded-[1.5rem] border border-white/40 dark:border-white/5 shadow-[0_20px_48px_rgba(0,0,0,0.2)] animate-in slide-in-from-top-2 duration-300 origin-top" style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    Güç Kapasitesi
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[0, 22, 50, 100].map(p => (
                      <button
                        key={p}
                        onClick={() => setActiveFilters(prev => ({ ...prev, minPower: p }))}
                        className={`h-9 px-4 rounded-xl text-xs font-bold transition-all duration-300 border ${activeFilters.minPower === p
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105'
                          : 'bg-white/50 dark:bg-zinc-800/50 border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700'
                          }`}
                      >
                        {p === 0 ? 'Tümü' : `${p}+ kW`}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Layers className="w-3 h-3" />
                    Operatör Seçimi
                  </label>
                  <div className="relative">
                    <select
                      className="w-full h-10 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md border-none rounded-xl px-4 text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer hover:bg-white dark:hover:bg-zinc-800 transition-colors appearance-none"
                      value={activeFilters.operator}
                      onChange={(e) => setActiveFilters(prev => ({ ...prev, operator: e.target.value }))}
                    >
                      <option>Tümü</option>
                      <option>ZES</option>
                      <option>Eşarj</option>
                      <option>Trugo</option>
                      <option>Tesla</option>
                      <option>Voltrun</option>
                      <option>Astor Enerji</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m1 1 4 4 4-4" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- MAP & CONTROLS CONTAINER --- */}
      <div className="relative w-full h-full">
        {/* SCULPTED FLOATING CONTROLS (RIGHT) */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
          {/* Zoom Controls */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => map.current?.zoomIn()}
              className="w-12 h-12 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-xl rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all duration-300"
              title="Yakınlaştır"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
            <button
              onClick={() => map.current?.zoomOut()}
              className="w-12 h-12 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-xl rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/5 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all duration-300"
              title="Uzaklaştır"
            >
              <Minus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Map Actions */}
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={handleMyLocation}
              className="w-12 h-12 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-xl rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/5 flex items-center justify-center text-emerald-500 hover:text-emerald-600 hover:bg-white dark:hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all duration-300 group"
              title="Konumum"
            >
              <Navigation className="w-5 h-5 stroke-[2.5] group-hover:rotate-12 transition-transform" />
            </button>

            <button
              onClick={handleResetView}
              className="w-12 h-12 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-xl rounded-2xl shadow-[0_8px_16px_rgba(0,0,0,0.1)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/5 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all duration-300 group"
              title="Görünümü Sıfırla"
            >
              <RotateCcw className="w-5 h-5 stroke-[2.5] group-hover:-rotate-90 transition-transform duration-500" />
            </button>
          </div>
        </div>

        {/* BOTTOM LEFT STATUS */}
        <div className="absolute bottom-8 left-8 z-10 flex flex-col gap-2 pointer-events-none">
          {loading && (
            <div className="flex items-center gap-3 bg-zinc-900/80 dark:bg-white/90 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-500 pointer-events-auto">
              <div className="relative">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute opacity-75"></div>
                <div className="w-3 h-3 bg-emerald-500 rounded-full relative shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              </div>
              <span className="text-sm font-bold text-white dark:text-zinc-900 tracking-tight">İstasyonlar Yükleniyor...</span>
            </div>
          )}

          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 dark:border-zinc-800/50 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400 shadow-lg">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Hızlı DC
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Standart AC
            </div>
          </div>
        </div>

        <div ref={mapContainer} className="w-full h-full" />

        {/* --- 10️⃣ ATMOSPHERE (Film Grain Noise) --- */}
        <div className="absolute inset-0 pointer-events-none z-20 opacity-[0.03] dark:opacity-[0.05] mix-blend-overlay"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
        </div>


        {/* --- 8️⃣ INFO CARD (Glassy Bottom Sheet) --- */}
        {selectedFeature && (
          <div className="absolute inset-x-0 bottom-0 z-30 p-4 sm:p-6 flex justify-center pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md bg-white/90 dark:bg-zinc-900/90 backdrop-blur-3xl rounded-[2rem] border border-white/40 dark:border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] overflow-hidden animate-in slide-in-from-bottom-10 duration-500 ease-out">
              {/* Header Image / Gradient Area */}
              <div className="h-24 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
                <button
                  onClick={() => {
                    setSelectedFeature(null);
                    handleResetView();
                  }}
                  className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              </div>

              <div className="p-6 -mt-10 relative">
                {/* Operator Logo/Icon */}
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 shadow-xl flex items-center justify-center mb-4 border-2 border-white dark:border-zinc-700">
                  <Zap className="w-8 h-8 text-emerald-500" />
                </div>

                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-1 leading-tight">{selectedFeature.title}</h3>
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{selectedFeature.operator}</span>
                  <span>•</span>
                  <span>{selectedFeature.power > 0 ? `${selectedFeature.power} kW` : 'N/A'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-white/5">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Durum</span>
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Müsait
                    </div>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-white/5">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">Mesafe</span>
                    <div className="flex items-center gap-1.5 text-zinc-900 dark:text-white font-bold text-sm">
                      <Navigation className="w-3.5 h-3.5" />
                      ~2.4 km
                    </div>
                  </div>
                </div>

                <button className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Rotayı Başlat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
