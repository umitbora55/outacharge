/**
 * GRAPH-BASED ROUTE OPTIMIZER
 * 
 * Bu modül şarj istasyonlarını graf yapısıyla modelleyerek
 * en optimal şarj planını hesaplar.
 * 
 * Algoritma: Modified Dijkstra with State-Space Search
 * - Node: (konum, SoC) çifti
 * - Edge: Sürüş + Şarj maliyeti (dakika)
 * - Hedef: Toplam süreyi minimize et
 */

import { Vehicle, calculateChargingTime, ChargingCurvePoint } from "@/data/vehicles";
import {
    getChargingProfile,
    calculateChargingTime as calculateChargingTimeNew,
    interpolateChargingPower
} from './charging-curves';
import { fetchWeatherForPoint } from './weather-service';


// ===== TYPES =====

export interface RouteNode {
    id: string;
    type: "origin" | "station" | "destination";
    name: string;
    lng: number;
    lat: number;
    routeProgressKm: number;
    // Station-specific
    power?: number;
    powerType?: "DC" | "AC";
    operator?: string;
    detourKm?: number;
    detourMin?: number;
}

export interface GraphEdge {
    from: string;
    to: string;
    distanceKm: number;
    drivingTimeMin: number;
    energyKwh: number;
}

export interface StateNode {
    nodeId: string;
    socPercent: number;
    // For path reconstruction
    previousState: StateNode | null;
    chargedToPercent: number | null; // null if no charging at this node
    totalTimeMin: number;
    totalCostTL: number;
}

export interface OptimizationResult {
    success: boolean;
    stops: OptimalStop[];
    totalDrivingMin: number;
    totalChargingMin: number;
    totalTimeMin: number;
    totalCostTL: number;
    arrivalSoC: number;
    nodesExplored: number;
    message?: string;
    warnings?: string[];
}

export interface OptimalStop {
    station: RouteNode;
    arrivalSoC: number;
    departureSoC: number;
    chargingTimeMin: number;
    chargingCostTL: number;
    energyChargedKwh: number;
    distanceFromPrevKm: number;
    temperatureC?: number; // Ambient temperature at station
    avgPowerKw?: number;
    peakPowerKw?: number;
    warnings?: string[];
}

// ===== PRIORITY QUEUE =====

class PriorityQueue<T> {
    private items: { element: T; priority: number }[] = [];

    enqueue(element: T, priority: number): void {
        const item = { element, priority };
        let added = false;
        for (let i = 0; i < this.items.length; i++) {
            if (item.priority < this.items[i].priority) {
                this.items.splice(i, 0, item);
                added = true;
                break;
            }
        }
        if (!added) this.items.push(item);
    }

    dequeue(): T | undefined {
        return this.items.shift()?.element;
    }

    isEmpty(): boolean {
        return this.items.length === 0;
    }

    size(): number {
        return this.items.length;
    }
}

// ===== HELPER FUNCTIONS =====

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

function stateKey(nodeId: string, socPercent: number): string {
    // SoC'u %5'lik dilimlere yuvarla (state space'i küçültmek için)
    const roundedSoC = Math.round(socPercent / 5) * 5;
    return `${nodeId}@${roundedSoC}`;
}

// ===== MAIN OPTIMIZER CLASS =====

export class RouteOptimizer {
    private vehicle: Vehicle;
    private nodes: Map<string, RouteNode> = new Map();
    private edges: GraphEdge[] = [];
    private energyPerKm: number; // Wh/km
    private minSoC: number;
    private maxSoC: number = 90; // Normalde %90'a kadar şarj
    private batteryTemp: number;
    private stationWeather: Map<string, number> = new Map(); // stationId -> temperature
    private pricePerKwhDC: number = 12.5;
    private pricePerKwhAC: number = 9;

    // Strategy parameters
    private strategy: "fastest" | "fewest" | "cheapest" = "fastest";
    private stopPenaltyMin: number = 0; // Extra penalty for each stop (fewest strategy)
    private preferHighPower: boolean = true; // Prefer high power stations

