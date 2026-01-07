// lib/weather.ts

// Scientific EV Energy Consumption Model
// Refactored for Batch API Processing & Performance

export interface WeatherPoint {
  lat: number;
  lng: number;
  temperature: number; // Celsius
  windSpeed: number; // m/s
  windDirection: number; // degrees
  humidity: number; // %
  precipitation: number; // mm
  condition: string;
  icon: string;
}

export interface RouteSegment {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distance: number; // km
  elevation: number; // meters (positive = uphill)
  bearing: number; // degrees
  weather: WeatherPoint;
  energyConsumption: number; // kWh
  adjustedConsumption: number; // kWh with weather effects
  temperatureEffect: number; // multiplier
  windEffect: number; // multiplier
  elevationEffect: number; // multiplier
  hvacConsumption: number; // kWh for heating/cooling
}

export interface RouteAnalysis {
  segments: RouteSegment[];
  totalDistance: number;
  totalBaseEnergy: number;
  totalAdjustedEnergy: number;
  totalHvacEnergy: number;
  averageTemperature: number;
  temperatureRange: { min: number; max: number };
  weatherSummary: string;
  rangeImpact: number; // percentage
  recommendations: string[];
  chartData: {
    labels: string[];
    temperatures: number[];
    consumption: number[];
    elevation: number[];
  };
}

export interface VehicleSpecs {
  batteryCapacity: number; // kWh
  range: number; // km (WLTP)
  baseConsumption: number; // kWh/100km at 20°C
  hvacPower: number; // kW (typical HVAC power draw)
  dragCoefficient: number; // Cd
  frontalArea: number; // m²
  mass: number; // kg
  regenEfficiency: number; // 0-1
}

// Default vehicle specs
export const defaultVehicleSpecs: VehicleSpecs = {
  batteryCapacity: 60,
  range: 400,
  baseConsumption: 15,
  hvacPower: 3,
  dragCoefficient: 0.28,
  frontalArea: 2.3,
  mass: 1800,
  regenEfficiency: 0.7,
};

const GRAVITY = 9.81;

// --- Physics Models ---

function getTemperatureEffect(tempCelsius: number): { capacityFactor: number; consumptionFactor: number } {
  // Simplified approximation of battery chemistry curve
  // Uses a smoother transition logic than hard steps where possible
  let consumptionFactor = 1.0;

  if (tempCelsius < 20) {
    // Cold weather penalty increases non-linearly
    // ~10% penalty at 10°C, ~25% at 0°C, ~40% at -10°C
    const delta = 20 - tempCelsius;
    consumptionFactor = 1.0 + (delta * 0.012) + (Math.pow(delta, 2) * 0.0005);
  } else if (tempCelsius > 25) {
    // Hot weather penalty (battery cooling overhead)
    const delta = tempCelsius - 25;
    consumptionFactor = 1.0 + (delta * 0.01);
  }

  // Cap extreme values to realistic bounds
  consumptionFactor = Math.min(Math.max(consumptionFactor, 0.9), 1.6);

  // Capacity availability (temporary lock-out due to cold)
  let capacityFactor = 1.0;
  if (tempCelsius < 0) {
    capacityFactor = 0.95 - (Math.abs(tempCelsius) * 0.01);
  }

  return { capacityFactor, consumptionFactor };
}

function calculateHvacConsumption(
  tempCelsius: number,
  durationHours: number,
  hvacPower: number = 3
): number {
  const targetTemp = 22;
  const tempDiff = Math.abs(tempCelsius - targetTemp);

  // HVAC load is not linear, initial cooldown/heatup takes more power
  // Assume average load based on delta T
  let loadFactor = 0;

  if (tempDiff < 3) loadFactor = 0.1; // Fan only
  else if (tempDiff < 10) loadFactor = 0.4; // Low effort
  else if (tempDiff < 20) loadFactor = 0.7; // Medium effort
  else loadFactor = 1.0; // Max effort

  return hvacPower * loadFactor * durationHours;
}

