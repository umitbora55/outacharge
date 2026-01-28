/**
 * TomTom EV Routing API Client
 * 
 * Long Distance EV Routing - Otomatik şarj durağı planlama
 * https://developer.tomtom.com/routing-api/documentation/extended-routing/long-distance-ev-routing
 */

// =============================================================================
// TYPES
// =============================================================================

export interface Coordinate {
    lat: number;
    lng: number;
}

export interface EVProfile {
    vehicleId: string;
    batteryCapacityKwh: number;
    currentSocPercent: number;
    minSocPercent: number;          // Minimum SoC (genelde %10)
    maxSocPercent: number;          // Maximum şarj hedefi (genelde %80)

    // Tüketim parametreleri (kWh/100km, hıza bağlı)
    consumptionAt50Kmh: number;
    consumptionAt90Kmh: number;
    consumptionAt120Kmh: number;

    // Şarj eğrisi (SoC% -> kW)
    chargingCurve: Array<{ soc: number; powerKw: number }>;

    // Verimlilik parametreleri
    accelerationEfficiency?: number;   // 0-1, default 0.66
    decelerationEfficiency?: number;   // 0-1, default 0.91 (regen)
    uphillEfficiency?: number;         // 0-1, default 0.85
    downhillEfficiency?: number;       // 0-1, default 0.90

    // Ek yükler
    auxiliaryPowerKw?: number;         // HVAC vb, default 0.5
}

export interface ChargingStop {
    stationId: string;
    stationName: string;
    location: Coordinate;
    arrivalSocPercent: number;
    departureSocPercent: number;
    chargingTimeSeconds: number;
    energyChargedKwh: number;
    chargerPowerKw: number;
}

export interface RouteSegment {
    startLocation: Coordinate;
    endLocation: Coordinate;
    distanceMeters: number;
    travelTimeSeconds: number;
    energyConsumedKwh: number;
    arrivalSocPercent: number;
}

export interface EVRouteResult {
    success: boolean;
    error?: string;

    // Toplam değerler
    totalDistanceMeters: number;
    totalTravelTimeSeconds: number;
    totalChargingTimeSeconds: number;
    totalTimeSeconds: number;
    totalEnergyConsumedKwh: number;

    // Şarj durakları
    chargingStops: ChargingStop[];

    // Rota segmentleri
    segments: RouteSegment[];

    // Polyline (harita için)
    polyline: Coordinate[];

    // Final SoC
    finalSocPercent: number;
}

// =============================================================================
// API CLIENT
// =============================================================================

const TOMTOM_API_BASE = 'https://api.tomtom.com/routing/1';

