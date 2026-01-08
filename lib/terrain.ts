/**
 * TERRAIN.TS - FİZİK TABANLI ENERJİ HESAPLAMA MODELİ
 * 
 * Bu modül elektrikli araçlar için gerçek fizik denklemlerini kullanarak
 * enerji tüketimini hesaplar.
 * 
 * Fizik Temelleri:
 * - Yuvarlanma Direnci: F_roll = Crr × m × g × cos(θ)
 * - Hava Direnci: F_aero = 0.5 × ρ × Cd × A × (v + v_wind)²
 * - Eğim Kuvveti: F_grade = m × g × sin(θ)
 * - Toplam Güç: P = F_total × v
 * - Enerji: E = ∫P dt / η_drivetrain
 */

// ===== SABİTLER =====
const GRAVITY = 9.80665;           // m/s² - yerçekimi ivmesi
const AIR_DENSITY_15C = 1.225;     // kg/m³ - 15°C deniz seviyesi
const KMH_TO_MS = 1 / 3.6;         // km/h → m/s dönüşümü

// ===== TİPLER =====
type LngLat = [number, number];

export interface VehiclePhysics {
    massKg: number;
    dragCoefficient: number;      // Cd
    frontalArea: number;          // m²
    rollingResistance: number;    // Crr
    drivetrainEfficiency: number; // 0-1
    regenEfficiency: number;      // 0-1
    hvacPowerKw: number;
    batteryHeatingKw: number;
    optimalBatteryTempC: number;
    tempEfficiencyLoss: number;   // % per 10°C below optimal
    batteryCapacity: number;      // kWh
}

export interface WeatherConditions {
    temperatureC: number;         // Hava sıcaklığı
    headwindKmh: number;          // Karşı rüzgar (pozitif = karşı, negatif = arkadan)
    rainIntensity: number;        // 0 = kuru, 1 = hafif, 2 = orta, 3 = şiddetli
    altitude: number;             // metre (hava yoğunluğu için)
}

export interface EnergyResult {
    totalKwh: number;
    rollingKwh: number;
    aeroKwh: number;
    gradeKwh: number;
    regenKwh: number;
    hvacKwh: number;
    tempLossKwh: number;
    netKwh: number;
    efficiency: number;           // kWh/km
    breakdown: {
        rolling: number;            // % of total
        aero: number;
        grade: number;
        hvac: number;
    };
}

// ===== HAVA YOĞUNLUĞU =====
/**
 * Yükseklik ve sıcaklığa göre hava yoğunluğunu hesaplar
 * Barometrik formül kullanır
 */
export function airDensity(altitudeM: number, tempC: number): number {
    // Basitleştirilmiş ISA modeli
    const T0 = 288.15;  // K (15°C deniz seviyesi)
    const p0 = 101325;  // Pa
    const L = 0.0065;   // K/m (troposfer lapse rate)
    const R = 287.05;   // J/(kg·K) ideal gaz sabiti

    const T = 273.15 + tempC;
    const p = p0 * Math.pow(1 - (L * altitudeM) / T0, GRAVITY / (R * L));

    return p / (R * T);
}

// ===== YUVARLANMA DİRENCİ =====
/**
 * Yuvarlanma direnci kuvvetini hesaplar
 * F = Crr × m × g × cos(θ)
 * 
 * Yağmurda Crr artar (ıslak yol = %10-20 artış)
 */
export function rollingResistanceForce(
    massKg: number,
    Crr: number,
    gradePercent: number,
    rainIntensity: number = 0
): number {
    // Yağmur etkisi
    const wetMultiplier = 1 + (rainIntensity * 0.05); // %5 per intensity level
    const effectiveCrr = Crr * wetMultiplier;

    // Eğim açısı (radyan)
    const theta = Math.atan(gradePercent / 100);

    return effectiveCrr * massKg * GRAVITY * Math.cos(theta);
}

// ===== HAVA DİRENCİ =====
/**
 * Aerodinamik sürükleme kuvvetini hesaplar
 * F = 0.5 × ρ × Cd × A × v_effective²
 * 
 * v_effective = araç hızı + karşı rüzgar
 */
export function aerodynamicDragForce(
    Cd: number,
    frontalAreaM2: number,
    speedKmh: number,
    headwindKmh: number,
    rho: number = AIR_DENSITY_15C
): number {
    const vVehicle = speedKmh * KMH_TO_MS;
    const vWind = headwindKmh * KMH_TO_MS;
    const vEffective = vVehicle + vWind; // Karşı rüzgar pozitif

    // Negatif olamaz (arkadan rüzgar çok güçlüyse bile minimum 0)
    const vEffectiveClamped = Math.max(0, vEffective);

    return 0.5 * rho * Cd * frontalAreaM2 * vEffectiveClamped * vEffectiveClamped;
}