function calculateWindEffect(
  vehicleSpeed: number, // km/h
  windSpeed: number, // m/s
  windDirection: number,
  routeBearing: number,
  Cd: number = 0.28,
  frontalArea: number = 2.3
): number {
  const vehicleSpeedMs = vehicleSpeed / 3.6;

  // Angle difference
  let relativeAngle = Math.abs(windDirection - routeBearing);
  if (relativeAngle > 180) relativeAngle = 360 - relativeAngle;

  // Headwind component (positive = opposing force)
  const windComponent = windSpeed * Math.cos(relativeAngle * Math.PI / 180);

  // Aerodynamic drag force is proportional to v^2
  // Power is proportional to v^3
  // We approximate the energy consumption ratio

  const effectiveSpeed = vehicleSpeedMs + windComponent;

  // Avoid division by zero or negative effective speed physics in simple model
  if (vehicleSpeedMs < 1) return 1.0;

  // Aero drag power ratio ~ (v_eff / v_base)^3 
  // But aero is only ~60% of total highway consumption
  const aeroRatio = Math.pow(Math.abs(effectiveSpeed) / vehicleSpeedMs, 2); // Drag force ratio

  const aeroFraction = 0.6; // Typical for highway
  const otherFraction = 0.4; // Rolling resistance + internal

  const totalFactor = (aeroRatio * aeroFraction) + otherFraction;

  // Clamp for safety against extreme outliers in data
  return Math.max(0.7, Math.min(1.5, totalFactor));
}

// --- Helper Functions ---

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: "Açık", 1: "Çoğunlukla açık", 2: "Parçalı bulutlu", 3: "Bulutlu",
    45: "Sisli", 48: "Puslu", 51: "Hafif çiseleme", 53: "Çiseleme",
    55: "Yoğun çiseleme", 61: "Hafif yağmur", 63: "Yağmur", 65: "Şiddetli yağmur",
    71: "Hafif kar", 73: "Kar", 75: "Yoğun kar", 77: "Kar taneleri",
    80: "Hafif sağanak", 81: "Sağanak", 82: "Şiddetli sağanak",
    85: "Hafif kar sağanağı", 86: "Kar sağanağı", 95: "Fırtına", 99: "Dolu fırtınası",
  };
  return conditions[code] || "Bilinmiyor";
}

function getWeatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 65) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- Main Analysis Function ---

