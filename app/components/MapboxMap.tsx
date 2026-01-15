"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Mapbox token'ı global olarak ayarla
if (typeof window !== "undefined") {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
}

interface MapboxMapProps {
    onMapLoad?: (map: mapboxgl.Map) => void;
    onMapMove?: (map: mapboxgl.Map) => void;
    initialCenter?: [number, number];
    initialZoom?: number;
    style?: string;
}

export default function MapboxMap({
    onMapLoad,
    onMapMove,
    initialCenter = [35.2433, 38.9637],
    initialZoom = 6,
    style = "mapbox://styles/mapbox/streets-v12"
}: MapboxMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        try {
            // Mapbox token kontrolü
            if (!mapboxgl.accessToken) {
                throw new Error("Mapbox token bulunamadı. .env.local dosyasını kontrol edin.");
            }

            console.log("Harita başlatılıyor...", {
                center: initialCenter,
                zoom: initialZoom,
                token: mapboxgl.accessToken.substring(0, 20) + "..."
            });

            // Haritayı oluştur
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: style,
                center: initialCenter,
                zoom: initialZoom,
                attributionControl: true,
                logoPosition: "bottom-right"
            });

            // Navigation controls ekle
            map.current.addControl(
                new mapboxgl.NavigationControl({
                    showCompass: true,
                    showZoom: true,
                    visualizePitch: true
                }),
                "top-right"
            );

            // Fullscreen control ekle
            map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

            // Scale control ekle
            map.current.addControl(
                new mapboxgl.ScaleControl({
                    maxWidth: 100,
                    unit: "metric"
                }),
                "bottom-left"
            );

            // Harita yüklendiğinde
            map.current.on("load", () => {
                console.log("✅ Harita yüklendi");
                setIsLoading(false);
                setError(null);
                if (onMapLoad && map.current) {
                    onMapLoad(map.current);
                }
            });

            // Harita hareket ettiğinde (debounced)
            let moveTimeout: NodeJS.Timeout;
            map.current.on("moveend", () => {
                clearTimeout(moveTimeout);
                moveTimeout = setTimeout(() => {
                    if (onMapMove && map.current) {
                        onMapMove(map.current);
                    }
                }, 200);
            });

            // Zoom bittiğinde
            map.current.on("zoomend", () => {
                clearTimeout(moveTimeout);
                moveTimeout = setTimeout(() => {
                    if (onMapMove && map.current) {
                        onMapMove(map.current);
                    }
                }, 200);
            });

            // Hata durumunda
            map.current.on("error", (e) => {
                console.error("❌ Mapbox hatası:", e);
                setError("Harita yüklenirken hata oluştu: " + e.error.message);
                setIsLoading(false);
            });

        } catch (err) {
            console.error("❌ Harita başlatma hatası:", err);
            setError(err instanceof Error ? err.message : "Bilinmeyen hata");
            setIsLoading(false);
        }

        // Cleanup
        return () => {
            if (map.current) {
                console.log("Harita temizleniyor...");
                map.current.remove();
                map.current = null;
            }
        };
    }, [initialCenter, initialZoom, style, onMapLoad, onMapMove]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-red-50">
                <div className="text-center p-8">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold text-red-600 mb-2">Harita Yüklenemedi</h3>
                    <p className="text-red-500 text-sm mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Yeniden Dene
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div
                ref={mapContainer}
                className="w-full h-full"
                style={{ position: "absolute", inset: 0 }}
            />

            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 z-50">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-4"></div>
                        <p className="text-gray-700 font-medium">Harita yükleniyor...</p>
                        <p className="text-gray-500 text-sm mt-2">Mapbox başlatılıyor</p>
                    </div>
                </div>
            )}
        </>
    );
}
