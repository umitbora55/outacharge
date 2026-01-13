// app/api/stations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const boundingBox = searchParams.get('boundingbox');

    if (!boundingBox) {
        return NextResponse.json({ error: 'Bounding box required' }, { status: 400 });
    }

    try {
        // Parse bounding box: "(lat1,lng1),(lat2,lng2)"
        const matches = boundingBox.match(/\(([-\d.]+),([-\d.]+)\),\(([-\d.]+),([-\d.]+)\)/);
        if (!matches) {
            return NextResponse.json({ error: 'Invalid bounding box format' }, { status: 400 });
        }

        const [_, nwLat, nwLng, seLat, seLng] = matches.map(Number);

        // Supabase'den istasyonları çek
        const { data: stations, error } = await supabase
            .from('stations')
            .select(`
        id,
        name,
        latitude,
        longitude,
        address,
        city,
        operator_name,
        connectors (
          connector_type,
          power_kw,
          current_type,
          quantity
        )
      `)
            .gte('latitude', Math.min(nwLat, seLat))
            .lte('latitude', Math.max(nwLat, seLat))
            .gte('longitude', Math.min(nwLng, seLng))
            .lte('longitude', Math.max(nwLng, seLng))
            .eq('is_operational', true)
            .limit(1000);

        if (error) throw error;

        // Open Charge Map formatına dönüştür (mevcut frontend koduna uyum için)
        const formattedStations = stations?.map(station => ({
            ID: station.id,
            AddressInfo: {
                Title: station.name,
                Latitude: station.latitude,
                Longitude: station.longitude,
                AddressLine1: station.address || `${station.city || 'Bilinmeyen Konum'}`,
            },
            OperatorInfo: {
                Title: station.operator_name || 'Bilinmeyen Operatör',
            },
            Connections: station.connectors?.map((c: any) => ({
                PowerKW: c.power_kw || 0,
                CurrentTypeID: c.current_type === 'DC' ? 20 : 10,
            })) || [],
        })) || [];

        return NextResponse.json(formattedStations);

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stations' },
            { status: 500 }
        );
    }
}
