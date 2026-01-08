type LngLat = [number, number];

export function consumptionAtSpeed(
    baseKwhPerKm: number,
    speedKmh: number
) {
    const vRef = 90;
    const k = 0.35;
    return baseKwhPerKm * (1 + k * Math.pow(speedKmh / vRef, 2));
}

const TERRAIN_ZOOM = 14; // 13-14 iyi denge. 14 daha detaylı.
const TILE_SIZE = 256;

// basit cache: aynı tile tekrar indirilmeyecek
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
    // Mapbox Terrain-RGB decoding:
    // height (m) = -10000 + (R*256*256 + G*256 + B) * 0.1
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
        // eslint-disable-next-line no-await-in-loop
        const elev = await getElevationMetersMapbox([lng, lat], token);
        const atKm = routeDistanceKmFn(coords.slice(0, i + 1));
        sampled.push({ lng, lat, idx: i, elev, atKm });
    }

    // son nokta garanti
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

export function energyBetweenKm(
    kmA: number,
    kmB: number,
    profile: { elev: number | null; atKm: number }[],
    consumptionKwhPerKm: number,
    speedProfile: { fromKm: number; toKm: number; speedKmh: number }[],
    massKg: number,
    drivetrainEff = 0.9,
    regenEff = 0.65
) {
    // 1. Düz yol enerjisi (hız ayarlı)
    let flatEnergy = 0;
    for (const s of speedProfile) {
        const overlapStart = Math.max(kmA, s.fromKm);
        const overlapEnd = Math.min(kmB, s.toKm);

        if (overlapEnd > overlapStart) {
            const dist = overlapEnd - overlapStart;
            const adjCons = consumptionAtSpeed(consumptionKwhPerKm, s.speedKmh);
            flatEnergy += dist * adjCons;
        }
    }

    // 2. Grade energy (yokuş/iniş)
    // Aralıktaki noktaları seç
    const pts = profile.filter(p => p.atKm >= kmA && p.atKm <= kmB && typeof p.elev === "number") as Array<
        { atKm: number; elev: number }
    >;

    let climbKwh = 0;
    let regenKwh = 0;

    if (pts.length >= 2) {
        const g = 9.80665;
        for (let i = 1; i < pts.length; i++) {
            const dh = pts[i].elev - pts[i - 1].elev;
            const eKwhIdeal = (massKg * g * dh) / 3_600_000;

            if (dh > 0) {
                climbKwh += eKwhIdeal / Math.max(0.01, drivetrainEff);
            } else if (dh < 0) {
                regenKwh += Math.abs(eKwhIdeal) * Math.max(0, Math.min(1, regenEff));
            }
        }
    }

    const netKwh = flatEnergy + climbKwh - regenKwh;

    console.log("[energy-debug]", {
        kmA,
        kmB,
        flatKwh: Number(flatEnergy.toFixed(2)),
        climbKwh: Number(climbKwh.toFixed(2)),
        regenKwh: Number(regenKwh.toFixed(2)),
        netKwh: Number(netKwh.toFixed(2)),
    });

    return { flatEnergy, climbKwh, regenKwh, netKwh, pointsUsed: pts.length };
}

export function elevationStats(profile: { elev: number | null }[]) {
    const vals = profile.map(p => p.elev).filter((v): v is number => typeof v === "number");
    if (vals.length === 0) return null;

    let min = Infinity;
    let max = -Infinity;
    for (const v of vals) {
        if (v < min) min = v;
        if (v > max) max = v;
    }

    // yaklaşık tırmanış (sadece ardışık pozitif farklar)
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
    // profile: örneklenmiş elev noktaları (elev null olabilir)
    const pts = profile.filter(p => typeof p.elev === "number") as Array<
        { lng: number; lat: number; idx: number; elev: number }
    >;

    if (pts.length < 2 || totalRouteKm <= 0) {
        return { climbKwh: 0, regenKwh: 0, netKwh: 0, pointsUsed: pts.length };
    }

    // basit yaklaşım: örnekler arası mesafeyi route boyunca eşit kabul ediyoruz
    // (daha ileri adımda idx üzerinden gerçek km'yi bağlayacağız)
    const kmPerStep = totalRouteKm / (pts.length - 1);

    const g = 9.80665; // m/s2
    let climbKwh = 0;
    let regenKwh = 0;

    for (let i = 1; i < pts.length; i++) {
        const dh = pts[i].elev - pts[i - 1].elev; // meters
        if (!Number.isFinite(dh)) continue;

        // Potansiyel enerji: m*g*dh (Joule). kWh = J / 3.6e6
        const eKwhIdeal = (massKg * g * dh) / 3_600_000;

        if (dh > 0) {
            // yokuş: bataryadan daha fazla enerji çekilir (verim)
            climbKwh += eKwhIdeal / Math.max(0.01, drivetrainEff);
        } else if (dh < 0) {
            // iniş: geri kazanım (regen) var ama verimsiz ve sınırlı
            regenKwh += Math.abs(eKwhIdeal) * Math.max(0, Math.min(1, regenEff));
        }
    }

    const netKwh = climbKwh - regenKwh;
    return { climbKwh, regenKwh, netKwh, kmPerStep, pointsUsed: pts.length };
}
