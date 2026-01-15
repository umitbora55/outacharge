"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import MapboxMap from "../components/MapboxMap";
import { stationManager, Station, ClusterPoint } from "@/lib/station-manager";

const INITIAL_CENTER: [number, number] = [35.2433, 38.9637];
const INITIAL_ZOOM = 6;

let moveTimeout: NodeJS.Timeout | null = null;
const markerCache = new Map<string, mapboxgl.Marker>();

export default function NewMap() {
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [loadedCount, setLoadedCount] = useState(0);
    const [visibleCount, setVisibleCount] = useState(0);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);

    // Marker'ları güncelle
    const updateMarkers = useCallback(() => {
        if (!mapRef.current) return;

        const zoom = Math.floor(mapRef.current.getZoom());
        const bounds = mapRef.current.getBounds();
        if (!bounds) return;

        const clusters = stationManager.getClusters(
            [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
            zoom
        );

        // Eski marker'ları temizle
        clearMarkers();

        let visible = 0;

        clusters.forEach((cluster) => {
            const [lng, lat] = cluster.geometry.coordinates;
            const { cluster: isCluster, point_count, cluster_id } = cluster.properties;

            if (isCluster && point_count) {
                // Cluster marker
                const key = `cluster-${cluster_id}`;

                // Cache'de varsa kullan
                if (markerCache.has(key)) {
                    const existingMarker = markerCache.get(key)!;
                    existingMarker.setLngLat([lng, lat]); // Pozisyonu güncelle
                    visible += point_count;
                    return;
                }

                // Yoksa yeni oluştur
                const el = createClusterMarker(point_count);

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([lng, lat])
                    .addTo(mapRef.current!);

                el.addEventListener("click", () => {
                    const expansionZoom = stationManager.getClusterExpansionZoom(cluster_id!);
                    mapRef.current!.easeTo({
                        center: [lng, lat],
                        zoom: expansionZoom,
                        duration: 500
                    });
                });

                markersRef.current.push(marker);
                markerCache.set(key, marker);
                visible += point_count;

            } else {
                // Tek istasyon marker
                const station = cluster.properties as Station;
                const key = `station-${station.id}`;

                // Cache'de varsa kullan
                if (markerCache.has(key)) {
                    const existingMarker = markerCache.get(key)!;
                    existingMarker.setLngLat([lng, lat]);
                    visible++;
                    return;
                }

                // Yoksa yeni oluştur
                const el = createStationMarker(station);

                const marker = new mapboxgl.Marker(el)
                    .setLngLat([lng, lat])
                    .setPopup(createPopup(station))
                    .addTo(mapRef.current!);

                markersRef.current.push(marker);
                markerCache.set(key, marker);
                visible++;
            }
        });

        setVisibleCount(visible);
    }, []);

    // Harita yüklendiğinde
    const handleMapLoad = useCallback(async (map: mapboxgl.Map) => {
        console.log("🗺️ Harita yüklendi, istasyonlar çekiliyor...");
        mapRef.current = map;

        try {
            setLoading(true);

            // Toplam sayıyı al
            const count = await stationManager.getTotalCount();
            setTotalCount(count);

            // İlk istasyonları yükle
            const stations = await stationManager.loadInitialStations(5000);
            setLoadedCount(stations.length);

            // Marker'ları güncelle
            updateMarkers();

        } catch (error) {
            console.error("❌ İstasyon yükleme hatası:", error);
        } finally {
            setLoading(false);
        }
    }, [updateMarkers]);

    // Harita hareket ettiğinde
    const handleMapMove = useCallback(() => {
        if (!mapRef.current) return;

        // Önceki timeout'u iptal et
        if (moveTimeout) {
            clearTimeout(moveTimeout);
        }

        // 300ms bekle, sonra güncelle
        moveTimeout = setTimeout(() => {
            updateMarkers();
        }, 300);
    }, [updateMarkers]);

    // Cluster marker oluştur
    const createClusterMarker = (count: number): HTMLDivElement => {
        const el = document.createElement("div");
        const size = 30 + Math.min((count / 100) * 20, 50);

        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.backgroundColor = "#3b82f6";
        el.style.borderRadius = "50%";
        el.style.color = "white";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.fontWeight = "bold";
        el.style.fontSize = "14px";
        el.style.cursor = "pointer";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        el.style.transition = "transform 0.2s";
        el.textContent = count > 999 ? `${(count / 1000).toFixed(1)}k` : count.toString();

        return el;
    };

    // Station marker oluştur
    const createStationMarker = (station: Station): HTMLDivElement => {
        const el = document.createElement("div");

        el.style.width = "14px";
        el.style.height = "14px";
        el.style.backgroundColor = station.is_operational ? "#10b981" : "#ef4444";
        el.style.borderRadius = "50%";
        el.style.border = "2px solid white";
        el.style.cursor = "pointer";
        el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
        el.style.transition = "transform 0.2s";

        return el;
    };

    // Popup oluştur
    const createPopup = (station: Station): mapboxgl.Popup => {
        return new mapboxgl.Popup({
            offset: 15,
            closeButton: true,
            closeOnClick: true,
            maxWidth: "300px"
        }).setHTML(`
            <div style="padding: 12px;">
                <h3 style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #111;">
                    ${station.name}
                </h3>
                <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="color: #666;">🏢</span>
                        <span style="color: #666;">${station.operator_name || "Bilinmiyor"}</span>
                    </div>
                    ${station.city ? `
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: #666;">📍</span>
                            <span style="color: #666;">${station.city}, ${station.country || ''}</span>
                        </div>
                    ` : ''}
                    <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                        <span style="font-size: 10px;">${station.is_operational ? '🟢' : '🔴'}</span>
                        <span style="color: ${station.is_operational ? '#10b981' : '#ef4444'}; font-weight: 600;">
                            ${station.is_operational ? 'Aktif' : 'İnaktif'}
                        </span>
                    </div>
                </div>
            </div>
        `);
    };

    // Marker'ları temizle
    const clearMarkers = () => {
        markerCache.forEach((marker) => marker.remove());
        markerCache.clear();
        markersRef.current = [];
    };

    return (
        <div className="relative w-full h-screen">
            <MapboxMap
                onMapLoad={handleMapLoad}
                onMapMove={handleMapMove}
                initialCenter={INITIAL_CENTER}
                initialZoom={INITIAL_ZOOM}
            />

            {/* Stats Panel */}
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-gray-200 z-10">
                <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    <span>Şarj İstasyonları</span>
                </h2>

                {loading ? (
                    <div className="flex items-center gap-3">
                        <div className="animate-spin h-5 w-5 border-3 border-blue-500 border-t-transparent rounded-full" />
                        <p className="text-sm text-gray-600">Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Toplam:</span>
                            <span className="font-bold text-gray-900">{totalCount.toLocaleString('tr-TR')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Yüklenen:</span>
                            <span className="font-bold text-blue-600">{loadedCount.toLocaleString('tr-TR')}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Görünür:</span>
                            <span className="font-bold text-green-600">{visibleCount.toLocaleString('tr-TR')}</span>
                        </div>
                    </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                        <span>💡</span>
                        <span>Yakınlaştır veya hareket ettir</span>
                    </p>
                </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-xl border border-gray-200 z-10">
                <h3 className="font-semibold text-sm mb-3">Gösterge</h3>
                <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow"></div>
                        <span className="text-gray-700">Aktif İstasyon</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow"></div>
                        <span className="text-gray-700">İnaktif İstasyon</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white shadow flex items-center justify-center text-white font-bold text-[10px]">
                            42
                        </div>
                        <span className="text-gray-700">Grup (Tıkla)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