// ===== EĞİM KUVVETİ =====
/**
 * Eğim kuvvetini hesaplar
 * F = m × g × sin(θ)
 * 
 * Pozitif = yokuş yukarı (enerji harcar)
 * Negatif = yokuş aşağı (regen potansiyeli)
 */
export function gradeForce(massKg: number, gradePercent: number): number {
    const theta = Math.atan(gradePercent / 100);
    return massKg * GRAVITY * Math.sin(theta);
}

// ===== SICAKLIK ETKİSİ =====
/**
 * Batarya kapasitesi sıcaklığa bağlı olarak düşer
 * Soğukta:
 *   - İç direnç artar → verimlilik düşer
 *   - Kullanılabilir kapasite azalır
 *   - Şarj hızı düşer (ayrı fonksiyon)
 */
export function temperatureEfficiencyFactor(
    ambientTempC: number,
    optimalTempC: number,
    lossPercentPer10C: number
): number {
    if (ambientTempC >= optimalTempC) {
        // Sıcakta minimal etki (45°C üzeri hariç - bu versiyonda ihmal)
        return 1.0;
    }

    const deltaT = optimalTempC - ambientTempC;
    const lossFactor = (deltaT / 10) * (lossPercentPer10C / 100);

    // Minimum %50 verimlilik (aşırı soğukta bile)
    return Math.max(0.5, 1 - lossFactor);
}

/**
 * HVAC güç tüketimini hesaplar
 * Sıcaklık farkına göre ölçeklenir
 */
export function hvacPowerDraw(
    ambientTempC: number,
    baseHvacKw: number,
    targetCabinTempC: number = 22
): number {
    const deltaT = Math.abs(ambientTempC - targetCabinTempC);

    // 0°C fark = minimum güç, 30°C fark = tam güç
    const scaleFactor = Math.min(1, deltaT / 30);

    // Isıtma soğutmadan daha çok enerji harcar (COP farkı)
    const heatingMultiplier = ambientTempC < targetCabinTempC ? 1.3 : 1.0;

    return baseHvacKw * scaleFactor * heatingMultiplier;
}

/**
 * Batarya ısıtma güç tüketimi (soğuk havada preconditioning)
 */
export function batteryHeatingPower(
    ambientTempC: number,
    optimalTempC: number,
    maxHeatingKw: number
): number {
    if (ambientTempC >= optimalTempC - 5) {
        return 0; // Optimal sıcaklığa yakın, ısıtma gereksiz
    }

    const deltaT = (optimalTempC - 5) - ambientTempC;
    const scaleFactor = Math.min(1, deltaT / 25); // -20°C'de tam güç

    return maxHeatingKw * scaleFactor;
}

// ===== ANA ENERJİ HESAPLAMA =====
/**
 * Belirli bir segment için toplam enerji tüketimini hesaplar
 * 
 * @param distanceKm - Segment mesafesi (km)
 * @param speedKmh - Ortalama hız (km/h)
 * @param gradePercent - Eğim yüzdesi (pozitif = yokuş)
 * @param vehicle - Araç fizik parametreleri
 * @param weather - Hava koşulları
 * @param durationHours - Segment süresi (saat) - HVAC için
 */
