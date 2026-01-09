/**
 * API Ninjas Electric Vehicle API Entegrasyonu
 * https://api-ninjas.com/api/electricvehicle
 * 
 * Free plan: 3000 istek/ay
 * Dönen kritik veriler:
 * - battery_useable_capacity (kWh)
 * - charge_power_max (DC max güç)
 * - charge_power_10p_80p (10-80% ortalama güç)
 * - rated_consumption (Wh/km)
 * - battery_architecture (400V / 800V)
 * - battery_cathode_material (NCM, LFP, NCA)
 */

const API_KEY = process.env.NEXT_PUBLIC_EV_API_KEY || "";
const API_BASE = "https://api.api-ninjas.com/v1";

// API'den dönen ham veri tipi
export interface EVApiResponse {
    make: string;
    model: string;
    year_start: string;
    battery_capacity: string;
    battery_type: string;
    battery_number_of_cells: string;
    battery_architecture: string;
    battery_useable_capacity: string;
    battery_cathode_material: string;
    battery_pack_configuration: string;
    battery_voltage: string;
    battery_form_factor: string;
    battery_name: string;
    charge_port: string;
    charge_port_location: string;
    charge_power: string;
    charge_speed: string;
    charge_power_max: string;
    charge_power_10p_80p: string;
    autocharge_supported: string;
    plug_charge_supported: string;
    supported_charging_protocol: string;
    preconditioning_possible: string;
    acceleration_0_100_kmh: string;
    top_speed: string;
    electric_range: string;
    total_power: string;
    total_torque: string;
    drive: string;
    vehicle_consumption: string;
    co2_emissions: string;
    vehicle_fuel_equivalent: string;
    rated_consumption: string;
    rated_fuel_equivalent: string;
    length: string;
    width: string;
    width_with_mirrors: string;
    height: string;
    wheelbase: string;
    gross_vehicle_weight: string;
    max_payload: string;
    cargo_volume: string;
    cargo_volume_frunk: string;
    seats: string;
    turning_circle: string;
    platform: string;
    car_body: string;
    segment: string;
}

// İşlenmiş araç verisi
export interface ProcessedEVData {
    id: string;
    brand: string;
    model: string;
    year: string;

    // Batarya
    batteryCapacity: number;      // kWh (usable)
    batteryArchitecture: number;  // 400 veya 800 (V)
    batteryCathode: string;       // NCM, LFP, NCA

    // Şarj
    maxDCPower: number;           // kW
    avgPower10to80: number;       // kW (10-80% ortalama)
    maxACPower: number;           // kW
    connectors: string[];

    // Tüketim
    ratedConsumption: number;     // Wh/km

    // Boyutlar
    massKg: number;
    lengthMm: number;
    widthMm: number;
    heightMm: number;

    // Hesaplanan şarj eğrisi
    chargingCurve: { soc: number; powerKw: number }[];
}

/**
 * Sayısal değer çıkar (örn: "85 kW DC" -> 85)
 */
function extractNumber(str: string): number | null {
    if (!str || str === "No Data" || str.includes("premium")) return null;
    const match = str.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
}

/**
 * Şarj eğrisi oluştur
 * charge_power_max ve charge_power_10p_80p'den tahmin eder
 * 
 * Mantık:
 * - %0-10: max güç
 * - %10-80: avg güç etrafında azalan eğri
 * - %80-100: hızlı düşüş
 * 
 * 800V araçlar daha düz eğriye sahip
 * LFP bataryalar daha düz eğriye sahip
 */
