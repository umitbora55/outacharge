import { supabase } from "@/lib/supabase";

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

export interface BoundingBox {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

export class StationManager {
    private static instance: StationManager;
    private loadedStationIds: Set<string> = new Set();

    private constructor() { }

    static getInstance(): StationManager {
        if (!StationManager.instance) {
            StationManager.instance = new StationManager();
        }
        return StationManager.instance;
    }

    // Viewport'a göre istasyonları yükle (HIZLI VERSİYON)
    async loadStationsInViewport(bounds: BoundingBox): Promise<Station[]> {
        try {
            // Yeni oluşturduğumuz hızlı SQL fonksiyonunu çağırıyoruz
            // Limit parametresini kaldırdık, SQL içinde 50.000 olarak sabitlendi.
            const { data, error } = await supabase.rpc('get_stations_in_bbox_fast', {
                min_lat: bounds.minLat,
                min_lng: bounds.minLng,
                max_lat: bounds.maxLat,
                max_lng: bounds.maxLng
            });

            if (error) {
                console.error("RPC Hatası:", error);
                throw error;
            }

            const newStations: Station[] = [];

            if (data) {
                // Tip dönüşümü
                const stations = data as unknown as Station[];

                for (const station of stations) {
                    // Daha önce yüklenmemişse listeye ekle
                    if (!this.loadedStationIds.has(station.id)) {
                        this.loadedStationIds.add(station.id);
                        newStations.push(station);
                    }
                }
            }

            return newStations;

        } catch (error: any) {
            console.error("Veri yükleme hatası:", error?.message || error);
            return [];
        }
    }

    // İlk açılış
    async loadInitialStations(limit: number = 5000): Promise<Station[]> {
        try {
            this.loadedStationIds.clear();

            // İlk açılışta veritabanını yormamak için hala bir limit kullanıyoruz
            // Ama kullanıcı haritayı oynattığı an "get_stations_in_bbox_fast" devreye girecek.
            const { data, error } = await supabase
                .from("stations")
                .select("id, name, latitude, longitude, operator_name, is_operational, city")
                .eq("is_operational", true)
                .limit(limit);

            if (error) throw error;

            const stations = data || [];
            stations.forEach(s => this.loadedStationIds.add(s.id));

            return stations as Station[];

        } catch (error) {
            console.error("İlk yükleme hatası:", error);
            return [];
        }
    }

    clearCache(): void {
        this.loadedStationIds.clear();
    }

    // Gelişmiş Arama (Hibrit Yaklaşım İçin Gerekli)
    async searchStations(query: string): Promise<Station[]> {
        if (!query || query.length < 2) return [];

        try {
            // Paralel sorgular ile timeout riskini minimize ediyoruz ve hızı artırıyoruz
            // GIN Trigram indexleri sayesinde bu sorgular yarım milyon kayıtta milisaniyeler sürecek.
            const [nameRes, operatorRes, cityRes] = await Promise.all([
                supabase.from("stations").select("id, name, latitude, longitude, operator_name, is_operational, city").ilike("name", `%${query}%`).limit(10),
                supabase.from("stations").select("id, name, latitude, longitude, operator_name, is_operational, city").ilike("operator_name", `%${query}%`).limit(10),
                supabase.from("stations").select("id, name, latitude, longitude, operator_name, is_operational, city").ilike("city", `%${query}%`).limit(10)
            ]);

            const allResults = [
                ...(nameRes.data || []),
                ...(operatorRes.data || []),
                ...(cityRes.data || [])
            ];

            // Duplicate temizliği (ID bazlı)
            const uniqueMap = new Map();
            allResults.forEach(s => uniqueMap.set(s.id, s));

            return Array.from(uniqueMap.values());
        } catch (error: any) {
            console.error("SEARCH_ERROR:", error?.message || error);
            return [];
        }
    }
}

export const stationManager = StationManager.getInstance();