export function segmentEnergy(
    distanceKm: number,
    speedKmh: number,
    gradePercent: number,
    vehicle: VehiclePhysics,
    weather: WeatherConditions,
    durationHours?: number
): EnergyResult {
    // Süre hesapla (verilmediyse)
    const hours = durationHours ?? (distanceKm / Math.max(1, speedKmh));

    // Hava yoğunluğu
    const rho = airDensity(weather.altitude, weather.temperatureC);

    // Sıcaklık verimlilik faktörü
    const tempFactor = temperatureEfficiencyFactor(
        weather.temperatureC,
        vehicle.optimalBatteryTempC,
        vehicle.tempEfficiencyLoss
    );

    // Kuvvetler (Newton)
    const F_roll = rollingResistanceForce(
        vehicle.massKg,
        vehicle.rollingResistance,
        gradePercent,
        weather.rainIntensity
    );

    const F_aero = aerodynamicDragForce(
        vehicle.dragCoefficient,
        vehicle.frontalArea,
        speedKmh,
        weather.headwindKmh,
        rho
    );

    const F_grade = gradeForce(vehicle.massKg, gradePercent);

    // Toplam kuvvet
    const F_total = F_roll + F_aero + F_grade;

    // Mekanik enerji (kWh)
    // E = F × d (Joule) → kWh = J / 3,600,000
    const distanceM = distanceKm * 1000;

    const rollingEnergyKwh = (F_roll * distanceM) / 3_600_000;
    const aeroEnergyKwh = (F_aero * distanceM) / 3_600_000;
    const gradeEnergyKwh = (F_grade * distanceM) / 3_600_000;

    // Rejenerasyon (sadece negatif eğimde)
    let regenKwh = 0;
    let gradeKwhNet = gradeEnergyKwh;

    if (gradeEnergyKwh < 0) {
        // İniş: potansiyel enerji geri kazanılabilir
        const regenPotential = Math.abs(gradeEnergyKwh);
        regenKwh = regenPotential * vehicle.regenEfficiency;
        gradeKwhNet = 0; // Negatif grade enerjisi regen'e dönüştü
    }

    // Drivetrain kayıpları
    const mechanicalKwh = rollingEnergyKwh + aeroEnergyKwh + Math.max(0, gradeKwhNet);
    const drivetrainKwh = mechanicalKwh / vehicle.drivetrainEfficiency;

    // HVAC tüketimi
    const hvacKw = hvacPowerDraw(weather.temperatureC, vehicle.hvacPowerKw);
    const batteryHeatKw = batteryHeatingPower(
        weather.temperatureC,
        vehicle.optimalBatteryTempC,
        vehicle.batteryHeatingKw
    );
    const hvacKwh = (hvacKw + batteryHeatKw) * hours;

    // Sıcaklık kaynaklı verimlilik kaybı
    const tempLossKwh = drivetrainKwh * (1 - tempFactor);

    // Toplam tüketim
    const totalKwh = drivetrainKwh + hvacKwh + tempLossKwh;

    // Net tüketim (regen çıkarılmış)
    const netKwh = Math.max(0, totalKwh - regenKwh);

    // Verimlilik (kWh/km)
    const efficiency = distanceKm > 0 ? netKwh / distanceKm : 0;

    // Breakdown yüzdeleri
    const totalForBreakdown = rollingEnergyKwh + aeroEnergyKwh + Math.max(0, gradeKwhNet) + hvacKwh;

    return {
        totalKwh,
        rollingKwh: rollingEnergyKwh,
        aeroKwh: aeroEnergyKwh,
        gradeKwh: gradeKwhNet,
        regenKwh,
        hvacKwh,
        tempLossKwh,
        netKwh,
        efficiency,
        breakdown: {
            rolling: totalForBreakdown > 0 ? (rollingEnergyKwh / totalForBreakdown) * 100 : 0,
            aero: totalForBreakdown > 0 ? (aeroEnergyKwh / totalForBreakdown) * 100 : 0,
            grade: totalForBreakdown > 0 ? (Math.max(0, gradeKwhNet) / totalForBreakdown) * 100 : 0,
            hvac: totalForBreakdown > 0 ? (hvacKwh / totalForBreakdown) * 100 : 0,
        },
    };
}

// ===== ROTA ENERJİ HESAPLAMA =====
/**
 * Tüm rota boyunca segment bazlı enerji hesaplar
 */
