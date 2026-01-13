import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RoutePlanRequest {
    vehicleId: string;
    from: [number, number]; // [lat, lon]
    to: [number, number];
    startSoc: number; // Starting battery % (0-100)
    minSoc: number; // Minimum battery % at destination
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export async function POST(request: NextRequest) {
    try {
        const body: RoutePlanRequest = await request.json();
        const { vehicleId, from, to, startSoc, minSoc } = body;

        // Get vehicle data
        const { data: vehicle, error: vError } = await supabase
            .from('ev_vehicles')
            .select('*')
            .eq('id', vehicleId)
            .single();

        if (vError || !vehicle) {
            return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }

        // Calculate total distance
        const totalDistance = calculateDistance(from[0], from[1], to[0], to[1]);

        // Calculate energy needed
        const consumptionKwhPerKm = vehicle.consumption_kwh_100km / 100;
        const totalEnergyNeeded = totalDistance * consumptionKwhPerKm;

        // Calculate available energy
        const usableBatteryKwh = vehicle.battery_kwh * 0.9; // 90% usable
        const startEnergyKwh = (startSoc / 100) * usableBatteryKwh;
        const minEnergyKwh = (minSoc / 100) * usableBatteryKwh;
        const availableEnergyKwh = startEnergyKwh - minEnergyKwh;

        // Check if charging is needed
        const needsCharging = totalEnergyNeeded > availableEnergyKwh;

        if (!needsCharging) {
            return NextResponse.json({
                success: true,
                needsCharging: false,
                totalDistance,
                energyNeeded: totalEnergyNeeded.toFixed(2),
                energyAvailable: availableEnergyKwh.toFixed(2),
                arrivalSoc: Math.round(((startEnergyKwh - totalEnergyNeeded) / usableBatteryKwh) * 100),
                message: 'Şarj gerektirmiyor! Direkt gidebilirsiniz.'
            });
        }

        // Calculate charging stops needed
        const energyDeficit = totalEnergyNeeded - availableEnergyKwh;
        const chargePerStop = usableBatteryKwh * 0.6; // Charge to 80% each time
        const stopsNeeded = Math.ceil(energyDeficit / chargePerStop);

        // Find charging stations along route
        const midLat = (from[0] + to[0]) / 2;
        const midLon = (from[1] + to[1]) / 2;
        const searchRadius = totalDistance / 2;

        // Attempt to use RPC if it exists, fallback to simple bounding box if not
        const { data: stations, error: rpcError } = await supabase.rpc('stations_nearby', {
            lat: midLat,
            lon: midLon,
            radius_km: searchRadius
        });

        let results = stations;

        if (rpcError) {
            console.warn('RPC stations_nearby not found, falling back to simple query');
            const { data: fallbackStations } = await supabase
                .from('stations')
                .select('id, name, latitude, longitude')
                .limit(10);
            results = fallbackStations;
        }

        // Filter by connector type
        const compatibleStations = results?.filter((s: any) => {
            // Check if station has compatible connector
            return true; // Simplified for now
        }) || [];

        // Estimate charging time
        const chargePowerKw = vehicle.charge_dc_kw || 50;
        const chargeTimePerStop = (chargePerStop / chargePowerKw) * 60; // minutes

        return NextResponse.json({
            success: true,
            needsCharging: true,
            totalDistance: Math.round(totalDistance),
            energyNeeded: totalEnergyNeeded.toFixed(2),
            energyAvailable: availableEnergyKwh.toFixed(2),
            stopsNeeded,
            estimatedChargeTime: Math.round(chargeTimePerStop * stopsNeeded),
            recommendedStations: compatibleStations.slice(0, stopsNeeded),
            vehicle: {
                make: vehicle.make,
                model: vehicle.model,
                variant: vehicle.variant,
                range: vehicle.range_wltp_km,
                connector: vehicle.connector_type
            }
        });

    } catch (error) {
        console.error('Route plan error:', error);
        return NextResponse.json(
            { error: 'Route planning failed' },
            { status: 500 }
        );
    }
}