function generateChargingCurve(
    maxPower: number,
    avgPower10to80: number,
    architecture: number,
    cathode: string
): { soc: number; powerKw: number }[] {
    const curve: { soc: number; powerKw: number }[] = [];

    // 800V veya LFP = daha düz eğri
    const is800V = architecture >= 800;
    const isLFP = cathode.toUpperCase().includes("LFP");
    const flatnessFactor = (is800V ? 0.15 : 0) + (isLFP ? 0.1 : 0);

    // Eğri noktaları hesapla
    // %0-10: Peak güç
    curve.push({ soc: 0, powerKw: maxPower });
    curve.push({ soc: 10, powerKw: maxPower });

    // %10-50: Yavaş düşüş (avgPower'a doğru)
    // avg = (peak + midpoint) / 2 yaklaşık, midpoint = 2*avg - peak
    const midpointPower = Math.min(maxPower, Math.max(avgPower10to80, 2 * avgPower10to80 - maxPower * 0.3));

    // Düzlük faktörüne göre ayarla
    const power20 = maxPower - (maxPower - midpointPower) * 0.2 * (1 - flatnessFactor);
    const power30 = maxPower - (maxPower - midpointPower) * 0.4 * (1 - flatnessFactor);
    const power40 = maxPower - (maxPower - midpointPower) * 0.6 * (1 - flatnessFactor);
    const power50 = maxPower - (maxPower - midpointPower) * 0.8 * (1 - flatnessFactor);

    curve.push({ soc: 20, powerKw: Math.round(power20) });
    curve.push({ soc: 30, powerKw: Math.round(power30) });
    curve.push({ soc: 40, powerKw: Math.round(power40) });
    curve.push({ soc: 50, powerKw: Math.round(power50) });

    // %50-80: Daha hızlı düşüş
    const power60 = avgPower10to80 * (0.85 + flatnessFactor * 0.1);
    const power70 = avgPower10to80 * (0.65 + flatnessFactor * 0.15);
    const power80 = avgPower10to80 * (0.45 + flatnessFactor * 0.15);

    curve.push({ soc: 60, powerKw: Math.round(power60) });
    curve.push({ soc: 70, powerKw: Math.round(power70) });
    curve.push({ soc: 80, powerKw: Math.round(power80) });

    // %80-100: Hızlı düşüş
    const power90 = power80 * 0.5;
    const power100 = Math.max(5, power80 * 0.2);

    curve.push({ soc: 90, powerKw: Math.round(power90) });
    curve.push({ soc: 100, powerKw: Math.round(power100) });

    return curve;
}

/**
 * API yanıtını işlenmiş veriye dönüştür
 */
export function processEVData(raw: EVApiResponse): ProcessedEVData | null {
    // Kritik verileri çıkar
    const batteryCapacity = extractNumber(raw.battery_useable_capacity);
    const maxDCPower = extractNumber(raw.charge_power_max);
    const avgPower10to80 = extractNumber(raw.charge_power_10p_80p);
    const maxACPower = extractNumber(raw.charge_power);
    const ratedConsumption = extractNumber(raw.rated_consumption);
    const grossWeight = extractNumber(raw.gross_vehicle_weight);
    const maxPayload = extractNumber(raw.max_payload);
    const architecture = extractNumber(raw.battery_architecture) || 400;

    // Kritik veri yoksa null döndür
    if (!batteryCapacity || !maxDCPower) {
        console.warn(`[EV-API] Eksik veri: ${raw.make} ${raw.model}`);
        return null;
    }

    // Kütle hesapla (gross - payload = curb weight yaklaşık)
    const massKg = grossWeight && maxPayload
        ? grossWeight - maxPayload
        : grossWeight || 1800; // varsayılan

    // Şarj eğrisi oluştur
    const chargingCurve = generateChargingCurve(
        maxDCPower,
        avgPower10to80 || maxDCPower * 0.7, // yoksa tahmini
        architecture,
        raw.battery_cathode_material || "NCM"
    );

    // Connector tiplerini belirle
    const connectors: string[] = [];
    if (raw.charge_port?.includes("CCS")) connectors.push("CCS Type 2");
    if (raw.charge_port?.includes("CHAdeMO")) connectors.push("CHAdeMO");
    connectors.push("Type 2"); // AC için

    // ID oluştur
    const id = `${raw.make.toLowerCase()}-${raw.model.toLowerCase().replace(/\s+/g, "-")}`;

    return {
        id,
        brand: raw.make,
        model: raw.model,
        year: raw.year_start,
        batteryCapacity,
        batteryArchitecture: architecture,
        batteryCathode: raw.battery_cathode_material || "NCM",
        maxDCPower,
        avgPower10to80: avgPower10to80 || maxDCPower * 0.7,
        maxACPower: maxACPower || 11,
        connectors,
        ratedConsumption: ratedConsumption || 150,
        massKg,
        lengthMm: extractNumber(raw.length) || 4500,
        widthMm: extractNumber(raw.width) || 1800,
        heightMm: extractNumber(raw.height) || 1500,
        chargingCurve,
    };
}

/**
 * Belirli bir marka için tüm araçları getir
 */