export class TomTomEVClient {
    private apiKey: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.TOMTOM_API_KEY || '';
        if (!this.apiKey) {
            throw new Error('TOMTOM_API_KEY is required');
        }
    }

    /**
     * Long Distance EV Routing
     * Otomatik şarj durağı planlama ile rota hesapla
     */
    async calculateEVRoute(
        origin: Coordinate,
        destination: Coordinate,
        evProfile: EVProfile,
        waypoints?: Coordinate[]
    ): Promise<EVRouteResult> {
        try {
            // Koordinatları formatlà
            const locations = [origin, ...(waypoints || []), destination]
                .map(c => `${c.lat},${c.lng}`)
                .join(':');

            // Şarj eğrisini TomTom formatına çevir
            const chargingCurve = evProfile.chargingCurve
                .map(p => `${p.soc},${p.powerKw}`)
                .join(':');

            // Tüketim tablosu (hız -> kWh/100km)
            const consumptionCurve = [
                `50,${evProfile.consumptionAt50Kmh}`,
                `90,${evProfile.consumptionAt90Kmh}`,
                `120,${evProfile.consumptionAt120Kmh}`,
            ].join(':');

            // API parametreleri
            const params = new URLSearchParams({
                key: this.apiKey,
                vehicleEngineType: 'electric',

                // Batarya
                currentChargeInkWh: String((evProfile.currentSocPercent / 100) * evProfile.batteryCapacityKwh),
                maxChargeInkWh: String((evProfile.maxSocPercent / 100) * evProfile.batteryCapacityKwh),
                minChargeAtDestinationInkWh: String((evProfile.minSocPercent / 100) * evProfile.batteryCapacityKwh),
                minChargeAtChargingStopsInkWh: String((evProfile.minSocPercent / 100) * evProfile.batteryCapacityKwh),

                // Şarj eğrisi
                chargingCurve: chargingCurve,

                // Tüketim
                constantSpeedConsumptionInkWhPerHundredkm: consumptionCurve,

                // Verimlilik
                accelerationEfficiency: String(evProfile.accelerationEfficiency || 0.66),
                decelerationEfficiency: String(evProfile.decelerationEfficiency || 0.91),
                uphillEfficiency: String(evProfile.uphillEfficiency || 0.85),
                downhillEfficiency: String(evProfile.downhillEfficiency || 0.90),

                // Ek güç tüketimi
                auxiliaryPowerInkW: String(evProfile.auxiliaryPowerKw || 0.5),

                // Rota ayarları
                routeType: 'fastest',
                traffic: 'true',
                travelMode: 'car',

                // Çıktı formatı
                instructionsType: 'text',
                computeBestOrder: 'false',
            });

            const url = `${TOMTOM_API_BASE}/calculateLongDistanceEVRoute/${locations}/json?${params}`;

            const response = await fetch(url);

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    error: `TomTom API error: ${response.status} - ${errorText}`,
                    totalDistanceMeters: 0,
                    totalTravelTimeSeconds: 0,
                    totalChargingTimeSeconds: 0,
                    totalTimeSeconds: 0,
                    totalEnergyConsumedKwh: 0,
                    chargingStops: [],
                    segments: [],
                    polyline: [],
                    finalSocPercent: 0,
                };
            }

            const data = await response.json();
            return this.parseEVRouteResponse(data, evProfile);

        } catch (error) {
            return {
                success: false,
                error: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                totalDistanceMeters: 0,
                totalTravelTimeSeconds: 0,
                totalChargingTimeSeconds: 0,
                totalTimeSeconds: 0,
                totalEnergyConsumedKwh: 0,
                chargingStops: [],
                segments: [],
                polyline: [],
                finalSocPercent: 0,
            };
        }
    }

    /**
     * TomTom API yanıtını parse et
     */
    private parseEVRouteResponse(data: any, evProfile: EVProfile): EVRouteResult {
        if (!data.routes || data.routes.length === 0) {
            return {
                success: false,
                error: 'No route found',
                totalDistanceMeters: 0,
                totalTravelTimeSeconds: 0,
                totalChargingTimeSeconds: 0,
                totalTimeSeconds: 0,
                totalEnergyConsumedKwh: 0,
                chargingStops: [],
                segments: [],
                polyline: [],
                finalSocPercent: 0,
            };
        }

        const route = data.routes[0];
        const summary = route.summary || {};
        const legs = route.legs || [];

        // Şarj duraklarını çıkar
        const chargingStops: ChargingStop[] = [];
        let totalChargingTime = 0;

        for (const leg of legs) {
            if (leg.summary?.chargingInformationAtEndOfLeg) {
                const charging = leg.summary.chargingInformationAtEndOfLeg;
                const chargingTime = charging.chargingTimeInSeconds || 0;

                if (chargingTime > 0) {
                    const chargingPark = charging.chargingPark || {};

                    chargingStops.push({
                        stationId: chargingPark.id || `station-${chargingStops.length}`,
                        stationName: chargingPark.name || 'Charging Station',
                        location: {
                            lat: leg.points?.[leg.points.length - 1]?.latitude || 0,
                            lng: leg.points?.[leg.points.length - 1]?.longitude || 0,
                        },
                        arrivalSocPercent: (charging.batteryLevelAtArrival / evProfile.batteryCapacityKwh) * 100,
                        departureSocPercent: (charging.targetCharge / evProfile.batteryCapacityKwh) * 100,
                        chargingTimeSeconds: chargingTime,
                        energyChargedKwh: (charging.targetCharge - charging.batteryLevelAtArrival),
                        chargerPowerKw: chargingPark.chargingPower || 150,
                    });

                    totalChargingTime += chargingTime;
                }
            }
        }

        // Polyline çıkar
        const polyline: Coordinate[] = [];
        for (const leg of legs) {
            if (leg.points) {
                for (const point of leg.points) {
                    polyline.push({
                        lat: point.latitude,
                        lng: point.longitude,
                    });
                }
            }
        }

        // Segment'leri çıkar
        const segments: RouteSegment[] = legs.map((leg: any, index: number) => ({
            startLocation: {
                lat: leg.points?.[0]?.latitude || 0,
                lng: leg.points?.[0]?.longitude || 0,
            },
            endLocation: {
                lat: leg.points?.[leg.points?.length - 1]?.latitude || 0,
                lng: leg.points?.[leg.points?.length - 1]?.longitude || 0,
            },
            distanceMeters: leg.summary?.lengthInMeters || 0,
            travelTimeSeconds: leg.summary?.travelTimeInSeconds || 0,
            energyConsumedKwh: leg.summary?.batteryConsumptionInkWh || 0,
            arrivalSocPercent: 0, // Hesaplanacak
        }));

        return {
            success: true,
            totalDistanceMeters: summary.lengthInMeters || 0,
            totalTravelTimeSeconds: summary.travelTimeInSeconds || 0,
            totalChargingTimeSeconds: totalChargingTime,
            totalTimeSeconds: (summary.travelTimeInSeconds || 0) + totalChargingTime,
            totalEnergyConsumedKwh: summary.batteryConsumptionInkWh || 0,
            chargingStops,
            segments,
            polyline,
            finalSocPercent: ((summary.remainingChargeAtDestinationInkWh || 0) / evProfile.batteryCapacityKwh) * 100,
        };
    }

    /**
     * Basit rota hesapla (EV parametreleri olmadan)
     */
    async calculateRoute(
        origin: Coordinate,
        destination: Coordinate,
        waypoints?: Coordinate[]
    ): Promise<{
        success: boolean;
        distanceMeters: number;
        travelTimeSeconds: number;
        polyline: Coordinate[];
    }> {
        try {
            const locations = [origin, ...(waypoints || []), destination]
                .map(c => `${c.lat},${c.lng}`)
                .join(':');

            const params = new URLSearchParams({
                key: this.apiKey,
                routeType: 'fastest',
                traffic: 'true',
                travelMode: 'car',
            });

            const url = `${TOMTOM_API_BASE}/calculateRoute/${locations}/json?${params}`;
            const response = await fetch(url);

            if (!response.ok) {
                return { success: false, distanceMeters: 0, travelTimeSeconds: 0, polyline: [] };
            }

            const data = await response.json();
            const route = data.routes?.[0];

            if (!route) {
                return { success: false, distanceMeters: 0, travelTimeSeconds: 0, polyline: [] };
            }

            const polyline: Coordinate[] = [];
            for (const leg of route.legs || []) {
                for (const point of leg.points || []) {
                    polyline.push({ lat: point.latitude, lng: point.longitude });
                }
            }

            return {
                success: true,
                distanceMeters: route.summary?.lengthInMeters || 0,
                travelTimeSeconds: route.summary?.travelTimeInSeconds || 0,
                polyline,
            };

        } catch {
            return { success: false, distanceMeters: 0, travelTimeSeconds: 0, polyline: [] };
        }
    }
}

