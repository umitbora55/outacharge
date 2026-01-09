"use client";

import { useState } from "react";
import {
    Battery, Zap, Clock, MapPin, Navigation, ChevronDown, ChevronUp,
    Fuel, Timer, TrendingDown, Car, Flag, Circle, ArrowRight
} from "lucide-react";

interface ChargingStop {
    station: {
        id: number;
        name: string;
        operator: string;
        power: number;
        powerType: string;
        lng: number;
        lat: number;
        routeProgressKm: number;
    };
    arrivalCharge: number;
    departureCharge: number;
    chargingTime: number;
    chargingCost: number;
    distanceFromPrev: number;
}

interface RouteJourneyProps {
    origin: string;
    destination: string;
    totalDistance: number;
    totalDuration: number;
    totalChargingTime: number;
    totalChargingCost: number;
    startCharge: number;
    arrivalCharge: number;
    energyUsed: number;
    efficiency: number;
    chargingStops: ChargingStop[];
    vehicleName: string;
    vehicleRange: number;
    batteryCapacity: number;
}

// Batarya göstergesi
function BatteryIndicator({ percent, size = "md" }: { percent: number; size?: "sm" | "md" | "lg" }) {
    const getColor = () => {
        if (percent <= 15) return "bg-red-500";
        if (percent <= 30) return "bg-orange-500";
        if (percent <= 50) return "bg-yellow-500";
        return "bg-emerald-500";
    };

    const sizeClasses = {
        sm: "w-8 h-4",
        md: "w-12 h-6",
        lg: "w-16 h-8"
    };

    const textSizes = {
        sm: "text-[8px]",
        md: "text-[10px]",
        lg: "text-xs"
    };

    return (
        <div className={`${sizeClasses[size]} bg-gray-200 rounded-sm relative overflow-hidden border-2 border-gray-300`}>
            <div
                className={`absolute left-0 top-0 bottom-0 ${getColor()} transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            />
            <div className={`absolute inset-0 flex items-center justify-center ${textSizes[size]} font-bold text-gray-700`}>
                {percent}%
            </div>
            {/* Battery tip */}
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-2 bg-gray-300 rounded-r-sm" />
        </div>
    );
}

// Şarj hız göstergesi
function ChargingSpeedBadge({ power }: { power: number }) {
    const getSpeedLabel = () => {
        if (power >= 250) return { label: "Ultra Hızlı", color: "bg-purple-500" };
        if (power >= 150) return { label: "Süper Hızlı", color: "bg-blue-500" };
        if (power >= 50) return { label: "Hızlı", color: "bg-emerald-500" };
        return { label: "Normal", color: "bg-gray-500" };
    };
    const { label, color } = getSpeedLabel();

    return (
        <span className={`${color} text-white text-[10px] px-2 py-0.5 rounded-full font-medium`}>
            {label}
        </span>
    );
}

// Operatör logosu placeholder
function OperatorLogo({ operator }: { operator: string }) {
    const getInitials = (name: string) => {
        const words = name.split(" ");
        if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const getColor = (name: string) => {
        const colors = [
            "bg-blue-500", "bg-emerald-500", "bg-purple-500",
            "bg-orange-500", "bg-pink-500", "bg-cyan-500"
        ];
        const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[index % colors.length];
    };

    return (
        <div className={`w-10 h-10 ${getColor(operator)} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
            {getInitials(operator)}
        </div>
    );
}

export default function RouteJourney({
    origin,
    destination,
    totalDistance,
    totalDuration,
    totalChargingTime,
    totalChargingCost,
    startCharge,
    arrivalCharge,
    energyUsed,
    efficiency,
    chargingStops,
    vehicleName,
    vehicleRange,
    batteryCapacity,
}: RouteJourneyProps) {
    const [expandedStop, setExpandedStop] = useState<number | null>(null);
    const [showDetails, setShowDetails] = useState(true);

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours === 0) return `${mins} dk`;
        return `${hours}s ${mins}dk`;
    };

    const formatTime = (minutes: number) => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + minutes);
        return now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    };

    // Timeline noktaları oluştur
    const journeyPoints = [
        { type: "origin", name: origin, km: 0, charge: startCharge, time: 0 },
        ...chargingStops.map((stop, idx) => ({
            type: "charging",
            name: stop.station.name,
            km: stop.station.routeProgressKm,
            charge: stop.arrivalCharge,
            chargeAfter: stop.departureCharge,
            time: 0, // Will calculate
            stop,
            idx
        })),
        { type: "destination", name: destination, km: totalDistance, charge: arrivalCharge, time: totalDuration + totalChargingTime }
    ];

    // Toplam süreyi hesapla
    let cumulativeTime = 0;
    let lastKm = 0;
    const avgSpeed = totalDistance / (totalDuration / 60);

    journeyPoints.forEach((point, idx) => {
        if (idx === 0) {
            point.time = 0;
        } else {
            const driveTime = ((point.km - lastKm) / avgSpeed) * 60;
            cumulativeTime += driveTime;
            if (point.type === "charging") {
                point.time = cumulativeTime;
                cumulativeTime += (point as any).stop.chargingTime;
            } else {
                point.time = cumulativeTime;
            }
        }
        lastKm = point.km;
    });

    return (
        <div className="space-y-4">
            {/* Hero Summary Card */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold">Yolculuk Planı</h3>
                        <p className="text-emerald-100 text-sm">{vehicleName}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold">{formatDuration(totalDuration + totalChargingTime)}</div>
                        <div className="text-emerald-100 text-sm">Toplam Süre</div>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-white/20 rounded-xl p-2">
                        <Navigation className="w-5 h-5 mx-auto mb-1" />
                        <div className="font-bold">{totalDistance} km</div>
                        <div className="text-[10px] text-emerald-100">Mesafe</div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-2">
                        <Car className="w-5 h-5 mx-auto mb-1" />
                        <div className="font-bold">{formatDuration(totalDuration)}</div>
                        <div className="text-[10px] text-emerald-100">Sürüş</div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-2">
                        <Zap className="w-5 h-5 mx-auto mb-1" />
                        <div className="font-bold">{formatDuration(totalChargingTime)}</div>
                        <div className="text-[10px] text-emerald-100">Şarj</div>
                    </div>
                    <div className="bg-white/20 rounded-xl p-2">
                        <Fuel className="w-5 h-5 mx-auto mb-1" />
                        <div className="font-bold">₺{totalChargingCost}</div>
                        <div className="text-[10px] text-emerald-100">Maliyet</div>
                    </div>
                </div>

                {/* Battery Journey Mini */}
                <div className="mt-4 bg-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <BatteryIndicator percent={startCharge} size="sm" />
                            <span className="text-emerald-100">Başlangıç</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-emerald-200" />
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-100">Varış</span>
                            <BatteryIndicator percent={arrivalCharge} size="sm" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Journey Timeline */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                    <h3 className="text-zinc-900 font-bold flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-emerald-500" />
                        Yolculuk Detayları
                    </h3>
                    {showDetails ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {showDetails && (
                    <div className="px-4 pb-4">
                        {/* Timeline */}
                        <div className="relative">
                            {journeyPoints.map((point, idx) => (
                                <div key={idx} className="relative">
                                    {/* Connecting Line */}
                                    {idx < journeyPoints.length - 1 && (
                                        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gradient-to-b from-emerald-400 to-emerald-300" />
                                    )}

                                    {/* Point */}
                                    <div className="flex gap-4 pb-6">
                                        {/* Icon */}
                                        <div className="relative z-10">
                                            {point.type === "origin" && (
                                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                                                    <Circle className="w-5 h-5 text-white" />
                                                </div>
                                            )}
                                            {point.type === "destination" && (
                                                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                                                    <Flag className="w-5 h-5 text-white" />
                                                </div>
                                            )}
                                            {point.type === "charging" && (
                                                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg ring-4 ring-emerald-100">
                                                    <Zap className="w-5 h-5 text-white" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            {point.type === "origin" && (
                                                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="text-xs text-blue-500 font-medium">BAŞLANGIÇ</div>
                                                            <div className="text-zinc-900 font-bold truncate">{point.name}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs text-gray-500">Şarj</div>
                                                            <BatteryIndicator percent={point.charge} size="sm" />
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                                                        <Clock className="w-3 h-3" />
                                                        Tahmini Kalkış: {formatTime(0)}
                                                    </div>
                                                </div>
                                            )}

                                            {point.type === "destination" && (
                                                <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="text-xs text-red-500 font-medium">VARIŞ</div>
                                                            <div className="text-zinc-900 font-bold truncate">{point.name}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xs text-gray-500">Şarj</div>
                                                            <BatteryIndicator percent={point.charge} size="sm" />
                                                        </div>
                                                    </div>
                                                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                                                        <Clock className="w-3 h-3" />
                                                        Tahmini Varış: {formatTime(point.time)}
                                                    </div>
                                                </div>
                                            )}

                                            {point.type === "charging" && (
                                                <div
                                                    className={`bg-emerald-50 rounded-xl border border-emerald-100 overflow-hidden cursor-pointer transition-all ${expandedStop === (point as any).idx ? "ring-2 ring-emerald-400" : ""}`}
                                                    onClick={() => setExpandedStop(expandedStop === (point as any).idx ? null : (point as any).idx)}
                                                >
                                                    <div className="p-3">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-xs text-emerald-600 font-medium">ŞARJ DURAĞI {(point as any).idx + 1}</span>
                                                                    <ChargingSpeedBadge power={(point as any).stop.station.power} />
                                                                </div>
                                                                <div className="text-zinc-900 font-bold truncate">{point.name}</div>
                                                                <div className="text-xs text-gray-500 mt-1">{(point as any).stop.station.operator}</div>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <div className="text-emerald-600 font-bold">{(point as any).stop.chargingTime} dk</div>
                                                                <div className="text-xs text-gray-500">₺{(point as any).stop.chargingCost}</div>
                                                            </div>
                                                        </div>

                                                        {/* Battery Change */}
                                                        <div className="mt-3 flex items-center justify-center gap-3 bg-white rounded-lg p-2">
                                                            <div className="text-center">
                                                                <div className="text-[10px] text-gray-400">Varış</div>
                                                                <BatteryIndicator percent={point.charge} size="sm" />
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <ArrowRight className="w-4 h-4 text-emerald-500" />
                                                                <Zap className="w-4 h-4 text-yellow-500 animate-pulse" />
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-[10px] text-gray-400">Çıkış</div>
                                                                <BatteryIndicator percent={(point as any).chargeAfter} size="sm" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Details */}
                                                    {expandedStop === (point as any).idx && (
                                                        <div className="border-t border-emerald-200 bg-emerald-100/50 p-3 space-y-2">
                                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <Zap className="w-3 h-3 text-emerald-500" />
                                                                    <span className="text-gray-600">Güç:</span>
                                                                    <span className="text-zinc-900 font-medium">{(point as any).stop.station.power} kW {(point as any).stop.station.powerType}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Navigation className="w-3 h-3 text-emerald-500" />
                                                                    <span className="text-gray-600">Km:</span>
                                                                    <span className="text-zinc-900 font-medium">{Math.round(point.km)} km</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Timer className="w-3 h-3 text-emerald-500" />
                                                                    <span className="text-gray-600">Enerji:</span>
                                                                    <span className="text-zinc-900 font-medium">{Math.round(((point as any).chargeAfter - point.charge) / 100 * batteryCapacity)} kWh</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Clock className="w-3 h-3 text-emerald-500" />
                                                                    <span className="text-gray-600">Varış:</span>
                                                                    <span className="text-zinc-900 font-medium">{formatTime(point.time)}</span>
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={`https://www.google.com/maps/dir/?api=1&destination=${(point as any).stop.station.lat},${(point as any).stop.station.lng}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="block w-full py-2 bg-emerald-500 text-white text-center text-xs font-medium rounded-lg hover:bg-emerald-600 transition"
                                                            >
                                                                Google Maps&apos;te Aç
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Distance to next */}
                                            {idx < journeyPoints.length - 1 && (
                                                <div className="mt-2 ml-2 flex items-center gap-2 text-xs text-gray-400">
                                                    <TrendingDown className="w-3 h-3" />
                                                    {Math.round(journeyPoints[idx + 1].km - point.km)} km • ~{formatDuration(Math.round((journeyPoints[idx + 1].km - point.km) / avgSpeed * 60))} sürüş
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Energy Efficiency Card */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-100">
                <h3 className="text-zinc-900 font-bold mb-3 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-blue-500" />
                    Enerji Analizi
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                        <div className="text-2xl font-bold text-blue-600">{energyUsed}</div>
                        <div className="text-xs text-gray-500">kWh Toplam</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                        <div className="text-2xl font-bold text-emerald-600">{efficiency}</div>
                        <div className="text-xs text-gray-500">Wh/km</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                        <div className="text-2xl font-bold text-purple-600">{Math.round(totalDistance / (energyUsed || 1) * batteryCapacity)}</div>
                        <div className="text-xs text-gray-500">km Menzil</div>
                    </div>
                </div>
                <div className="mt-3 text-xs text-gray-500 text-center">
                    Katalog menzili: {vehicleRange} km • Gerçek menzil hava durumu ve sürüş stiline bağlıdır
                </div>
            </div>
        </div>
    );
}
