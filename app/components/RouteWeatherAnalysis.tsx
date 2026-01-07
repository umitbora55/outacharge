"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Cloud, Loader2, ChevronDown, ChevronUp,
  Snowflake, Sun, AlertTriangle
} from "lucide-react";

interface RouteWeatherAnalysisProps {
  routeCoordinates: [number, number][];
  vehicleSpecs: {
    batteryCapacity: number;
    range: number;
  };
}

interface WeatherData {
  temperature: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
}

export default function RouteWeatherAnalysis({
  routeCoordinates,
  vehicleSpecs,
}: RouteWeatherAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Sample mid-point for weather
  const midPoint = useMemo(() => {
    if (!routeCoordinates?.length) return null;
    const mid = routeCoordinates[Math.floor(routeCoordinates.length / 2)];
    return { lng: mid[0], lat: mid[1] };
  }, [routeCoordinates]);

  useEffect(() => {
    if (!midPoint) return;

    const fetchWeather = async () => {
      setLoading(true);
      setError("");

      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${midPoint.lat}&longitude=${midPoint.lng}&current=temperature_2m,wind_speed_10m,weather_code`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        
        const data = await res.json();
        
        const weatherCodes: Record<number, string> = {
          0: "Açık", 1: "Az bulutlu", 2: "Parçalı bulutlu", 3: "Bulutlu",
          45: "Sisli", 48: "Kırağılı sis", 51: "Hafif çisenti", 53: "Çisenti",
          55: "Yoğun çisenti", 61: "Hafif yağmur", 63: "Yağmur", 65: "Şiddetli yağmur",
          71: "Hafif kar", 73: "Kar", 75: "Şiddetli kar", 80: "Sağanak",
          95: "Gök gürültülü fırtına"
        };

        setWeather({
          temperature: data.current.temperature_2m,
          windSpeed: data.current.wind_speed_10m,
          weatherCode: data.current.weather_code,
          description: weatherCodes[data.current.weather_code] || "Bilinmiyor"
        });
      } catch (e: any) {
        console.error("Weather fetch error:", e);
        setError(e?.message || "Hava durumu alınamadı");
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [midPoint?.lat, midPoint?.lng]);

  // Calculate consumption impact
  const baseConsumption = (vehicleSpecs.batteryCapacity / vehicleSpecs.range) * 100;
  
  let tempImpact = 0;
  let windImpact = 0;
  
  if (weather) {
    // Temperature impact: cold weather increases consumption
    if (weather.temperature < 0) tempImpact = 25;
    else if (weather.temperature < 10) tempImpact = 15;
    else if (weather.temperature < 20) tempImpact = 5;
    else if (weather.temperature > 35) tempImpact = 10;
    
    // Wind impact
    if (weather.windSpeed > 50) windImpact = 15;
    else if (weather.windSpeed > 30) windImpact = 10;
    else if (weather.windSpeed > 15) windImpact = 5;
  }

  const totalImpact = tempImpact + windImpact;
  const adjustedConsumption = baseConsumption * (1 + totalImpact / 100);
  const isHighImpact = totalImpact > 15;
  const isMediumImpact = totalImpact > 5 && totalImpact <= 15;

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          <span className="text-zinc-600">Hava durumu analizi yapılıyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
        <p className="text-zinc-900 font-medium">Hava Durumu Analizi</p>
        <p className="text-sm text-red-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${
      isHighImpact 
        ? "bg-gradient-to-br from-red-50 to-orange-50 border-red-200" 
        : isMediumImpact
        ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200"
        : "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200"
    }`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${
              isHighImpact 
                ? "bg-red-100" 
                : isMediumImpact 
                ? "bg-amber-100" 
                : "bg-emerald-100"
            }`}>
              <Cloud className={`w-5 h-5 ${
                isHighImpact 
                  ? "text-red-600" 
                  : isMediumImpact 
                  ? "text-amber-600" 
                  : "text-emerald-600"
              }`} />
            </div>
            <div>
              <p className="text-zinc-900 font-semibold flex items-center gap-2">
                Hava Analizi
                {isHighImpact && <AlertTriangle className="w-4 h-4 text-red-500" />}
              </p>
              <p className="text-zinc-500 text-sm">
                {weather.description}, {Math.round(weather.temperature)}°C
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className={`text-lg font-bold ${
              isHighImpact 
                ? "text-red-600" 
                : isMediumImpact 
                ? "text-amber-600" 
                : "text-emerald-600"
            }`}>
              +{totalImpact}%
            </p>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Tüketim Farkı</p>
          </div>
        </div>

        {/* Energy Comparison */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/80 backdrop-blur rounded-xl p-3 border border-gray-100">
            <p className="text-xs text-zinc-500 mb-1">Baz Tüketim</p>
            <p className="text-xl font-bold text-zinc-900">
              {baseConsumption.toFixed(1)} <span className="text-sm font-normal text-zinc-500">kWh/100km</span>
            </p>
          </div>
          <div className={`rounded-xl p-3 border ${
            isHighImpact 
              ? "bg-red-100/80 border-red-200" 
              : isMediumImpact
              ? "bg-amber-100/80 border-amber-200"
              : "bg-emerald-100/80 border-emerald-200"
          }`}>
            <p className={`text-xs mb-1 ${
              isHighImpact ? "text-red-600" : isMediumImpact ? "text-amber-600" : "text-emerald-600"
            }`}>Tahmini Tüketim</p>
            <p className={`text-xl font-bold ${
              isHighImpact ? "text-red-700" : isMediumImpact ? "text-amber-700" : "text-emerald-700"
            }`}>
              {adjustedConsumption.toFixed(1)} <span className="text-sm font-normal opacity-70">kWh/100km</span>
            </p>
          </div>
        </div>

        {/* Weather details */}
        <div className="flex items-center justify-between text-sm bg-white/60 rounded-xl px-4 py-3 mt-3 border border-gray-100">
          <div className="flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-blue-500" />
            <span className="text-zinc-600">{Math.round(weather.temperature)}°C</span>
          </div>
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-orange-500" />
            <span className="text-zinc-600">Rüzgar: {Math.round(weather.windSpeed)} km/s</span>
          </div>
        </div>

        {/* Recommendations */}
        {totalImpact > 0 && (
          <div className="bg-white/60 rounded-xl p-3 mt-3 border border-gray-100">
            <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-2">Öneriler</p>
            <ul className="space-y-1 text-sm text-zinc-600">
              {weather.temperature < 10 && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">⚠️</span>
                  <span>Batarya verimliliği düşebilir, ön ısıtma yapın.</span>
                </li>
              )}
              {weather.windSpeed > 30 && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">⚠️</span>
                  <span>Rüzgar tüketimi artırabilir.</span>
                </li>
              )}
              {totalImpact > 15 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-500">🔴</span>
                  <span>Rota zorlu, %15+ fazla enerji harcanacak.</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
