import { supabase } from "@/lib/supabase";
import Supercluster from "supercluster";

export interface Station {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    operator_name: string | null;
    is_operational: boolean;
    city?: string | null;
    country?: string;
}

export interface ClusterPoint {
    type: "Feature";
    properties: Station & {
        cluster?: boolean;
        point_count?: number;
        cluster_id?: number;
    };
    geometry: {
        type: "Point";
        coordinates: [number, number];
    };
}

export interface BoundingBox {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

export class StationManager {
    private static instance: StationManager;
    private clusterIndex: Supercluster | null = null;
    private allStations: Station[] = [];
    private cache: Map<string, Station[]> = new Map();

    private constructor() { }

    static getInstance(): StationManager {
        if (!StationManager.instance) {
            StationManager.instance = new StationManager();
        }
        return StationManager.instance;
    }

    // Toplam istasyon sayısını al
    async getTotalCount(): Promise<number> {
        try {
            const { count, error } = await supabase
                .from("stations")
                .select("*", { count: "exact", head: true });

            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error("Toplam sayı alınamadı:", error);
            return 0;
        }
    }

    // Viewport'a göre istasyonları yükle
    async loadStationsInViewport(bounds: BoundingBox, limit: number = 5000): Promise<Station[]> {
        const cacheKey = `${bounds.minLat}_${bounds.maxLat}_${bounds.minLng}_${bounds.maxLng}`;

        // Cache'den kontrol et
        if (this.cache.has(cacheKey)) {
            console.log("📦 Cache'den yüklendi");
            return this.cache.get(cacheKey)!;
        }

        try {
            console.log("🌐 Supabase'den yükleniyor...", bounds);

            const { data, error } = await supabase
                .from("stations")
                .select("id, name, latitude, longitude, operator_name, is_operational, city, country")
                .gte("latitude", bounds.minLat)
                .lte("latitude", bounds.maxLat)
                .gte("longitude", bounds.minLng)
                .lte("longitude", bounds.maxLng)
                .eq("is_operational", true)
                .not("latitude", "is", null)
                .not("longitude", "is", null)
                .limit(limit);

            if (error) throw error;

            const stations = data || [];

            // Cache'e kaydet
            this.cache.set(cacheKey, stations);

            console.log(`✅ ${stations.length} istasyon yüklendi`);
            return stations;

        } catch (error) {
            console.error("❌ İstasyon yükleme hatası:", error);
            return [];
        }
    }

    // Tüm istasyonları yükle (ilk açılış için)
    async loadInitialStations(limit: number = 5000): Promise<Station[]> {
        try {
            console.log("🚀 İlk istasyonlar yükleniyor...");

            const { data, error } = await supabase
                .from("stations")
                .select("id, name, latitude, longitude, operator_name, is_operational, city, country")
                .eq("is_operational", true)
                .not("latitude", "is", null)
                .not("longitude", "is", null)
                .limit(limit);

            if (error) throw error;

            this.allStations = data || [];
            this.initializeClusters(this.allStations);

            console.log(`✅ ${this.allStations.length} istasyon yüklendi ve cluster oluşturuldu`);
            return this.allStations;

        } catch (error) {
            console.error("❌ İlk yükleme hatası:", error);
            return [];
        }
    }

    // Cluster index'i başlat
    private initializeClusters(stations: Station[]): void {
        const points: ClusterPoint[] = stations.map((station) => ({
            type: "Feature",
            properties: station,
            geometry: {
                type: "Point",
                coordinates: [station.longitude, station.latitude],
            },
        }));

        this.clusterIndex = new Supercluster({
            radius: 60,
            maxZoom: 16,
            minZoom: 0,
            extent: 512,
            nodeSize: 64,
        });

        this.clusterIndex.load(points);
        console.log("🎯 Cluster index oluşturuldu");
    }

    // Cluster'ları al
    getClusters(bbox: [number, number, number, number], zoom: number): ClusterPoint[] {
        if (!this.clusterIndex) {
            console.warn("⚠️ Cluster index henüz oluşturulmamış");
            return [];
        }

        return this.clusterIndex.getClusters(bbox, zoom) as ClusterPoint[];
    }

    // Cluster expansion zoom'u al
    getClusterExpansionZoom(clusterId: number): number {
        if (!this.clusterIndex) return 0;
        return this.clusterIndex.getClusterExpansionZoom(clusterId);
    }

    // Cache'i temizle
    clearCache(): void {
        this.cache.clear();
        console.log("🗑️ Cache temizlendi");
    }

    // Yeni istasyonlarla cluster'ı güncelle
    updateClusters(stations: Station[]): void {
        this.allStations = stations;
        this.initializeClusters(stations);
    }
}

// Singleton instance'ı export et
export const stationManager = StationManager.getInstance();