    constructor(
        vehicle: Vehicle,
        energyPerKm: number, // From physics engine
        minArrivalSoC: number = 20,
        batteryTemp: number = 20
    ) {
        this.vehicle = vehicle;
        this.energyPerKm = energyPerKm;
        this.minSoC = minArrivalSoC;
        this.batteryTemp = batteryTemp;
    }

    /**
     * Graf düğümlerini ekle
     */
    addNode(node: RouteNode): void {
        this.nodes.set(node.id, node);
    }

    /**
     * İki düğüm arası kenar ekle
     */
    addEdge(from: string, to: string, distanceKm: number, avgSpeedKmh: number = 90): void {
        const drivingTimeMin = (distanceKm / avgSpeedKmh) * 60;
        const energyKwh = (distanceKm * this.energyPerKm) / 1000;

        this.edges.push({
            from,
            to,
            distanceKm,
            drivingTimeMin,
            energyKwh,
        });
    }

    /**
     * Origin ve destination arasındaki istasyonları rota üzerinde sırala
     * ve kenarları otomatik oluştur
     */
    buildGraphFromRoute(
        origin: { name: string; lng: number; lat: number },
        destination: { name: string; lng: number; lat: number },
        stations: Array<{
            id: string;
            name: string;
            lng: number;
            lat: number;
            power: number;
            powerType: "DC" | "AC";
            operator?: string;
            routeProgressKm: number;
            detourKm?: number;
            detourMin?: number;
        }>,
        totalDistanceKm: number,
        totalDrivingMin: number
    ): void {
        // Clear existing
        this.nodes.clear();
        this.edges = [];

        // Add origin
        this.addNode({
            id: "origin",
            type: "origin",
            name: origin.name,
            lng: origin.lng,
            lat: origin.lat,
            routeProgressKm: 0,
        });

        // Add stations
        const sortedStations = [...stations].sort((a, b) => a.routeProgressKm - b.routeProgressKm);

        for (const s of sortedStations) {
            this.addNode({
                id: s.id,
                type: "station",
                name: s.name,
                lng: s.lng,
                lat: s.lat,
                routeProgressKm: s.routeProgressKm,
                power: s.power,
                powerType: s.powerType,
                operator: s.operator,
                detourKm: s.detourKm,
                detourMin: s.detourMin,
            });
        }

        // Add destination
        this.addNode({
            id: "destination",
            type: "destination",
            name: destination.name,
            lng: destination.lng,
            lat: destination.lat,
            routeProgressKm: totalDistanceKm,
        });

        // Average speed
        const avgSpeedKmh = totalDistanceKm / (totalDrivingMin / 60);

        // Build edges: Her düğümden kendinden sonraki tüm düğümlere
        const allNodes = Array.from(this.nodes.values()).sort((a, b) => a.routeProgressKm - b.routeProgressKm);

        for (let i = 0; i < allNodes.length; i++) {
            for (let j = i + 1; j < allNodes.length; j++) {
                const from = allNodes[i];
                const to = allNodes[j];
                const distanceKm = to.routeProgressKm - from.routeProgressKm + (to.detourKm || 0);

                // Sapma süresi varsa ekle
                const detourTimeMin = to.detourMin || 0;
                const drivingTimeMin = (distanceKm / avgSpeedKmh) * 60 + detourTimeMin;
                const energyKwh = (distanceKm * this.energyPerKm) / 1000;

                this.edges.push({
                    from: from.id,
                    to: to.id,
                    distanceKm,
                    drivingTimeMin,
                    energyKwh,
                });
            }
        }

        console.log("[OPTIMIZER] Graph built:", {
            nodes: this.nodes.size,
            edges: this.edges.length,
            stations: sortedStations.length,
        });
    }

    /**
     * İsteğe bağlı: İstasyonlar için gerçek hava durumu verilerini çek
     */
    async updateWeatherForStations(): Promise<void> {
        const stationNodes = Array.from(this.nodes.values()).filter(n => n.type === "station");

        // Paralel çek
        const promises = stationNodes.map(async (node) => {
            const weather = await fetchWeatherForPoint(node.lat, node.lng);
            if (weather) {
                this.stationWeather.set(node.id, weather.temperature);
            }
        });

        await Promise.all(promises);
    }