// =============================================================================
// HELPER: Charging Curves'den EVProfile oluştur
// =============================================================================

import { getChargingProfile, VehicleChargingProfile } from '../charging-curves';

export function createEVProfileFromVehicle(
    vehicleId: string,
    currentSocPercent: number,
    options?: {
        minSocPercent?: number;
        maxSocPercent?: number;
        auxiliaryPowerKw?: number;
    }
): EVProfile | null {
    const profile = getChargingProfile(vehicleId);

    if (!profile) {
        return null;
    }

    // Tüketim değerleri (varsayılan tahminler - araç bazlı iyileştirilebilir)
    const baseConsumption = profile.batteryCapacityUsableKwh / 4; // ~4 km/kWh varsayımı

    return {
        vehicleId: profile.id,
        batteryCapacityKwh: profile.batteryCapacityUsableKwh,
        currentSocPercent,
        minSocPercent: options?.minSocPercent ?? 10,
        maxSocPercent: options?.maxSocPercent ?? 80,

        // Hıza göre tüketim (kWh/100km)
        consumptionAt50Kmh: baseConsumption * 0.7,   // Şehir içi verimli
        consumptionAt90Kmh: baseConsumption * 1.0,   // Baz değer
        consumptionAt120Kmh: baseConsumption * 1.4,  // Otoyol verimsiz

        // Şarj eğrisi
        chargingCurve: profile.chargingCurve,

        // Verimlilik
        accelerationEfficiency: 0.66,
        decelerationEfficiency: profile.voltageArchitecture === 800 ? 0.93 : 0.91,
        uphillEfficiency: 0.85,
        downhillEfficiency: 0.90,

        // Ek yük
        auxiliaryPowerKw: options?.auxiliaryPowerKw ?? 0.5,
    };
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let clientInstance: TomTomEVClient | null = null;

export function getTomTomClient(): TomTomEVClient {
    if (!clientInstance) {
        clientInstance = new TomTomEVClient();
    }
    return clientInstance;
}