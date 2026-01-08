/**
 * WEATHER SERVICE - Open-Meteo API Entegrasyonu
 * 
 * Rota boyunca hava durumu verilerini çeker ve enerji hesaplaması için
 * uygun formata dönüştürür.
 * 
 * API: https://open-meteo.com/ (Ücretsiz, API key gerektirmez)
 */

export interface WeatherPoint {
    lat: number;
    lng: number;
    atKm: number;
    temperature: number;        // °C
    windSpeed: number;          // km/h
    windDirection: number;      // derece (0-360, kuzeyden saat yönünde)
    precipitation: number;      // mm/saat
    humidity: number;           // %
    pressure: number;           // hPa
    cloudCover: number;         // %
    visibility: number;         // metre
}

export interface RouteWeatherSummary {
    points: WeatherPoint[];
    average: {
        temperature: number;
        windSpeed: number;
        headwindComponent: number;  // Rota yönüne göre karşı rüzgar bileşeni
        precipitation: number;
        humidity: number;
    };
    conditions: {
        isCold: boolean;           // < 10°C
        isHot: boolean;            // > 30°C
        isRainy: boolean;          // precipitation > 0.5
        isWindy: boolean;          // windSpeed > 30
        rainIntensity: 0 | 1 | 2 | 3;  // 0=kuru, 1=hafif, 2=orta, 3=şiddetli
    };
    warnings: string[];
}

/**
 * Rota bearing'ini hesaplar (başlangıçtan bitişe yön)
 * 0 = Kuzey, 90 = Doğu, 180 = Güney, 270 = Batı
 */
function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;

    const dLng = toRad(lng2 - lng1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);

    const x = Math.sin(dLng) * Math.cos(lat2Rad);
    const y = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    let bearing = toDeg(Math.atan2(x, y));
    return (bearing + 360) % 360;
}

/**
 * Rüzgarın rota yönüne göre karşı bileşenini hesaplar
 * Pozitif = karşı rüzgar, Negatif = arkadan rüzgar
 */
function calculateHeadwindComponent(
    windSpeed: number,
    windDirection: number,
    routeBearing: number
): number {
    // Rüzgar yönü: rüzgarın GELDİĞİ yön
    // Route bearing: gidilen yön
    // Karşı rüzgar = rüzgar yönü ile rota yönü arasındaki fark ~0° ise tam karşı

    const toRad = (d: number) => (d * Math.PI) / 180;

    // Rüzgarın geldiği yön ile rotanın gittiği yön arasındaki açı
    const angleDiff = windDirection - routeBearing;

    // Karşı bileşen: cos(açı farkı) * hız
    // 0° fark = tam karşı (+1), 180° fark = tam arkadan (-1)
    const headwind = windSpeed * Math.cos(toRad(angleDiff));

    return headwind;
}

/**
 * Yağış yoğunluğunu kategorize eder
 */
function categorizeRain(precipitationMmH: number): 0 | 1 | 2 | 3 {
    if (precipitationMmH < 0.1) return 0;      // Kuru
    if (precipitationMmH < 2.5) return 1;      // Hafif
    if (precipitationMmH < 7.5) return 2;      // Orta
    return 3;                                   // Şiddetli
}

/**
 * Tek bir nokta için hava durumu çeker
 */