    /**
     * En optimal rotayı bul (Modified Dijkstra)
     */
    findOptimalRoute(startSoC: number): OptimizationResult {
        const startTime = performance.now();

        // State space search
        const visited = new Map<string, number>(); // stateKey -> bestTime/Cost
        const pq = new PriorityQueue<StateNode>();
        let nodesExplored = 0;

        // Initial state
        const initialState: StateNode = {
            nodeId: "origin",
            socPercent: startSoC,
            previousState: null,
            chargedToPercent: null,
            totalTimeMin: 0,
            totalCostTL: 0,
        };
        pq.enqueue(initialState, 0);

        let bestSolution: StateNode | null = null;

        while (!pq.isEmpty()) {
            const current = pq.dequeue()!;
            nodesExplored++;

            // Timeout check (max 2 saniye)
            if (performance.now() - startTime > 2000) {
                console.warn("[OPTIMIZER] Timeout reached after", nodesExplored, "nodes");
                break;
            }

            // Max iterations
            if (nodesExplored > 50000) {
                console.warn("[OPTIMIZER] Max iterations reached");
                break;
            }

            const key = stateKey(current.nodeId, current.socPercent);
            const existingBest = visited.get(key);
            const currentMetric = this.strategy === "cheapest" ? current.totalCostTL : current.totalTimeMin;

            if (existingBest !== undefined && existingBest <= currentMetric) {
                continue;
            }
            visited.set(key, currentMetric);

            // Goal check
            if (current.nodeId === "destination") {
                if (current.socPercent >= this.minSoC) {
                    if (!bestSolution || current.totalTimeMin < bestSolution.totalTimeMin) {
                        bestSolution = current;
                    }
                }
                continue;
            }

            // Get current node
            const currentNode = this.nodes.get(current.nodeId);
            if (!currentNode) continue;

            // Explore edges from current node
            const outEdges = this.edges.filter(e => e.from === current.nodeId);

            for (const edge of outEdges) {
                const targetNode = this.nodes.get(edge.to);
                if (!targetNode) continue;

                // Calculate SoC after driving
                const energyUsedKwh = edge.energyKwh;
                const socAfterDriving = current.socPercent - (energyUsedKwh / this.vehicle.batteryCapacity) * 100;

                // Skip if we can't reach this node (SoC would be negative or too low)
                if (socAfterDriving < 5) continue; // Safety margin

                // Option 1: Drive directly without charging (only if we have enough charge)
                if (socAfterDriving >= 5) {
                    const newState: StateNode = {
                        nodeId: edge.to,
                        socPercent: socAfterDriving,
                        previousState: current,
                        chargedToPercent: null,
                        totalTimeMin: current.totalTimeMin + edge.drivingTimeMin,
                        totalCostTL: current.totalCostTL,
                    };

                    const newKey = stateKey(newState.nodeId, newState.socPercent);
                    const existingBest = visited.get(newKey);
                    if (!existingBest || newState.totalTimeMin < existingBest) {
                        // Heuristic: Kalan mesafe / ortalama hız
                        const remainingKm = (this.nodes.get("destination")?.routeProgressKm || 0) - (targetNode.routeProgressKm || 0);
                        const heuristic = remainingKm / 100 * 60; // 100 km/h varsayım
                        pq.enqueue(newState, newState.totalTimeMin + heuristic);
                        // visited.set burada YAPILMAMALI - sadece dequeue edildiğinde
                    }
                }

                // Option 2: Charge at this station (if it's a station)
                if (targetNode.type === "station" && targetNode.power) {
                    // Strategy-based charging targets
                    let chargingTargets: number[];

                    switch (this.strategy) {
                        case "fewest":
                            // En az durak: Sadece yüksek SoC hedefleri (daha az durak için)
                            chargingTargets = [85, 90, 95];
                            break;
                        case "cheapest":
                            // En ucuz: Düşük SoC hedefleri (şarj süresini minimize et)
                            chargingTargets = [40, 50, 60, 70];
                            break;
                        default:
                            // En hızlı: Dengeli hedefler
                            chargingTargets = [50, 60, 70, 80, 90];
                    }

                    for (const targetSoC of chargingTargets) {
                        if (targetSoC <= socAfterDriving) continue; // No need to charge

                        // Calculate charging time
                        const effectivePower = Math.min(targetNode.power, this.vehicle.maxDCPower);
                        const ambientTemp = this.stationWeather.get(targetNode.id) ?? this.batteryTemp;
                        const profile = getChargingProfile(this.vehicle.id);
                        let chargeResult;

                        if (profile) {
                            const result = calculateChargingTimeNew(
                                profile,
                                socAfterDriving,
                                targetSoC,
                                effectivePower,
                                ambientTemp
                            );
                            chargeResult = {
                                minutes: result.totalMinutes,
                                energyKwh: result.energyKwh,
                                avgPowerKw: result.avgPowerKw
                            };
                        } else {
                            // Fallback to old calculator if profile not found
                            chargeResult = calculateChargingTime(
                                this.vehicle,
                                socAfterDriving,
                                targetSoC,
                                effectivePower,
                                ambientTemp
                            );
                        }

                        const pricePerKwh = targetNode.powerType === "DC" ? this.pricePerKwhDC : this.pricePerKwhAC;
                        const chargingCost = chargeResult.energyKwh * pricePerKwh;

                        // Strategy-based cost calculation
                        let effectiveTime = current.totalTimeMin + edge.drivingTimeMin + chargeResult.minutes;
                        let effectiveCost = current.totalCostTL + chargingCost;

                        // Apply stop penalty for "fewest" strategy
                        if (this.strategy === "fewest") {
                            effectiveTime += this.stopPenaltyMin;
                        }

                        // For "cheapest", prefer lower power stations (usually cheaper)
                        if (this.strategy === "cheapest" && targetNode.powerType === "AC") {
                            effectiveCost *= 0.9; // AC stations often cheaper
                        }

                        const newState: StateNode = {
                            nodeId: edge.to,
                            socPercent: targetSoC,
                            previousState: current,
                            chargedToPercent: targetSoC,
                            totalTimeMin: effectiveTime,
                            totalCostTL: effectiveCost,
                        };

                        const newKey = stateKey(newState.nodeId, newState.socPercent);
                        const existingBest = visited.get(newKey);

                        // Use different comparison based on strategy
                        const shouldEnqueue = this.strategy === "cheapest"
                            ? (!existingBest || newState.totalCostTL < existingBest)
                            : (!existingBest || newState.totalTimeMin < existingBest);

                        if (shouldEnqueue) {
                            const remainingKm = (this.nodes.get("destination")?.routeProgressKm || 0) - (targetNode.routeProgressKm || 0);
                            const heuristic = remainingKm / 100 * 60;

                            // Priority based on strategy
                            const priority = this.strategy === "cheapest"
                                ? newState.totalCostTL + heuristic * 0.5
                                : newState.totalTimeMin + heuristic;

                            pq.enqueue(newState, priority);
                            // visited.set burada YAPILMAMALI - sadece dequeue edildiğinde
                        }
                    }
                }
            }
        }

        // Reconstruct path
        if (!bestSolution) {
            console.warn("[OPTIMIZER] No solution found after", nodesExplored, "nodes");
            return {
                success: false,
                stops: [],
                totalDrivingMin: 0,
                totalChargingMin: 0,
                totalTimeMin: 0,
                totalCostTL: 0,
                arrivalSoC: 0,
                nodesExplored,
                message: "Hedefe ulaşılamıyor. Yeterli şarj istasyonu bulunamadı.",
            };
        }

        const path: StateNode[] = [];
        let current: StateNode | null = bestSolution;
        while (current) {
            path.unshift(current);
            current = current.previousState;
        }

        // Extract charging stops
        const stops: OptimalStop[] = [];
        let totalChargingMin = 0;

        for (let i = 1; i < path.length; i++) {
            const state = path[i];
            const prevState = path[i - 1];
            const node = this.nodes.get(state.nodeId);

            if (state.chargedToPercent !== null && node && node.type === "station") {
                // This was a charging stop
                const edge = this.edges.find(e => e.from === prevState.nodeId && e.to === state.nodeId);
                const arrivalSoC = prevState.socPercent - ((edge?.energyKwh || 0) / this.vehicle.batteryCapacity) * 100;

                const effectivePower = Math.min(node.power || 0, this.vehicle.maxDCPower);
                const pricePerKwh = node.powerType === "DC" ? this.pricePerKwhDC : this.pricePerKwhAC;
                const ambientTemp = this.stationWeather.get(node.id) ?? this.batteryTemp;
                const stopWarnings: string[] = [];

                const profile = getChargingProfile(this.vehicle.id);
                let chargeResult;

                if (profile) {
                    const result = calculateChargingTimeNew(
                        profile,
                        arrivalSoC,
                        state.chargedToPercent,
                        effectivePower,
                        ambientTemp
                    );
                    chargeResult = {
                        minutes: result.totalMinutes,
                        energyKwh: result.energyKwh,
                        avgPowerKw: result.avgPowerKw,
                        peakPowerKw: result.peakPowerKw
                    };

                    // Generate warnings
                    if (ambientTemp < 5) {
                        stopWarnings.push(`Soğuk hava (${Math.round(ambientTemp)}°C) nedeniyle şarj süresi uzayabilir.`);
                    }
                    if (profile.batteryChemistry === 'LFP' && ambientTemp < 10) {
                        stopWarnings.push("LFP batarya soğukta daha yavaş şarj olur.");
                    }
                    if (!profile.temperatureEffects.preconditioningAvailable && ambientTemp < 10) {
                        stopWarnings.push("Bu araçta batarya ön ısıtma (preconditioning) yok, şarj hızı kısıtlanabilir.");
                    }
                } else {
                    chargeResult = calculateChargingTime(
                        this.vehicle,
                        arrivalSoC,
                        state.chargedToPercent,
                        effectivePower,
                        ambientTemp
                    );
                    if (ambientTemp < 5) {
                        stopWarnings.push(`Soğuk hava (${Math.round(ambientTemp)}°C) nedeniyle şarj süresi uzayabilir.`);
                    }
                }

                stops.push({
                    station: node,
                    arrivalSoC: Math.round(arrivalSoC),
                    departureSoC: state.chargedToPercent,
                    chargingTimeMin: Math.round(chargeResult.minutes),
                    chargingCostTL: Math.round(chargeResult.energyKwh * pricePerKwh),
                    energyChargedKwh: Math.round(chargeResult.energyKwh * 10) / 10,
                    distanceFromPrevKm: Math.round(edge?.distanceKm || 0),
                    temperatureC: Math.round(ambientTemp),
                    avgPowerKw: chargeResult.avgPowerKw,
                    peakPowerKw: chargeResult.peakPowerKw,
                    warnings: stopWarnings.length > 0 ? stopWarnings : undefined,
                });

                totalChargingMin += chargeResult.minutes;
            }
        }

        const consolidatedWarnings = Array.from(new Set(stops.flatMap(s => s.warnings || [])));

        const totalDrivingMin = bestSolution.totalTimeMin - totalChargingMin;

        console.log("[OPTIMIZER] Solution found:", {
            nodesExplored,
            stops: stops.length,
            totalTimeMin: Math.round(bestSolution.totalTimeMin),
            arrivalSoC: Math.round(bestSolution.socPercent),
            timeMs: Math.round(performance.now() - startTime),
        });

        return {
            success: true,
            stops,
            totalDrivingMin: Math.round(totalDrivingMin),
            totalChargingMin: Math.round(totalChargingMin),
            totalTimeMin: Math.round(bestSolution.totalTimeMin),
            totalCostTL: Math.round(bestSolution.totalCostTL),
            arrivalSoC: Math.round(bestSolution.socPercent),
            nodesExplored,
            warnings: consolidatedWarnings.length > 0 ? consolidatedWarnings : undefined,
        };
    }

