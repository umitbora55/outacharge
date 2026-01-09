"use client";

import { useState } from "react";
import { Clock, MapPin, Zap, TrendingDown, Check, ChevronDown, ChevronUp } from "lucide-react";

interface ComparisonResult {
    strategy: "fastest" | "fewest" | "cheapest";
    label: string;
    icon: string;
    success: boolean;
    stops: number | any[];
    totalTimeMin: number;
    totalChargingMin: number;
    totalCostTL: number;
    arrivalSoC: number;
}

interface RouteComparisonProps {
    results: {
        fastest: ComparisonResult;
        fewest: ComparisonResult;
        cheapest: ComparisonResult;
    };
    onSelect: (strategy: "fastest" | "fewest" | "cheapest") => void;
    selectedStrategy: "fastest" | "fewest" | "cheapest";
}

export default function RouteComparison({ results, onSelect, selectedStrategy }: RouteComparisonProps) {
    const [expanded, setExpanded] = useState(true);

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hours === 0) return `${mins} dk`;
        return `${hours}s ${mins}dk`;
    };

    const strategies = [
        { key: "fastest" as const, label: "En Hızlı", icon: "⚡", color: "emerald" },
        { key: "fewest" as const, label: "Az Durak", icon: "📍", color: "sky" },
        { key: "cheapest" as const, label: "En Ucuz", icon: "💰", color: "amber" },
    ];

    const getBestFor = (key: "fastest" | "fewest" | "cheapest") => {
        const r = results[key];
        if (!r.success) return null;

        switch (key) {
            case "fastest": return `${formatDuration(r.totalTimeMin)} toplam`;
            case "fewest": return `${Array.isArray(r.stops) ? r.stops.length : r.stops} durak`;
            case "cheapest": return `₺${r.totalCostTL}`;
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
            >
                <h3 className="text-zinc-900 font-bold flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-purple-500" />
                    Strateji Karşılaştırması
                </h3>
                {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3">
                    {strategies.map(({ key, label, icon, color }) => {
                        const result = results[key];
                        const isSelected = selectedStrategy === key;
                        const best = getBestFor(key);

                        if (!result || !result.success) {
                            return (
                                <div key={key} className="p-3 bg-gray-50 rounded-xl opacity-50 border border-dashed border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{icon}</span>
                                        <span className="font-medium text-gray-400">{label}</span>
                                        <span className="text-[10px] text-red-400 ml-auto px-2 py-0.5 bg-red-50 rounded-full">Uygun Değil</span>
                                    </div>
                                </div>
                            );
                        }

                        const colorClasses: Record<string, string> = {
                            emerald: isSelected ? "border-emerald-500 bg-emerald-50/50" : "border-gray-100 hover:border-emerald-200",
                            sky: isSelected ? "border-sky-500 bg-sky-50/50" : "border-gray-100 hover:border-sky-200",
                            amber: isSelected ? "border-amber-500 bg-amber-50/50" : "border-gray-100 hover:border-amber-200",
                        };

                        const iconBgClasses: Record<string, string> = {
                            emerald: isSelected ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400",
                            sky: isSelected ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-400",
                            amber: isSelected ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-400",
                        };

                        return (
                            <button
                                key={key}
                                onClick={() => onSelect(key)}
                                className={`w-full p-3 rounded-xl border-2 transition text-left group animate-in fade-in slide-in-from-bottom-2 ${colorClasses[color]}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 flex items-center justify-center rounded-lg text-xl transition-all ${iconBgClasses[color]}`}>
                                            {icon}
                                        </div>
                                        <div>
                                            <span className="block font-bold text-zinc-900">{label}</span>
                                            {isSelected && (
                                                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                                                    <Check className="w-3 h-3" /> Seçili Rota
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`block text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5`}>
                                            {key === "fastest" ? "Süre" : key === "fewest" ? "Durak" : "Maliyet"}
                                        </span>
                                        <span className={`text-sm font-bold ${isSelected ? `text-${color}-600` : "text-zinc-700"}`}>
                                            {best}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100/50 text-[11px] text-gray-500">
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                        {formatDuration(result.totalTimeMin)}
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                        {Array.isArray(result.stops) ? result.stops.length : result.stops} durak
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <Zap className="w-3.5 h-3.5 text-gray-400" />
                                        {formatDuration(result.totalChargingMin)} şarj
                                    </div>
                                    <div className={`text-right font-bold flex items-center justify-end pt-1 ${isSelected ? `text-${color}-600` : "text-zinc-600"}`}>
                                        ₺{result.totalCostTL}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