export function routeEnergy(
    segments: Array<{
        distanceKm: number;
        speedKmh: number;
        gradePercent: number;
        durationHours?: number;
    }>,
    vehicle: VehiclePhysics,
    weather: WeatherConditions
): EnergyResult {
    let totalRolling = 0;
    let totalAero = 0;
    let totalGrade = 0;
    let totalRegen = 0;
    let totalHvac = 0;
    let totalTempLoss = 0;
    let totalNet = 0;
    let totalDistance = 0;
    let totalHours = 0;

    for (const seg of segments) {
        const result = segmentEnergy(
            seg.distanceKm,
            seg.speedKmh,
            seg.gradePercent,
            vehicle,
            weather,
            seg.durationHours
        );

        totalRolling += result.rollingKwh;
        totalAero += result.aeroKwh;
        totalGrade += result.gradeKwh;
        totalRegen += result.regenKwh;
        totalHvac += result.hvacKwh;
        totalTempLoss += result.tempLossKwh;
        totalNet += result.netKwh;
        totalDistance += seg.distanceKm;
        totalHours += seg.durationHours ?? (seg.distanceKm / Math.max(1, seg.speedKmh));
    }

    const totalKwh = totalRolling + totalAero + totalGrade + totalHvac + totalTempLoss;
    const totalForBreakdown = totalRolling + totalAero + Math.max(0, totalGrade) + totalHvac;

    return {
        totalKwh,
        rollingKwh: totalRolling,
        aeroKwh: totalAero,
        gradeKwh: totalGrade,
        regenKwh: totalRegen,
        hvacKwh: totalHvac,
        tempLossKwh: totalTempLoss,
        netKwh: totalNet,
        efficiency: totalDistance > 0 ? totalNet / totalDistance : 0,
        breakdown: {
            rolling: totalForBreakdown > 0 ? (totalRolling / totalForBreakdown) * 100 : 0,
            aero: totalForBreakdown > 0 ? (totalAero / totalForBreakdown) * 100 : 0,
            grade: totalForBreakdown > 0 ? (Math.max(0, totalGrade) / totalForBreakdown) * 100 : 0,
            hvac: totalForBreakdown > 0 ? (totalHvac / totalForBreakdown) * 100 : 0,
        },
    };
}

// ===== ELEVATION (eski fonksiyonlar - geriye uyumluluk) =====

const TERRAIN_ZOOM = 14;
const TILE_SIZE = 256;
const tileCache = new Map<string, ImageData>();