    /**
     * Strateji bazlı optimizasyon
     */
    optimize(
        startSoC: number,
        strategy: "fastest" | "fewest" | "cheapest" = "fastest"
    ): OptimizationResult {
        this.strategy = strategy;

        // Farklı stratejiler için parametreleri ayarla
        switch (strategy) {
            case "fewest":
                // En az durak: Yüksek SoC hedefi, durak cezası
                this.maxSoC = 95;
                this.stopPenaltyMin = 15; // Her durak için 15 dk ceza (durak sayısını azaltmak için)
                this.preferHighPower = true;
                console.log("[OPTIMIZER] Strategy: FEWEST STOPS (penalty: 15min/stop)");
                break;
            case "cheapest":
                // En ucuz: Düşük SoC, AC tercih
                this.maxSoC = 80;
                this.stopPenaltyMin = 0;
                this.preferHighPower = false; // AC istasyonları tercih et (daha ucuz)
                console.log("[OPTIMIZER] Strategy: CHEAPEST (prefer AC stations)");
                break;
            default:
                // En hızlı: Dengeli
                this.maxSoC = 90;
                this.stopPenaltyMin = 0;
                this.preferHighPower = true;
                console.log("[OPTIMIZER] Strategy: FASTEST (balanced)");
        }

        return this.findOptimalRoute(startSoC);
    }