export async function analyzeRouteWithWeather(
  routeCoordinates: [number, number][], // [lng, lat][]
  vehicleSpecs: Partial<VehicleSpecs> = {},
  averageSpeed: number = 90 // km/h
): Promise<RouteAnalysis> {
  const specs: VehicleSpecs = { ...defaultVehicleSpecs, ...vehicleSpecs };

  // 1. Sampling Points Strategy
  // Don't take every point. Take points every ~50km to reduce API load and noise.
  const totalRouteDistance = routeCoordinates.reduce((sum, coord, i) => {
    if (i === 0) return 0;
    const prev = routeCoordinates[i - 1];
    return sum + calculateDistance(prev[1], prev[0], coord[1], coord[0]);
  }, 0);

  // Dynamic sampling: Max 20 points, Min 3 points
  const segmentTargetLength = 50; // km
  const targetPoints = Math.max(3, Math.min(20, Math.ceil(totalRouteDistance / segmentTargetLength)));

  const sampleIndices: number[] = [];
  const step = Math.max(1, Math.floor((routeCoordinates.length - 1) / (targetPoints - 1)));

  for (let i = 0; i < routeCoordinates.length; i += step) {
    sampleIndices.push(i);
  }
  if (sampleIndices[sampleIndices.length - 1] !== routeCoordinates.length - 1) {
    sampleIndices.push(routeCoordinates.length - 1);
  }

  // 2. Batch API Request (THE CRITICAL FIX)
  // Instead of N requests, we make 1 request with comma-separated coordinates
  const lats = sampleIndices.map(i => routeCoordinates[i][1]);
  const lngs = sampleIndices.map(i => routeCoordinates[i][0]);

  let weatherPoints: WeatherPoint[] = [];

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lngs.join(',')}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather API failed");

    const data = await response.json();

    // Open-Meteo returns an array of objects if multiple coords are sent, 
    // OR a single object if 1 coord is sent. Handle both.
    const results = Array.isArray(data) ? data : [data];

    weatherPoints = results.map((res: unknown, index: number) => {
      const data = res as { current: { temperature_2m: number; wind_speed_10m: number; wind_direction_10m: number; relative_humidity_2m: number; weather_code: number; precipitation?: number } };
      const current = data.current;
      return {
        lat: lats[index],
        lng: lngs[index],
        temperature: current.temperature_2m,
        windSpeed: current.wind_speed_10m / 3.6, // km/h -> m/s
        windDirection: current.wind_direction_10m,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation || 0,
        condition: getWeatherCondition(current.weather_code),
        icon: getWeatherIcon(current.weather_code),
      };
    });

  } catch (err) {
    console.error("Batch weather fetch error:", err);
    // Fallback: return dummy analysis instead of crashing
    return {
      segments: [],
      totalDistance: totalRouteDistance,
      totalBaseEnergy: 0,
      totalAdjustedEnergy: 0,
      totalHvacEnergy: 0,
      averageTemperature: 20,
      temperatureRange: { min: 20, max: 20 },
      weatherSummary: "Hava durumu verisi alınamadı",
      rangeImpact: 0,
      recommendations: ["⚠️ Hava durumu verisi güncel değil."],
      chartData: { labels: [], temperatures: [], consumption: [], elevation: [] },
    };
  }

  // 3. Segment Analysis
  const segments: RouteSegment[] = [];
  let cumulativeDistance = 0;

  for (let i = 0; i < weatherPoints.length - 1; i++) {
    const startW = weatherPoints[i];
    const endW = weatherPoints[i + 1];

    const dist = calculateDistance(startW.lat, startW.lng, endW.lat, endW.lng);
    const bearing = calculateBearing(startW.lat, startW.lng, endW.lat, endW.lng);

    // Averages
    const avgTemp = (startW.temperature + endW.temperature) / 2;
    const avgWindSpeed = (startW.windSpeed + endW.windSpeed) / 2;
    // Simple wind dir avg (careful with 0/360 boundary, but ignoring for MVP)
    const avgWindDir = startW.windDirection;

    // Calculate Factors
    const tEffect = getTemperatureEffect(avgTemp);
    const wEffect = calculateWindEffect(averageSpeed, avgWindSpeed, avgWindDir, bearing, specs.dragCoefficient, specs.frontalArea);

    const baseEnergy = (dist / 100) * specs.baseConsumption;

    // HVAC
    const durationHours = dist / averageSpeed;
    const hvacEnergy = calculateHvacConsumption(avgTemp, durationHours, specs.hvacPower);

    const adjustedConsumption = (baseEnergy * tEffect.consumptionFactor * wEffect) + hvacEnergy;

    segments.push({
      startLat: startW.lat,
      startLng: startW.lng,
      endLat: endW.lat,
      endLng: endW.lng,
      distance: dist,
      elevation: 0,
      bearing,
      weather: startW,
      energyConsumption: baseEnergy,
      adjustedConsumption: adjustedConsumption,
      temperatureEffect: tEffect.consumptionFactor,
      windEffect: wEffect,
      elevationEffect: 1,
      hvacConsumption: hvacEnergy,
    });

    cumulativeDistance += dist;
  }

  // 4. Aggregation
  const totalBase = segments.reduce((acc, s) => acc + s.energyConsumption, 0);
  const totalAdj = segments.reduce((acc, s) => acc + s.adjustedConsumption, 0);
  const totalHvac = segments.reduce((acc, s) => acc + s.hvacConsumption, 0);

  const temps = weatherPoints.map(w => w.temperature);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const avgTempTotal = temps.reduce((a, b) => a + b, 0) / temps.length;

  const rangeImpactPct = totalBase > 0 ? ((totalAdj - totalBase) / totalBase) * 100 : 0;

  // Recommendations
  const recs: string[] = [];
  if (minTemp < 5) recs.push("❄️ Batarya verimliliği düşebilir, ön ısıtma yapın.");
  if (maxTemp > 30) recs.push("☀️ Klima tüketimi menzili etkileyecek.");
  if (rangeImpactPct > 15) recs.push("⚠️ Rota zorlu, %15+ fazla enerji harcanacak.");
  const avgWind = weatherPoints.reduce((a, b) => a + b.windSpeed, 0) / weatherPoints.length;
  if (avgWind > 8) recs.push("💨 Şiddetli rüzgar sürtünmeyi artırıyor.");

  // Summary String
  const mainCondition = weatherPoints[Math.floor(weatherPoints.length / 2)].condition;

  return {
    segments,
    totalDistance: cumulativeDistance,
    totalBaseEnergy: Number(totalBase.toFixed(1)),
    totalAdjustedEnergy: Number(totalAdj.toFixed(1)),
    totalHvacEnergy: Number(totalHvac.toFixed(1)),
    averageTemperature: Number(avgTempTotal.toFixed(1)),
    temperatureRange: { min: minTemp, max: maxTemp },
    weatherSummary: `${mainCondition}, ~${Math.round(avgTempTotal)}°C`,
    rangeImpact: Math.round(rangeImpactPct),
    recommendations: recs,
    chartData: {
      labels: weatherPoints.map((_, i) => `${Math.round((i / (weatherPoints.length - 1)) * 100)}%`),
      temperatures: temps.map(t => Math.round(t)),
      consumption: segments.map(s => Number(s.adjustedConsumption.toFixed(2))),
      elevation: [],
    }
  };
}