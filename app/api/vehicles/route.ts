import { NextResponse } from "next/server";
import {
    fetchVehiclesByMake,
    fetchVehicle,
    toVehicleFormat,
    SUPPORTED_MAKES,
    ProcessedEVData
} from "@/lib/ev-api";

/**
 * GET /api/vehicles
 * 
 * Query parametreleri:
 * - make: Marka (örn: Tesla)
 * - model: Model (örn: Model 3)
 * - sync: true ise tüm markaları senkronize et
 * 
 * Örnekler:
 * /api/vehicles?make=Tesla
 * /api/vehicles?make=Hyundai&model=IONIQ%206
 * /api/vehicles?sync=true (dikkat: çok API çağrısı yapar!)
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const make = searchParams.get("make");
    const model = searchParams.get("model");
    const sync = searchParams.get("sync");

    try {
        // Tek araç getir
        if (make && model) {
            const vehicle = await fetchVehicle(make, model);
            if (!vehicle) {
                return NextResponse.json(
                    { error: "Araç bulunamadı" },
                    { status: 404 }
                );
            }
            return NextResponse.json({
                raw: vehicle,
                formatted: toVehicleFormat(vehicle),
            });
        }

        // Marka bazlı getir
        if (make) {
            const vehicles = await fetchVehiclesByMake(make);
            return NextResponse.json({
                count: vehicles.length,
                vehicles: vehicles.map(v => ({
                    raw: v,
                    formatted: toVehicleFormat(v),
                })),
            });
        }

        // Tüm markaları senkronize et (dikkatli kullan!)
        if (sync === "true") {
            const allVehicles: ProcessedEVData[] = [];
            const errors: string[] = [];

            for (const brand of SUPPORTED_MAKES.slice(0, 5)) { // İlk 5 marka (API limit için)
                try {
                    const vehicles = await fetchVehiclesByMake(brand);
                    allVehicles.push(...vehicles);
                    // Rate limiting için bekle
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (e) {
                    errors.push(`${brand}: ${e}`);
                }
            }

            return NextResponse.json({
                totalCount: allVehicles.length,
                brandsProcessed: SUPPORTED_MAKES.slice(0, 5),
                vehicles: allVehicles.map(v => toVehicleFormat(v)),
                errors,
                note: "Sadece ilk 5 marka işlendi (API limit). Tüm markalar için ayrı ayrı çağırın.",
            });
        }

        // Parametre yoksa desteklenen markaları döndür
        return NextResponse.json({
            supportedMakes: SUPPORTED_MAKES,
            usage: {
                "single_vehicle": "/api/vehicles?make=Tesla&model=Model%203",
                "by_brand": "/api/vehicles?make=Hyundai",
                "sync_all": "/api/vehicles?sync=true (dikkat: çok API çağrısı!)",
            },
        });

    } catch (error) {
        console.error("[API] Hata:", error);
        return NextResponse.json(
            { error: "Bir hata oluştu", details: String(error) },
            { status: 500 }
        );
    }
}