    /**
     * Tüm stratejileri çalıştırıp karşılaştırmalı sonuç döndür
     */
    compareStrategies(startSoC: number): {
        fastest: OptimizationResult;
        fewest: OptimizationResult;
        cheapest: OptimizationResult;
    } {
        return {
            fastest: this.optimize(startSoC, "fastest"),
            fewest: this.optimize(startSoC, "fewest"),
            cheapest: this.optimize(startSoC, "cheapest"),
        };
    }
}

// ===== CONVENIENCE FUNCTION =====

export function optimizeChargingStops(
    vehicle: Vehicle,
    origin: { name: string; lng: number; lat: number },
    destination: { name: string; lng: number; lat: number },
    stations: Array<{
        id: string;
        name: string;
        lng: number;
        lat: number;
        power: number;
        powerType: "DC" | "AC";
        operator?: string;
        routeProgressKm: number;
        detourKm?: number;
        detourMin?: number;
    }>,
    routeInfo: {
        distanceKm: number;
        durationMin: number;
        energyPerKm: number; // Wh/km from physics engine
    },
    settings: {
        startSoC: number;
        minArrivalSoC: number;
        batteryTemp: number;
        strategy: "fastest" | "fewest" | "cheapest";
    }
): OptimizationResult {
    const optimizer = new RouteOptimizer(
        vehicle,
        routeInfo.energyPerKm,
        settings.minArrivalSoC,
        settings.batteryTemp
    );

    optimizer.buildGraphFromRoute(
        origin,
        destination,
        stations,
        routeInfo.distanceKm,
        routeInfo.durationMin
    );

    return optimizer.optimize(settings.startSoC, settings.strategy);
}

export function compareChargingStrategies(
    vehicle: Vehicle,
    origin: { name: string; lng: number; lat: number },
    destination: { name: string; lng: number; lat: number },
    stations: Array<{
        id: string;
        name: string;
        lng: number;
        lat: number;
        power: number;
        powerType: "DC" | "AC";
        operator?: string;
        routeProgressKm: number;
        detourKm?: number;
        detourMin?: number;
    }>,
    routeInfo: {
        distanceKm: number;
        durationMin: number;
        energyPerKm: number;
    },
    settings: {
        startSoC: number;
        minArrivalSoC: number;
        batteryTemp: number;
    }
): {
    fastest: OptimizationResult;
    fewest: OptimizationResult;
    cheapest: OptimizationResult;
} {
    const optimizer = new RouteOptimizer(
        vehicle,
        routeInfo.energyPerKm,
        settings.minArrivalSoC,
        settings.batteryTemp
    );

    optimizer.buildGraphFromRoute(
        origin,
        destination,
        stations,
        routeInfo.distanceKm,
        routeInfo.durationMin
    );

    return optimizer.compareStrategies(settings.startSoC);
}
