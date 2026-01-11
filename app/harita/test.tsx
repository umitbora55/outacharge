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
    if (!map.current) return;

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
      const bounds = map.current.getBounds();
      if (!bounds) return;
      const nw = bounds.getNorthWest();
      const se = bounds.getSouthEast();

      const boundingBox = `(${nw.lat},${nw.lng}),(${se.lat},${se.lng})`;

      const response = await fetch(
        `/api/stations?boundingbox=${boundingBox}`
      );

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

    // Add Sky
    m.setFog({
      'range': [0.5, 10],
      'color': theme === 'dark' ? '#242b4b' : '#ffffff',
      'horizon-blend': 0.03,
      'high-color': theme === 'dark' ? '#161b33' : '#c0d9e8',
      'space-color': theme === 'dark' ? '#0b0e1a' : '#c0d9e8',
      'star-intensity': theme === 'dark' ? 0.6 : 0
    });

    if (!m.getSource("stations")) {
      m.addSource("stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
    }

    // Clustering layers (Premium Emerald Style)
    if (!m.getLayer('clusters-glow')) {
      m.addLayer({
        id: "clusters-glow",
        type: "circle",
        source: "stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#10b981",
          "circle-radius": ["step", ["get", "point_count"], 25, 100, 35, 750, 45],
          "circle-opacity": 0.2,
          "circle-blur": 0.8,
        },
      });
    }

    if (!m.getLayer('clusters')) {
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: "stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#10b981",
            100,
            "#059669",
            750,
            "#047857",
          ],
          "circle-radius": ["step", ["get", "point_count"], 20, 100, 28, 750, 38],
          "circle-stroke-width": 4,
          "circle-stroke-color": theme === 'dark' ? "#0d1612" : "#ffffff",
        },
      });
    }

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
        },
        paint: { "text-color": "#ffffff" }
      });
    }

    // Unclustered point decoration
    if (!m.getLayer('unclustered-point-glow')) {
      m.addLayer({
        id: "unclustered-point-glow",
        type: "circle",
        source: "stations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#10b981",
          "circle-radius": 14,
          "circle-opacity": 0.3,
          "circle-blur": 0.6,
        },
      });
    }

    if (!m.getLayer('unclustered-point')) {
      m.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "stations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            [">", ["get", "power"], 50], "#10b981", // High power
            "#3b82f6" // Low power
          ],
          "circle-radius": 7,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": theme === 'dark' ? "#0d1612" : "#ffffff",
        },
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
      antialias: true
    });

    const m = map.current;

    const onStyleLoad = () => {
      if (setupLayersRef.current) {
        setupLayersRef.current();
      }
    };

    m.on("style.load", onStyleLoad);

    m.on("load", () => {
      // Events
      m.on("click", "clusters", (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0].properties!.cluster_id;
        (m.getSource("stations") as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;
            m.easeTo({
              center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: zoom!,
              duration: 1000
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
          zoom: 15,
          speed: 0.8
        });

        const popupHTML = `
          <div class="p-1 min-w-[260px] animate-in fade-in zoom-in duration-300">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              </div>
              <div class="overflow-hidden">
                <p class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.1em] mb-0.5">İstasyon Noktası</p>
                <h3 class="font-bold text-zinc-900 dark:text-white text-base leading-tight truncate" title="${title}">${title}</h3>
              </div>
            </div>
            
            <div class="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3 mb-3 border border-gray-100 dark:border-white/5 shadow-sm">
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs text-gray-400 dark:text-zinc-500 font-medium">Operatör</span>
                <span class="text-xs text-zinc-800 dark:text-zinc-200 font-bold">${operator}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-400 dark:text-zinc-500 font-medium">Maksimum Güç</span>
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] ${power > 50 ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'} px-1.5 py-0.5 rounded-md font-bold uppercase transition-colors">
                    ${power > 50 ? 'DC Hızlı' : 'AC Standart'}
                  </span>
                  <span class="text-sm font-black text-zinc-900 dark:text-white">
                    ${power > 0 ? `${power} kW` : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-start gap-2 text-xs text-gray-500 dark:text-zinc-400 leading-normal mb-3">
              <svg class="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span class="line-clamp-2">${address}</span>
            </div>

            <button class="w-full py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-xs font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              Detayları Görüntüle
            </button>
          </div>
        `;

        new mapboxgl.Popup({
          className: 'premium-popup',
          closeButton: false,
          maxWidth: '320px',
          anchor: 'bottom',
          offset: [0, -10]
        })
          .setLngLat(coordinates as [number, number])
          .setHTML(popupHTML)
          .addTo(m);
      });

      // Hover cursors
      const cursors = ["clusters", "unclustered-point"];
      cursors.forEach(layer => {
        m.on("mouseenter", layer, () => { m.getCanvas().style.cursor = "pointer"; });
        m.on("mouseleave", layer, () => { m.getCanvas().style.cursor = ""; });
      });

      fetchStations();
    });

    let timeoutId: NodeJS.Timeout;
    m.on("moveend", () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { fetchStations(); }, 500);
    });

    return () => {
      m.off("style.load", onStyleLoad);
      m.remove();
    };
  }, [fetchStations]);

  // Handle layer updates when setupLayers changes (due to theme or fetched data)
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
    <div className="relative w-full h-full overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      <style jsx global>{`
        .mapboxgl-popup.premium-popup .mapboxgl-popup-content {
          padding: 16px;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          background: ${theme === 'dark' ? 'rgba(13, 22, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
          backdrop-filter: blur(12px);
          border: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'};
        }
        .mapboxgl-popup.premium-popup .mapboxgl-popup-tip {
          border-top-color: ${theme === 'dark' ? 'rgba(13, 22, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
        }
        .mapboxgl-ctrl-group {
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(8px);
          border: none !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important;
          border-radius: 12px !important;
        }
      `}</style>

      {/* FLOATING UI - TOP CENTER SEARCH */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-lg transition-all animate-in slide-in-from-top-4 duration-700">
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Şehir, ilçe veya istasyon ara..."
            className="w-full h-14 pl-12 pr-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 rounded-2xl shadow-2xl shadow-emerald-950/5 text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium"
          />
          <div className="absolute right-3 top-2 bottom-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-full px-4 rounded-xl flex items-center gap-2 font-bold text-xs transition-all ${showFilters
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtrele</span>
            </button>
          </div>
        </form>

        {/* FILTER DROPDOWN */}
        {showFilters && (
          <div className="mt-3 p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-zinc-800/50 shadow-2xl animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Güç Kapasitesi</label>
                <div className="flex flex-wrap gap-2">
                  {[0, 22, 50, 100].map(p => (
                    <button
                      key={p}
                      onClick={() => setActiveFilters(prev => ({ ...prev, minPower: p }))}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${activeFilters.minPower === p
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                    >
                      {p === 0 ? 'Hepsi' : `${p}+ kW`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Operatör</label>
                <select
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg p-2 text-xs font-bold text-zinc-800 dark:text-zinc-200"
                  value={activeFilters.operator}
                  onChange={(e) => setActiveFilters(prev => ({ ...prev, operator: e.target.value }))}
                >
                  <option>Tümü</option>
                  <option>ZES</option>
                  <option>Eşarj</option>
                  <option>Trugo</option>
                  <option>Tesla</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR CONTROLS */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
        <div className="flex flex-col bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-zinc-800/50 overflow-hidden">
          <button
            onClick={() => map.current?.zoomIn()}
            className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors border-b border-zinc-100 dark:border-zinc-800"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => map.current?.zoomOut()}
            className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={handleMyLocation}
          className="p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-zinc-800/50 text-emerald-500 hover:text-emerald-600 hover:scale-105 active:scale-95 transition-all group"
          title="Konumum"
        >
          <Navigation className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        </button>

        <button
          onClick={handleResetView}
          className="p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:scale-105 active:scale-95 transition-all group"
          title="Görünümü Sıfırla"
        >
          <RotateCcw className="w-6 h-6 group-hover:-rotate-45 transition-transform" />
        </button>

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
          <div className="flex items-center gap-1.5 grayscale opacity-50">
            <div className="w-2 h-2 rounded-full bg-zinc-400" />
            Bilinmiyor
          </div>
        </div>
      </div>

      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