function lngLatToTile(lng: number, lat: number, z: number) {
    const latRad = (lat * Math.PI) / 180;
    const n = 2 ** z;
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor(
        (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n
    );
    return { x, y, z };
}

function lngLatToPixelInTile(lng: number, lat: number, z: number) {
    const latRad = (lat * Math.PI) / 180;
    const n = 2 ** z;
    const xFloat = ((lng + 180) / 360) * n;
    const yFloat =
        (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
    const x = Math.floor((xFloat - Math.floor(xFloat)) * TILE_SIZE);
    const y = Math.floor((yFloat - Math.floor(yFloat)) * TILE_SIZE);
    return { x, y };
}

function decodeTerrainRgb(r: number, g: number, b: number) {
    return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1;
}

async function fetchTileImageData(tileKey: string, url: string): Promise<ImageData> {
    const cached = tileCache.get(tileKey);
    if (cached) return cached;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Terrain tile fetch failed: ${res.status}`);

    const blob = await res.blob();
    const img = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE);

    tileCache.set(tileKey, imageData);
    return imageData;
}

export async function getElevationMetersMapbox(lngLat: LngLat, token: string): Promise<number | null> {
    if (!token) return null;

    const [lng, lat] = lngLat;
    const { x: tx, y: ty, z } = lngLatToTile(lng, lat, TERRAIN_ZOOM);
    const { x: px, y: py } = lngLatToPixelInTile(lng, lat, TERRAIN_ZOOM);

    const tileKey = `${z}/${tx}/${ty}`;
    const url = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${z}/${tx}/${ty}.pngraw?access_token=${token}`;

    try {
        const imgData = await fetchTileImageData(tileKey, url);
        const idx = (py * TILE_SIZE + px) * 4;
        const r = imgData.data[idx];
        const g = imgData.data[idx + 1];
        const b = imgData.data[idx + 2];

        const elev = decodeTerrainRgb(r, g, b);
        if (!Number.isFinite(elev)) return null;
        return elev;
    } catch (e) {
        console.error(`Elevation fetch error for tile ${tileKey}:`, e);
        return null;
    }
}

export async function getElevationProfile(
    coords: [number, number][],
    token: string,
    sampleEveryN: number,
    routeDistanceKmFn: (c: [number, number][]) => number
) {
    const sampled: { lng: number; lat: number; idx: number; elev: number | null; atKm: number }[] = [];

    for (let i = 0; i < coords.length; i += sampleEveryN) {
        const [lng, lat] = coords[i];
        const elev = await getElevationMetersMapbox([lng, lat], token);
        const atKm = routeDistanceKmFn(coords.slice(0, i + 1));
        sampled.push({ lng, lat, idx: i, elev, atKm });
    }

    if (coords.length > 0) {
        const lastIdx = coords.length - 1;
        const [lng, lat] = coords[lastIdx];
        const exists = sampled.some(s => s.idx === lastIdx);
        if (!exists) {
            const elev = await getElevationMetersMapbox([lng, lat], token);
            const atKm = routeDistanceKmFn(coords);
            sampled.push({ lng, lat, idx: lastIdx, elev, atKm });
        }
    }

    return sampled;
}

// ===== ENTEGRE ENERJİ HESAPLAMA (Eski API uyumlu) =====
/**
 * energyBetweenKm - Eski API ile uyumlu, yeni fizik motorunu kullanan fonksiyon
 * 
 * Bu fonksiyon mevcut kodla uyumluluk için korunuyor.
 * Yeni projeler için routeEnergy() kullanılması önerilir.
 */
export function energyBetweenKm(
    kmA: number,
    kmB: number,
    profile: { elev: number | null; atKm: number }[],
    baseConsumptionKwhPerKm: number,
    speedProfile: { fromKm: number; toKm: number; speedKmh: number }[],
    massKg: number,
    drivetrainEff = 0.9,
    regenEff = 0.65,
    // Yeni opsiyonel parametreler
    vehicle?: Partial<VehiclePhysics>,
    weather?: Partial<WeatherConditions>
): { flatEnergy: number; climbKwh: number; regenKwh: number; netKwh: number; pointsUsed: number } {

    // Varsayılan araç parametreleri (eski API için geriye uyumluluk)
    const defaultVehicle: VehiclePhysics = {
        massKg,
        dragCoefficient: 0.28,        // Ortalama EV
        frontalArea: 2.4,             // Ortalama
        rollingResistance: 0.010,     // Standart lastik
        drivetrainEfficiency: drivetrainEff,
        regenEfficiency: regenEff,
        hvacPowerKw: 2.5,
        batteryHeatingKw: 4.0,
        optimalBatteryTempC: 25,
        tempEfficiencyLoss: 8,
        batteryCapacity: 75,
    };

    const vehicleParams: VehiclePhysics = { ...defaultVehicle, ...vehicle };

    // Varsayılan hava koşulları (ideal koşullar)
    const defaultWeather: WeatherConditions = {
        temperatureC: 20,
        headwindKmh: 0,
        rainIntensity: 0,
        altitude: 500,
    };

    const weatherParams: WeatherConditions = { ...defaultWeather, ...weather };

    // Aralıktaki elevation noktalarını al
    const pts = profile.filter(
        p => p.atKm >= kmA && p.atKm <= kmB && typeof p.elev === "number"
    ) as Array<{ atKm: number; elev: number }>;

    // Segmentleri oluştur
    const segments: Array<{
        distanceKm: number;
        speedKmh: number;
        gradePercent: number;
        durationHours?: number;
    }> = [];

    // Speed profile üzerinden segmentleri oluştur
    for (const sp of speedProfile) {
        const overlapStart = Math.max(kmA, sp.fromKm);
        const overlapEnd = Math.min(kmB, sp.toKm);

        if (overlapEnd > overlapStart) {
            const segmentDistanceKm = overlapEnd - overlapStart;

            // Bu segment için ortalama eğimi hesapla
            let gradePercent = 0;

            // İlgili elevation noktalarını bul
            const segPts = pts.filter(p => p.atKm >= overlapStart && p.atKm <= overlapEnd);

            if (segPts.length >= 2) {
                const elevStart = segPts[0].elev;
                const elevEnd = segPts[segPts.length - 1].elev;
                const deltaElev = elevEnd - elevStart;
                const deltaKm = segPts[segPts.length - 1].atKm - segPts[0].atKm;

                if (deltaKm > 0) {
                    gradePercent = (deltaElev / (deltaKm * 1000)) * 100;
                }
            }

            segments.push({
                distanceKm: segmentDistanceKm,
                speedKmh: sp.speedKmh,
                gradePercent,
                durationHours: segmentDistanceKm / Math.max(1, sp.speedKmh),
            });
        }
    }

    // Eğer segment yoksa, basit hesaplama yap
    if (segments.length === 0) {
        const totalDistanceKm = kmB - kmA;
        const avgSpeed = 90; // Varsayılan

        let gradePercent = 0;
        if (pts.length >= 2) {
            const deltaElev = pts[pts.length - 1].elev - pts[0].elev;
            const deltaKm = pts[pts.length - 1].atKm - pts[0].atKm;
            if (deltaKm > 0) {
                gradePercent = (deltaElev / (deltaKm * 1000)) * 100;
            }
        }

        segments.push({
            distanceKm: totalDistanceKm,
            speedKmh: avgSpeed,
            gradePercent,
        });
    }

    // Yeni fizik motoruyla hesapla
    const result = routeEnergy(segments, vehicleParams, weatherParams);

    // Eski format için dönüştür
    return {
        flatEnergy: result.rollingKwh + result.aeroKwh,
        climbKwh: Math.max(0, result.gradeKwh),
        regenKwh: result.regenKwh,
        netKwh: result.netKwh,
        pointsUsed: pts.length,
    };
}

// ===== ESKİ FONKSİYONLAR (geriye uyumluluk) =====

export function elevationStats(profile: { elev: number | null }[]) {
    const vals = profile.map(p => p.elev).filter((v): v is number => typeof v === "number");
    if (vals.length === 0) return null;

    let min = Infinity;
    let max = -Infinity;
    for (const v of vals) {
        if (v < min) min = v;
        if (v > max) max = v;
    }

    let gain = 0;
    for (let i = 1; i < vals.length; i++) {
        const d = vals[i] - vals[i - 1];
        if (d > 0) gain += d;
    }

    return { min, max, gain };
}

export function gradeEnergyKwhFromProfile(
    profile: { lng: number; lat: number; idx: number; elev: number | null }[],
    totalRouteKm: number,
    massKg: number,
    drivetrainEff = 0.9,
    regenEff = 0.65
) {
    const pts = profile.filter(p => typeof p.elev === "number") as Array<
        { lng: number; lat: number; idx: number; elev: number }
    >;

    if (pts.length < 2 || totalRouteKm <= 0) {
        return { climbKwh: 0, regenKwh: 0, netKwh: 0, pointsUsed: pts.length };
    }

    const kmPerStep = totalRouteKm / (pts.length - 1);
    const g = 9.80665;
    let climbKwh = 0;
    let regenKwh = 0;

    for (let i = 1; i < pts.length; i++) {
        const dh = pts[i].elev - pts[i - 1].elev;
        if (!Number.isFinite(dh)) continue;

        const eKwhIdeal = (massKg * g * dh) / 3_600_000;

        if (dh > 0) {
            climbKwh += eKwhIdeal / Math.max(0.01, drivetrainEff);
        } else if (dh < 0) {
            regenKwh += Math.abs(eKwhIdeal) * Math.max(0, Math.min(1, regenEff));
        }
    }

    const netKwh = climbKwh - regenKwh;
    return { climbKwh, regenKwh, netKwh, kmPerStep, pointsUsed: pts.length };
}

// ===== ESKI consumptionAtSpeed (geriye uyumluluk - DEPRECATED) =====
/**
 * @deprecated Yeni projeler için segmentEnergy() kullanın
 */
export function consumptionAtSpeed(baseKwhPerKm: number, speedKmh: number): number {
    // Basit quadratic model - geriye uyumluluk için
    const vRef = 90;
    const k = 0.35;
    return baseKwhPerKm * (1 + k * Math.pow(speedKmh / vRef, 2));
}

// ===== YARDIMCI FONKSİYONLAR =====

/**
 * Araç menzilini belirli koşullar için tahmin eder
 */
export function estimateRange(
    vehicle: VehiclePhysics,
    weather: WeatherConditions,
    avgSpeedKmh: number = 100,
    currentSocPercent: number = 100
): number {
    // 1 km'lik örnek segment
    const sampleResult = segmentEnergy(1, avgSpeedKmh, 0, vehicle, weather);

    const kwhPerKm = sampleResult.netKwh;
    const availableKwh = (currentSocPercent / 100) * vehicle.batteryCapacity;

    // Güvenlik marjı (%10)
    const usableKwh = availableKwh * 0.9;

    return kwhPerKm > 0 ? usableKwh / kwhPerKm : 0;
}

/**
 * WLTP menzilinden gerçek dünya menzilini tahmin eder
 */
export function wltpToRealWorld(
    wltpRangeKm: number,
    vehicle: VehiclePhysics,
    weather: WeatherConditions,
    avgSpeedKmh: number = 100
): number {
    // WLTP koşulları (ideal)
    const wltpWeather: WeatherConditions = {
        temperatureC: 23,
        headwindKmh: 0,
        rainIntensity: 0,
        altitude: 0,
    };

    // WLTP'de tüketim
    const wltpResult = segmentEnergy(1, 46.5, 0, vehicle, wltpWeather); // WLTP avg speed ~46.5 km/h

    // Gerçek koşullarda tüketim
    const realResult = segmentEnergy(1, avgSpeedKmh, 0, vehicle, weather);

    // Oran
    const ratio = wltpResult.netKwh > 0 ? realResult.netKwh / wltpResult.netKwh : 1.5;

    return wltpRangeKm / ratio;
}