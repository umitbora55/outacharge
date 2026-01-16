"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { stationManager } from "@/lib/station-manager";
import { Loader2, Search, Navigation, Zap, X, MapPin, Layers, Locate } from "lucide-react";
import { useTheme } from "next-themes";

// Token kontrolü
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export default function NewMap() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [loading, setLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedStation, setSelectedStation] = useState<any>(null);
    const { resolvedTheme } = useTheme();

    // İstasyon verilerini ve koordinatları saklamak için
    const stationsMap = useRef<Map<string, any>>(new Map());
    const coordinateRegistry = useRef<Set<string>>(new Set());
    const moveTimeout = useRef<NodeJS.Timeout | null>(null);

    // --- SMART JITTER ALGORİTMASI ---
    const getJitteredCoordinates = useCallback((lat: number, lng: number) => {
        let newLat = lat;
        let newLng = lng;
        let retry = 0;
        const maxRetries = 15;
        const baseOffset = 0.00015;

        const getKey = (l: number, g: number) => `${l.toFixed(5)},${g.toFixed(5)}`;

        while (coordinateRegistry.current.has(getKey(newLat, newLng)) && retry < maxRetries) {
            const angle = Math.random() * Math.PI * 2;
            const radius = baseOffset * (1 + retry * 0.2);
            newLat = lat + radius * Math.cos(angle);
            newLng = lng + (radius * Math.sin(angle)) / Math.cos(lat * (Math.PI / 180));
            retry++;
        }

        coordinateRegistry.current.add(getKey(newLat, newLng));
        return [newLng, newLat];
    }, []);

    const processAndAddStations = useCallback((stations: any[]) => {
        let hasNewData = false;
        stations.forEach((s: any) => {
            if (!stationsMap.current.has(s.id)) {
                const [finalLng, finalLat] = getJitteredCoordinates(s.latitude, s.longitude);
                stationsMap.current.set(s.id, {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [finalLng, finalLat] },
                    properties: {
                        id: s.id,
                        name: s.name,
                        operator_name: s.operator_name,
                        is_operational: s.is_operational,
                        city: s.city,
                        original_lat: s.latitude,
                        original_lng: s.longitude
                    }
                });
                hasNewData = true;
            }
        });
        return hasNewData;
    }, [getJitteredCoordinates]);

    const updateSource = useCallback(() => {
        if (!map.current) return;
        const source = map.current.getSource("stations") as mapboxgl.GeoJSONSource;
        if (!source) return;

        const features = Array.from(stationsMap.current.values());
        setTotalCount(features.length);
        source.setData({ type: "FeatureCollection", features: features });
    }, []);

    const fetchStationsInBounds = useCallback(async () => {
        if (!map.current) return;

        const bounds = map.current.getBounds();
        if (!bounds) return;

        setLoading(true);
        try {
            const sw = bounds.getSouthWest().wrap();
            const ne = bounds.getNorthEast().wrap();

            const bbox = {
                minLat: sw.lat,
                maxLat: ne.lat,
                minLng: sw.lng,
                maxLng: ne.lng
            };

            const newStations = await stationManager.loadStationsInViewport(bbox);
            if (processAndAddStations(newStations)) {
                updateSource();
            }
        } catch (err) {
            console.error("MAP_FETCH_ERROR:", err);
        } finally {
            setLoading(false);
        }
    }, [updateSource, processAndAddStations]);

    const addLayers = useCallback(() => {
        const m = map.current;
        if (!m) return;

        if (!m.getSource("stations")) {
            m.addSource("stations", {
                type: "geojson",
                data: { type: "FeatureCollection", features: Array.from(stationsMap.current.values()) },
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 50
            });
        }

        const layers = [
            {
                id: "clusters-glow",
                type: "circle",
                filter: ["has", "point_count"],
                paint: {
                    "circle-color": "#10b981",
                    "circle-radius": ["step", ["get", "point_count"], 25, 100, 35, 750, 45],
                    "circle-opacity": 0.3, "circle-blur": 0.5
                }
            },
            {
                id: "clusters",
                type: "circle",
                filter: ["has", "point_count"],
                paint: {
                    "circle-color": ["step", ["get", "point_count"], "#34d399", 100, "#10b981", 750, "#059669"],
                    "circle-radius": ["step", ["get", "point_count"], 18, 100, 26, 750, 34],
                    "circle-stroke-width": 2,
                    "circle-stroke-color": resolvedTheme === "dark" ? "#0f172a" : "#ffffff"
                }
            },
            {
                id: "cluster-count",
                type: "symbol",
                filter: ["has", "point_count"],
                layout: {
                    "text-field": "{point_count_abbreviated}",
                    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                    "text-size": 14
                },
                paint: { "text-color": resolvedTheme === "dark" ? "#000000" : "#ffffff" }
            },
            {
                id: "point-glow",
                type: "circle",
                filter: ["!", ["has", "point_count"]],
                paint: {
                    "circle-color": ["case", ["boolean", ["get", "is_operational"], true], "#10b981", "#ef4444"],
                    "circle-radius": 8, "circle-opacity": 0.4, "circle-blur": 0.5
                }
            },
            {
                id: "unclustered-point",
                type: "circle",
                filter: ["!", ["has", "point_count"]],
                paint: {
                    "circle-color": ["case", ["boolean", ["get", "is_operational"], true], "#10b981", "#ef4444"],
                    "circle-radius": 5, "circle-stroke-width": 2,
                    "circle-stroke-color": resolvedTheme === "dark" ? "#0f172a" : "#ffffff"
                }
            }
        ];

        layers.forEach(layer => {
            if (!m.getLayer(layer.id)) {
                m.addLayer({ ...layer, source: "stations" } as any);
            }
        });
    }, [resolvedTheme]);

    useEffect(() => {
        if (!map.current) return;
        const style = resolvedTheme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";
        map.current.setStyle(style);
        map.current.once("style.load", addLayers);
    }, [resolvedTheme, addLayers]);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: resolvedTheme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11",
            center: [35.2433, 38.9637],
            zoom: 5.5,
            projection: { name: 'mercator' },
            attributionControl: false
        });

        const m = map.current;

        m.on("load", async () => {
            addLayers();
            try {
                // setLoading(true); // Artık isInitialLoading kullanıyoruz
                const initial = await stationManager.loadInitialStations(2000);
                if (processAndAddStations(initial)) updateSource();

                // --- KRİTİK: İLK GÖRÜNÜM VERİSİ ---
                // Başlangıç viewport'una göre ek verileri çek
                await fetchStationsInBounds();
            } catch (e) {
                console.error("LOAD_ERROR:", e);
            } finally {
                setIsInitialLoading(false);
            }
        });

        m.on("moveend", () => {
            if (moveTimeout.current) clearTimeout(moveTimeout.current);
            moveTimeout.current = setTimeout(fetchStationsInBounds, 500);
        });

        m.on("click", "clusters", (e) => {
            const features = m.queryRenderedFeatures(e.point, { layers: ["clusters"] });
            const clusterId = features[0].properties?.cluster_id;
            (m.getSource("stations") as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err) return;
                m.flyTo({
                    center: (features[0].geometry as any).coordinates,
                    zoom: zoom ?? undefined,
                    speed: 0.6, curve: 1.4, easing: (t) => t * (2 - t),
                    essential: true
                });
            });
        });

        m.on("click", "unclustered-point", (e) => {
            if (!e.features?.length) return;
            const feature = e.features[0];
            m.flyTo({
                center: (feature.geometry as any).coordinates.slice(),
                zoom: 15, offset: [0, 150], speed: 0.8, curve: 1.2, essential: true
            });
            setSelectedStation(feature.properties);
        });

        ["clusters", "unclustered-point"].forEach(l => {
            m.on("mouseenter", l, () => m.getCanvas().style.cursor = "pointer");
            m.on("mouseleave", l, () => m.getCanvas().style.cursor = "");
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    const handleLocateMe = () => {
        navigator.geolocation.getCurrentPosition(pos => {
            map.current?.flyTo({
                center: [pos.coords.longitude, pos.coords.latitude],
                zoom: 12, speed: 1.5, curve: 1
            });
        }, err => console.error("LOCATE_ERROR:", err));
    };

    return (
        <div className="relative w-full h-screen bg-zinc-900 overflow-hidden">
            <div ref={mapContainer} className="w-full h-full" />

            {/* Premium Initial Loading Overlay */}
            <div className={`absolute inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950 transition-all duration-1000 ease-in-out ${isInitialLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_70%)] animate-pulse" />
                <div className="relative flex flex-col items-center gap-8">
                    <div className="w-24 h-24 relative">
                        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <Zap className="absolute inset-0 m-auto w-10 h-10 text-emerald-500" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-3xl font-black text-white tracking-[0.3em] mb-2">OUTA</h1>
                        <p className="text-emerald-500/60 text-xs font-bold tracking-[0.2em] uppercase">Enerji Yükleniyor</p>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="absolute top-4 left-4 right-4 md:left-8 md:right-auto md:w-96 z-10">
                <div className="relative group">
                    <div className="absolute inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10" />
                    <div className="relative flex items-center px-4 h-14">
                        <Search className="w-5 h-5 text-zinc-500" />
                        <input type="text" placeholder="İstasyon ara..." className="w-full bg-transparent border-none outline-none px-3 text-white placeholder:text-zinc-500 text-sm font-medium" />
                        <div className="w-px h-6 bg-white/10 mx-2" />
                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-300"><Layers className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute top-4 right-4 z-10">
                <button onClick={handleLocateMe} className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/10 hover:bg-white/20 transition-all text-white">
                    <Locate className="w-6 h-6" />
                </button>
            </div>

            {/* Loading Indicator */}
            <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 transition-all duration-500 z-20 ${loading ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                <div className="bg-zinc-900/90 backdrop-blur-md px-4 py-2 rounded-full shadow-xl flex items-center gap-3 border border-white/10">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span className="text-xs font-medium text-white tracking-wide uppercase">Ağ Taranıyor</span>
                </div>
            </div>

            {/* Bottom Sheet */}
            <div className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${selectedStation ? 'translate-y-0' : 'translate-y-[110%]'}`}>
                <div className="max-w-2xl mx-auto px-4 pb-6">
                    <div className="bg-white dark:bg-[#0A0A0A] rounded-[2.5rem] shadow-2xl p-6 md:p-8 border border-zinc-100 dark:border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] pointer-events-none" />
                        <button onClick={() => setSelectedStation(null)} className="absolute top-6 right-6 p-2 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 rounded-full transition-colors text-zinc-500"><X className="w-5 h-5" /></button>
                        <div className="relative z-10">
                            <div className="flex items-start gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-white/5 flex items-center justify-center border border-zinc-100 dark:border-white/5 flex-shrink-0"><Zap className="w-8 h-8 text-emerald-500" /></div>
                                <div className="flex-1 pt-1">
                                    <h2 className="text-2xl font-bold dark:text-white leading-tight mb-1">{selectedStation?.name}</h2>
                                    <p className="text-sm text-zinc-500 font-medium">{selectedStation?.operator_name || 'Bilinmeyen Operatör'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-6">
                                <div className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 border ${selectedStation?.is_operational ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
                                    <div className={`w-2 h-2 rounded-full ${selectedStation?.is_operational ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                    <span className="text-xs font-bold uppercase tracking-wide">{selectedStation?.is_operational ? 'HİZMETTE' : 'SERVİS DIŞI'}</span>
                                </div>
                                <button className="flex-1 py-3 px-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs uppercase tracking-wide hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <Navigation className="w-4 h-4" /> ROTA OLUŞTUR
                                </button>
                            </div>
                            <div className="mt-6 flex items-start gap-3 p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl">
                                <MapPin className="w-5 h-5 text-zinc-400 mt-0.5" />
                                <p className="text-sm dark:text-zinc-300 leading-relaxed">{selectedStation?.city ? `${selectedStation.city} Merkez` : 'Adres bilgisi mevcut değil.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Sidebar */}
            {!selectedStation && (
                <div className="absolute bottom-8 left-8 z-10 hidden md:block animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-4 rounded-3xl">
                        <div className="flex items-center gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AKTİF İSTASYON</p>
                                <p className="text-3xl font-light text-white tracking-tighter tabular-nums">{totalCount.toLocaleString()}</p>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-medium text-emerald-400 uppercase tracking-widest">Canlı</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
