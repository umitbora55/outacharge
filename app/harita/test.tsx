"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

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
      updateSource(data);
    } catch (error) {
      console.error("Error fetching stations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSource = (stationsData: Station[]) => {
    if (!map.current) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: stationsData.map((station) => ({
        type: "Feature",
        properties: {
          id: station.ID,
          title: station.AddressInfo.Title,
          operator: station.OperatorInfo?.Title || "Bilinmeyen Operatör",
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
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11", // Cleaner, premium light map
      center: [35.2433, 38.9637], // Turkey center
      zoom: 6,
      projection: { name: 'mercator' } as any
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.current.on("load", () => {
      map.current!.addSource("stations", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // 1. Cluster Glow (Soft background)
      map.current!.addLayer({
        id: "clusters-glow",
        type: "circle",
        source: "stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#10b981", // Emerald 500
          "circle-radius": ["step", ["get", "point_count"], 25, 100, 35, 750, 45],
          "circle-opacity": 0.3,
          "circle-blur": 0.5,
        },
      });

      // 2. Main Cluster Circles
      map.current!.addLayer({
        id: "clusters",
        type: "circle",
        source: "stations",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#10b981", // Emerald 500
            100,
            "#059669", // Emerald 700
            750,
            "#047857", // Emerald 900
          ],
          "circle-radius": ["step", ["get", "point_count"], 18, 100, 26, 750, 36],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });

      // 3. Cluster Count Labels
      map.current!.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "stations",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 13,
          "text-offset": [0, 0], // Center
        },
        paint: {
          "text-color": "#ffffff"
        }
      });

      // 4. Unclustered Points (Premium Dots)
      // Glow effect for individual points
      map.current!.addLayer({
        id: "unclustered-point-glow",
        type: "circle",
        source: "stations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#10b981",
          "circle-radius": 12,
          "circle-opacity": 0.2,
          "circle-blur": 0.5,
        },
      });

      // Main point
      map.current!.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "stations",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#10b981", // Emerald 500
          "circle-radius": 6,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Events
      map.current!.on("click", "clusters", (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ["clusters"],
        });
        const clusterId = features[0].properties!.cluster_id;
        (map.current!.getSource("stations") as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;
            map.current!.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom!,
            });
          }
        );
      });

      map.current!.on("click", "unclustered-point", (e) => {
        if (!e.features || e.features.length === 0) return;

        // Center map on click gently
        map.current!.flyTo({
          center: (e.features[0].geometry as any).coordinates,
          zoom: map.current!.getZoom() < 12 ? 14 : map.current!.getZoom(),
          speed: 1.2
        });

        const feature = e.features[0];
        const coordinates = (feature.geometry as any).coordinates.slice();
        const { title, operator, address, power } = feature.properties as any;

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        const popupHTML = `
        <div class="px-1 py-2 min-w-[240px]">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </div>
            <div>
              <p class="text-xs font-semibold text-emerald-600 uppercase tracking-wider">İstasyon</p>
              <h3 class="font-bold text-zinc-900 text-sm leading-tight line-clamp-1" title="${title}">${title}</h3>
            </div>
          </div>
          
          <div class="bg-gray-50 rounded-lg p-2.5 mb-3 border border-gray-100">
            <div class="flex justify-between items-center mb-1">
              <span class="text-xs text-gray-400 font-medium">Operatör</span>
              <span class="text-xs text-gray-700 font-semibold">${operator}</span>
            </div>
             <div class="flex justify-between items-center">
              <span class="text-xs text-gray-400 font-medium">Güç</span>
              <span class="text-xs ${power > 50 ? 'text-purple-600' : 'text-emerald-600'} font-bold bg-white px-1.5 py-0.5 rounded border border-gray-100 shadow-sm">
                ${power > 0 ? `${power} kW` : "Standart"}
              </span>
            </div>
          </div>

          <p class="text-xs text-gray-400 leading-snug flex items-start gap-1">
            <svg class="w-3 h-3 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${address}
          </p>
        </div>
      `;

        new mapboxgl.Popup({
          className: 'premium-popup',
          closeButton: false,
          maxWidth: '300px',
          focusAfterOpen: false
        })
          .setLngLat(coordinates)
          .setHTML(popupHTML)
          .addTo(map.current!);
      });

      map.current!.on("mouseenter", "clusters", () => {
        map.current!.getCanvas().style.cursor = "pointer";
      });
      map.current!.on("mouseleave", "clusters", () => {
        map.current!.getCanvas().style.cursor = "";
      });
      map.current!.on("mouseenter", "unclustered-point", () => {
        map.current!.getCanvas().style.cursor = "pointer";
      });
      map.current!.on("mouseleave", "unclustered-point", () => {
        map.current!.getCanvas().style.cursor = "";
      });

      fetchStations();
    });

    let timeoutId: NodeJS.Timeout;
    map.current.on("moveend", () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchStations();
      }, 500);
    });

    return () => {
      map.current?.remove();
    };
  }, [fetchStations]);

  return (
    <div className="relative w-full h-full">
      <style jsx global>{`
        .mapboxgl-popup.premium-popup .mapboxgl-popup-content {
          padding: 12px;
          border-radius: 16px;
          box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .mapboxgl-popup.premium-popup .mapboxgl-popup-tip {
          border-top-color: white;
        }
      `}</style>

      <div ref={mapContainer} className="w-full h-full" />
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <div className="bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-full shadow-xl shadow-zinc-200/50 flex items-center gap-3 border border-gray-100 transition-all transform animate-in slide-in-from-top-4">
            <div className="relative">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute opacity-75"></div>
              <div className="w-3 h-3 bg-emerald-500 rounded-full relative"></div>
            </div>
            <span className="text-sm font-semibold text-zinc-800 tracking-tight">İstasyonlar aranıyor...</span>
          </div>
        </div>
      )}
    </div>
  );
}