async function fetchWeatherForPoint(lat: number, lng: number): Promise<{
    temperature: number;
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    humidity: number;
    pressure: number;
    cloudCover: number;
    visibility: number;
} | null> {
    try {
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.searchParams.set('latitude', lat.toFixed(4));
        url.searchParams.set('longitude', lng.toFixed(4));
        url.searchParams.set('current', [
            'temperature_2m',
            'relative_humidity_2m',
            'precipitation',
            'wind_speed_10m',
            'wind_direction_10m',
            'surface_pressure',
            'cloud_cover',
            'visibility'
        ].join(','));
        url.searchParams.set('timezone', 'auto');

        const response = await fetch(url.toString());

        if (!response.ok) {
            console.error(`Weather API error: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const current = data.current;

        if (!current) return null;

        return {
            temperature: current.temperature_2m ?? 20,
            windSpeed: current.wind_speed_10m ?? 0,
            windDirection: current.wind_direction_10m ?? 0,
            precipitation: current.precipitation ?? 0,
            humidity: current.relative_humidity_2m ?? 50,
            pressure: current.surface_pressure ?? 1013,
            cloudCover: current.cloud_cover ?? 0,
            visibility: current.visibility ?? 10000,
        };
    } catch (error) {
        console.error('Weather fetch error:', error);
        return null;
    }
}

/**
 * Birden fazla nokta için batch hava durumu çeker
 * Open-Meteo birden fazla lokasyonu tek istekte destekliyor
 */
async function fetchWeatherBatch(points: Array<{ lat: number; lng: number; atKm: number }>): Promise<WeatherPoint[]> {
    const results: WeatherPoint[] = [];

    // Open-Meteo'nun batch endpoint'i yok, sırayla çekiyoruz
    // Ama rate limit olmadığı için sorun değil
    // Paralel çekmek için Promise.all kullanabiliriz

    const BATCH_SIZE = 5; // Aynı anda 5 istek

    for (let i = 0; i < points.length; i += BATCH_SIZE) {
        const batch = points.slice(i, i + BATCH_SIZE);

        const promises = batch.map(async (point) => {
            const weather = await fetchWeatherForPoint(point.lat, point.lng);

            if (weather) {
                return {
                    lat: point.lat,
                    lng: point.lng,
                    atKm: point.atKm,
                    ...weather,
                };
            }

            // Fallback: varsayılan değerler
            return {
                lat: point.lat,
                lng: point.lng,
                atKm: point.atKm,
                temperature: 20,
                windSpeed: 10,
                windDirection: 0,
                precipitation: 0,
                humidity: 50,
                pressure: 1013,
                cloudCover: 50,
                visibility: 10000,
            };
        });

        const batchResults = await Promise.all(promises);
        results.push(...batchResults);

        // Rate limiting - her batch arasında küçük bekleme
        if (i + BATCH_SIZE < points.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return results;
}

/**
 * Rota koordinatlarından örnek noktalar seçer
 */
function sampleRoutePoints(
    coordinates: [number, number][],
    sampleDistanceKm: number,
    routeDistanceKmFn: (coords: [number, number][]) => number
): Array<{ lat: number; lng: number; atKm: number }> {
    const points: Array<{ lat: number; lng: number; atKm: number }> = [];

    if (coordinates.length < 2) return points;

    // İlk nokta
    points.push({
        lng: coordinates[0][0],
        lat: coordinates[0][1],
        atKm: 0,
    });

    let lastSampleKm = 0;

    for (let i = 1; i < coordinates.length; i++) {
        const currentKm = routeDistanceKmFn(coordinates.slice(0, i + 1));

        if (currentKm - lastSampleKm >= sampleDistanceKm) {
            points.push({
                lng: coordinates[i][0],
                lat: coordinates[i][1],
                atKm: Math.round(currentKm * 10) / 10,
            });
            lastSampleKm = currentKm;
        }
    }

    // Son nokta (eğer eklenmemişse)
    const lastCoord = coordinates[coordinates.length - 1];
    const totalKm = routeDistanceKmFn(coordinates);
    const lastPoint = points[points.length - 1];

    if (!lastPoint || Math.abs(lastPoint.atKm - totalKm) > 5) {
        points.push({
            lng: lastCoord[0],
            lat: lastCoord[1],
            atKm: Math.round(totalKm * 10) / 10,
        });
    }

    return points;
}

/**
 * Ana fonksiyon: Rota boyunca hava durumu analizi
 */
export async function getRouteWeather(
    coordinates: [number, number][],
    routeDistanceKmFn: (coords: [number, number][]) => number,
    sampleEveryKm: number = 50
): Promise<RouteWeatherSummary> {
    const warnings: string[] = [];

    // Örnek noktaları seç
    const samplePoints = sampleRoutePoints(coordinates, sampleEveryKm, routeDistanceKmFn);

    if (samplePoints.length === 0) {
        return {
            points: [],
            average: {
                temperature: 20,
                windSpeed: 10,
                headwindComponent: 0,
                precipitation: 0,
                humidity: 50,
            },
            conditions: {
                isCold: false,
                isHot: false,
                isRainy: false,
                isWindy: false,
                rainIntensity: 0,
            },
            warnings: ['Rota koordinatları yetersiz'],
        };
    }

    // Hava durumu verilerini çek
    const weatherPoints = await fetchWeatherBatch(samplePoints);

    // Rota yönünü hesapla (başlangıç → bitiş)
    const startPoint = coordinates[0];
    const endPoint = coordinates[coordinates.length - 1];
    const routeBearing = calculateBearing(
        startPoint[1], startPoint[0],
        endPoint[1], endPoint[0]
    );

    // Ortalamaları hesapla
    let totalTemp = 0;
    let totalWind = 0;
    let totalHeadwind = 0;
    let totalPrecip = 0;
    let totalHumidity = 0;
    let maxPrecip = 0;
    let minTemp = Infinity;
    let maxTemp = -Infinity;
    let maxWind = 0;

    for (const point of weatherPoints) {
        totalTemp += point.temperature;
        totalWind += point.windSpeed;
        totalPrecip += point.precipitation;
        totalHumidity += point.humidity;

        // Karşı rüzgar bileşeni
        const headwind = calculateHeadwindComponent(
            point.windSpeed,
            point.windDirection,
            routeBearing
        );
        totalHeadwind += headwind;

        // Min/max tracking
        if (point.temperature < minTemp) minTemp = point.temperature;
        if (point.temperature > maxTemp) maxTemp = point.temperature;
        if (point.windSpeed > maxWind) maxWind = point.windSpeed;
        if (point.precipitation > maxPrecip) maxPrecip = point.precipitation;
    }

    const count = weatherPoints.length;
    const avgTemp = count > 0 ? totalTemp / count : 20;
    const avgWind = count > 0 ? totalWind / count : 10;
    const avgHeadwind = count > 0 ? totalHeadwind / count : 0;
    const avgPrecip = count > 0 ? totalPrecip / count : 0;
    const avgHumidity = count > 0 ? totalHumidity / count : 50;

    // Koşulları değerlendir
    const isCold = avgTemp < 10;
    const isHot = avgTemp > 30;
    const isRainy = avgPrecip > 0.5;
    const isWindy = avgWind > 30;
    const rainIntensity = categorizeRain(maxPrecip);

    // Uyarılar oluştur
    if (minTemp < 0) {
        warnings.push(`⚠️ Dondurucu soğuk: Bazı bölgelerde ${Math.round(minTemp)}°C. Menzil %30-40 düşebilir.`);
    } else if (isCold) {
        warnings.push(`❄️ Soğuk hava: Ortalama ${Math.round(avgTemp)}°C. Menzil %15-25 düşebilir.`);
    }

    if (isHot) {
        warnings.push(`🌡️ Sıcak hava: Ortalama ${Math.round(avgTemp)}°C. Klima kullanımı menzili %10-15 azaltabilir.`);
    }

    if (avgHeadwind > 20) {
        warnings.push(`💨 Güçlü karşı rüzgar: ~${Math.round(avgHeadwind)} km/h. Menzil %15-25 düşebilir.`);
    } else if (avgHeadwind < -15) {
        warnings.push(`🍃 Arkadan rüzgar: ~${Math.round(Math.abs(avgHeadwind))} km/h. Menzil biraz artabilir.`);
    }

    if (rainIntensity >= 2) {
        warnings.push(`🌧️ Yağışlı hava: Yol tutuşu ve görüş azalabilir. Tüketim %5-10 artabilir.`);
    }

    if (maxWind > 50) {
        warnings.push(`🌪️ Çok kuvvetli rüzgar: ${Math.round(maxWind)} km/h. Dikkatli sürüş önerilir.`);
    }

    return {
        points: weatherPoints,
        average: {
            temperature: Math.round(avgTemp * 10) / 10,
            windSpeed: Math.round(avgWind * 10) / 10,
            headwindComponent: Math.round(avgHeadwind * 10) / 10,
            precipitation: Math.round(avgPrecip * 100) / 100,
            humidity: Math.round(avgHumidity),
        },
        conditions: {
            isCold,
            isHot,
            isRainy,
            isWindy,
            rainIntensity,
        },
        warnings,
    };
}

/**
 * Hava durumu verilerini WeatherConditions formatına dönüştürür
 * (terrain.ts'deki enerji hesaplaması için)
 */
export function toWeatherConditions(summary: RouteWeatherSummary, altitudeM: number = 500): {
    temperatureC: number;
    headwindKmh: number;
    rainIntensity: number;
    altitude: number;
} {
    return {
        temperatureC: summary.average.temperature,
        headwindKmh: summary.average.headwindComponent,
        rainIntensity: summary.conditions.rainIntensity,
        altitude: altitudeM,
    };
}

/**
 * Hızlı hava durumu - sadece başlangıç ve bitiş noktası
 * (Detaylı analiz gerekmediğinde kullanılır)
 */
export async function getQuickWeather(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
): Promise<{
    temperature: number;
    headwindKmh: number;
    rainIntensity: 0 | 1 | 2 | 3;
    warning: string | null;
}> {
    const startWeather = await fetchWeatherForPoint(startLat, startLng);
    const endWeather = await fetchWeatherForPoint(endLat, endLng);

    if (!startWeather || !endWeather) {
        return {
            temperature: 20,
            headwindKmh: 0,
            rainIntensity: 0,
            warning: null,
        };
    }

    const avgTemp = (startWeather.temperature + endWeather.temperature) / 2;
    const avgWind = (startWeather.windSpeed + endWeather.windSpeed) / 2;
    const avgPrecip = Math.max(startWeather.precipitation, endWeather.precipitation);

    const bearing = calculateBearing(startLat, startLng, endLat, endLng);
    const avgWindDir = (startWeather.windDirection + endWeather.windDirection) / 2;
    const headwind = calculateHeadwindComponent(avgWind, avgWindDir, bearing);

    let warning: string | null = null;
    if (avgTemp < 5) {
        warning = `Soğuk hava (${Math.round(avgTemp)}°C) - Menzil düşebilir`;
    } else if (headwind > 25) {
        warning = `Kuvvetli karşı rüzgar - Menzil düşebilir`;
    } else if (avgPrecip > 2.5) {
        warning = `Yağışlı hava - Dikkatli sürüş`;
    }

    return {
        temperature: Math.round(avgTemp),
        headwindKmh: Math.round(headwind),
        rainIntensity: categorizeRain(avgPrecip),
        warning,
    };
}