export async function fetchVehiclesByMake(make: string): Promise<ProcessedEVData[]> {
    if (!API_KEY) {
        console.error("[EV-API] API key tanımlı değil!");
        return [];
    }

    try {
        const response = await fetch(
            `${API_BASE}/electricvehicle?make=${encodeURIComponent(make)}`,
            {
                headers: { "X-Api-Key": API_KEY },
                next: { revalidate: 86400 }, // 24 saat cache
            }
        );

        if (!response.ok) {
            console.error(`[EV-API] Hata: ${response.status}`);
            return [];
        }

        const data: EVApiResponse[] = await response.json();
        const processed = data
            .map(processEVData)
            .filter((v): v is ProcessedEVData => v !== null);

        console.log(`[EV-API] ${make}: ${processed.length}/${data.length} araç işlendi`);
        return processed;
    } catch (error) {
        console.error(`[EV-API] Fetch hatası:`, error);
        return [];
    }
}

/**
 * Belirli bir araç için veri getir
 */
export async function fetchVehicle(make: string, model: string): Promise<ProcessedEVData | null> {
    if (!API_KEY) {
        console.error("[EV-API] API key tanımlı değil!");
        return null;
    }

    try {
        const response = await fetch(
            `${API_BASE}/electricvehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`,
            {
                headers: { "X-Api-Key": API_KEY },
                next: { revalidate: 86400 },
            }
        );

        if (!response.ok) {
            console.error(`[EV-API] Hata: ${response.status}`);
            return null;
        }

        const data: EVApiResponse[] = await response.json();
        if (data.length === 0) return null;

        return processEVData(data[0]);
    } catch (error) {
        console.error(`[EV-API] Fetch hatası:`, error);
        return null;
    }
}

/**
 * Tüm mevcut markaları getir (premium endpoint)
 * Free plan'de çalışmaz, manuel liste kullan
 */
export const SUPPORTED_MAKES = [
    "Audi",
    "BMW",
    "BYD",
    "Citroen",
    "Fiat",
    "Ford",
    "Honda",
    "Hyundai",
    "Jaguar",
    "Kia",
    "Lexus",
    "Mazda",
    "Mercedes-Benz",
    "MG",
    "Mini",
    "Nissan",
    "Opel",
    "Peugeot",
    "Polestar",
    "Porsche",
    "Renault",
    "Skoda",
    "Smart",
    "Subaru",
    "Tesla",
    "Toyota",
    "Volkswagen",
    "Volvo",
];

/**
 * ProcessedEVData'yı Vehicle formatına dönüştür
 */
export function toVehicleFormat(ev: ProcessedEVData) {
    // Fizik parametrelerini tahmin et (boyutlardan)
    const frontalArea = (ev.widthMm / 1000) * (ev.heightMm / 1000) * 0.85; // ~%85 doluluk
    const isSedan = ev.heightMm < 1500;
    const isSUV = ev.heightMm > 1600;

    // Cd tahmini (segment bazlı)
    let dragCoefficient = 0.28; // varsayılan
    if (isSedan) dragCoefficient = 0.24;
    if (isSUV) dragCoefficient = 0.30;
    if (ev.brand === "Tesla") dragCoefficient = 0.23;
    if (ev.model.includes("IONIQ 6")) dragCoefficient = 0.21;

    // Menzil tahmini (tüketimden)
    const estimatedRange = Math.round((ev.batteryCapacity * 1000) / ev.ratedConsumption);

    return {
        id: ev.id,
        brand: ev.brand,
        model: ev.model,
        year: ev.year,
        batteryCapacity: ev.batteryCapacity,
        maxDCPower: ev.maxDCPower,
        maxACPower: ev.maxACPower,
        connectors: ev.connectors,
        range: estimatedRange,

        // Fizik parametreleri
        massKg: ev.massKg,
        dragCoefficient,
        frontalArea: Math.round(frontalArea * 100) / 100,
        rollingResistance: 0.009,
        drivetrainEfficiency: ev.batteryArchitecture >= 800 ? 0.93 : 0.90,
        regenEfficiency: ev.batteryArchitecture >= 800 ? 0.72 : 0.68,

        // Termal
        hvacPowerKw: isSUV ? 3.0 : 2.5,
        batteryHeatingKw: ev.batteryArchitecture >= 800 ? 6.0 : 4.5,
        optimalBatteryTempC: ev.batteryCathode === "LFP" ? 30 : 25,
        tempEfficiencyLoss: ev.batteryCathode === "LFP" ? 8 : 7,

        // Şarj eğrisi
        chargingCurve: ev.chargingCurve,
    };
}
