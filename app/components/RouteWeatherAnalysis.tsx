"use client";

import { useState, useEffect } from "react";
import {
  Cloud, Thermometer, Zap, Loader2, ChevronDown, ChevronUp,
  TrendingUp, Snowflake, Sun, AlertTriangle
} from "lucide-react";
import { analyzeRouteWithWeather, RouteAnalysis, defaultVehicleSpecs } from "@/lib/weather";

interface RouteWeatherAnalysisProps {
  routeCoordinates: [number, number][] | null;
  vehicleSpecs?: {
    batteryCapacity: number;
    range: number;
  };
}

export default function RouteWeatherAnalysis({
  routeCoordinates,
  vehicleSpecs,
}: RouteWeatherAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<RouteAnalysis | null>(null);
  const [expanded, setExpanded] = useState(false);
  
  // Coordinate hash to prevent unnecessary re-renders
  const coordHash = routeCoordinates 
    ? `${routeCoordinates.length}-${routeCoordinates[0]}-${routeCoordinates[routeCoordinates.length-1]}`
    : "";

  useEffect(() => {
    if (!routeCoordinates || routeCoordinates.length < 2) return;

    let isMounted = true;
    const analyze = async () => {
      setLoading(true);
      try {
        const specs = vehicleSpecs ? {
          ...defaultVehicleSpecs,
          batteryCapacity: vehicleSpecs.batteryCapacity,
          range: vehicleSpecs.range,
          baseConsumption: (vehicleSpecs.batteryCapacity / vehicleSpecs.range) * 100,
        } : defaultVehicleSpecs;

        // Use a timeout to allow UI to render 'loading' before heavy calculation/fetch
        await new Promise(r => setTimeout(r, 100)); 
        
        const result = await analyzeRouteWithWeather(routeCoordinates, specs);
        if (isMounted) setAnalysis(result);
      } catch (err) {
        console.error("Analysis failed", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    analyze();

    return () => { isMounted = false; };
  }, [coordHash, vehicleSpecs?.range]); // Only re-run if coordinates or vehicle specs drastically change

  if (!routeCoordinates || routeCoordinates.length < 2) return null;

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          <span className="text-slate-300 text-sm">Hava durumu ve enerji analizi yapılıyor...</span>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const isHighImpact = analysis.rangeImpact > 15;
  const isGoodCondition = analysis.rangeImpact <= 5;

  return (
    <div className={`rounded-xl border transition-colors ${
      isHighImpact ? "bg-red-950/20 border-red-500/30" : 
      isGoodCondition ? "bg-emerald-950/20 border-emerald-500/30" : 
      "bg-slate-800/50 border-slate-700"
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isHighImpact ? "bg-red-500/20" : "bg-emerald-500/20"
          }`}>
            <Cloud className={`w-5 h-5 ${isHighImpact ? "text-red-400" : "text-emerald-400"}`} />
          </div>
          <div className="text-left">
            <p className="text-white font-medium flex items-center gap-2">
              Hava Analizi
              {isHighImpact && <AlertTriangle className="w-4 h-4 text-red-400" />}
            </p>
            <p className="text-slate-400 text-xs">{analysis.weatherSummary}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className={`font-bold ${isHighImpact ? "text-red-400" : "text-emerald-400"}`}>
              {analysis.rangeImpact > 0 ? "+" : ""}{analysis.rangeImpact}%
            </p>
            <p className="text-[10px] text-slate-500 uppercase">Tüketim Farkı</p>
          </div>
          {expanded ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
        </div>
      </button>

      {/* Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          
          {/* Energy Grid */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-black/20 p-3 rounded-lg">
              <span className="text-slate-400 block text-xs mb-1">Baz Tüketim</span>
              <span className="text-white font-mono">{analysis.totalBaseEnergy} kWh</span>
            </div>
            <div className="bg-black/20 p-3 rounded-lg relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${isHighImpact ? "bg-red-500" : "bg-emerald-500"}`} />
              <span className="text-slate-400 block text-xs mb-1">Gerçek Tüketim</span>
              <span className={`font-mono font-bold ${isHighImpact ? "text-red-400" : "text-emerald-400"}`}>
                {analysis.totalAdjustedEnergy} kWh
              </span>
            </div>
          </div>

          {/* Temperature Chart (Simple Visual) */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1"><Snowflake className="w-3 h-3" /> Min {analysis.temperatureRange.min}°</span>
              <span className="flex items-center gap-1"><Sun className="w-3 h-3" /> Max {analysis.temperatureRange.max}°</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden flex">
              {analysis.chartData.temperatures.map((t, i) => {
                // Color mapping: Blue (<10) -> Green (10-25) -> Red (>25)
                let color = "bg-emerald-500";
                if (t < 10) color = "bg-blue-500";
                if (t > 25) color = "bg-orange-500";
                return <div key={i} className={`flex-1 ${color} opacity-80`} />;
              })}
            </div>
          </div>

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-blue-200 text-xs font-bold mb-2 uppercase tracking-wider">Öneriler</p>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-blue-100 flex items-start gap-2">
                    <span className="mt-0.5">•</span> {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}