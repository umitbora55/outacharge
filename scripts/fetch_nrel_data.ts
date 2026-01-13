// scripts/fetch_nrel_data.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const nrelApiKey = process.env.NEXT_PUBLIC_EV_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface NRELStation {
    id: number;
    station_name: string;
    street_address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    latitude: number;
    longitude: number;
    station_phone: string;
    ev_network: string;
    ev_network_web: string;
    access_code: string;
    access_days_time: string;
    ev_connector_types: string[];
    ev_level1_evse_num: number;
    ev_level2_evse_num: number;
    ev_dc_fast_num: number;
    ev_pricing: string;
    date_last_confirmed: string;
    updated_at: string;
    owner_type_code: string;
    facility_type: string;
}

const CONNECTOR_TYPE_MAP: { [key: string]: string } = {
    'J1772': 'Type 1 (J1772)',
    'CHADEMO': 'CHAdeMO',
    'J1772COMBO': 'CCS (Type 1)',
    'TESLA': 'Tesla (Model S/X)',
    'NEMA515': 'NEMA 5-15',
    'NEMA520': 'NEMA 5-20',
    'NEMA1450': 'NEMA 14-50',
};

function parseConnectorTypes(types: string[]): string[] {
    return types.map(t => CONNECTOR_TYPE_MAP[t] || t);
}

function getAccessType(code: string): string {
    if (code === 'public') return 'public';
    if (code === 'private') return 'private';
    return 'semi-public';
}

async function fetchNRELData(state: string, limit: number = 200) {
    console.log(`Fetching NREL data for ${state}...`);

    try {
        const url = new URL('https://developer.nrel.gov/api/alt-fuel-stations/v1.json');
        url.searchParams.append('api_key', nrelApiKey);
        url.searchParams.append('fuel_type', 'ELEC');
        url.searchParams.append('state', state);
        url.searchParams.append('status', 'E'); // E = Available/Operational
        url.searchParams.append('limit', limit.toString());

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`NREL API error: ${response.status}`);
        }

        const json = await response.json();
        console.log(`Found ${json.fuel_stations?.length || 0} stations`);

        return json.fuel_stations || [];
    } catch (error) {
        console.error('NREL API error:', error);
        throw error;
    }
}

async function saveNRELStations(stations: NRELStation[]) {
    console.log('Saving to database...\n');

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (const station of stations) {
        try {
            // Check if exists
            const { data: existing } = await supabase
                .from('stations')
                .select('id')
                .eq('nrel_id', station.id)
                .single();

            if (existing) {
                duplicateCount++;
                continue;
            }

            const stationData = {
                nrel_id: station.id,
                external_id: station.id.toString(),
                name: station.station_name,
                address: station.street_address,
                city: station.city,
                state_province: station.state,
                country: station.country || 'US',
                postal_code: station.zip,
                latitude: station.latitude,
                longitude: station.longitude,
                location: `POINT(${station.longitude} ${station.latitude})`,
                operator_name: station.ev_network,
                network: station.ev_network,
                phone: station.station_phone,
                website: station.ev_network_web,
                access_type: getAccessType(station.access_code),
                opening_hours: station.access_days_time,
                has_pricing: !!station.ev_pricing,
                pricing_info: station.ev_pricing ? { note: station.ev_pricing } : null,
                is_operational: true,
                data_source: 'nrel',
                data_quality_score: 95,
                last_verified_at: station.date_last_confirmed || station.updated_at,
            };

            const { data: insertedStation, error: stationError } = await supabase
                .from('stations')
                .insert(stationData)
                .select('id')
                .single();

            if (stationError) {
                console.error(`Error for ${station.station_name}:`, stationError.message);
                errorCount++;
                continue;
            }

            const stationId = insertedStation.id;
            console.log(`Added: ${station.station_name} (${station.city}, ${station.state})`);

            // Add connectors
            const connectorsData = [];

            if (station.ev_connector_types) {
                const types = parseConnectorTypes(station.ev_connector_types);
                types.forEach(type => {
                    connectorsData.push({
                        station_id: stationId,
                        connector_type: type,
                        power_kw: type.includes('DC') || type.includes('CHAdeMO') ? 50 : 7.2,
                        current_type: type.includes('DC') || type.includes('CHAdeMO') ? 'DC' : 'AC',
                        quantity: 1,
                        charging_level: type.includes('DC') ? 'DC Fast' : 'Level 2',
                    });
                });
            }

            // Level 1
            if (station.ev_level1_evse_num > 0) {
                connectorsData.push({
                    station_id: stationId,
                    connector_type: 'Type 1 (J1772)',
                    power_kw: 1.4,
                    current_type: 'AC',
                    quantity: station.ev_level1_evse_num,
                    charging_level: 'Level 1',
                });
            }

            // Level 2
            if (station.ev_level2_evse_num > 0) {
                connectorsData.push({
                    station_id: stationId,
                    connector_type: 'Type 1 (J1772)',
                    power_kw: 7.2,
                    current_type: 'AC',
                    quantity: station.ev_level2_evse_num,
                    charging_level: 'Level 2',
                });
            }

            // DC Fast
            if (station.ev_dc_fast_num > 0) {
                connectorsData.push({
                    station_id: stationId,
                    connector_type: 'CCS (Type 1)',
                    power_kw: 50,
                    current_type: 'DC',
                    quantity: station.ev_dc_fast_num,
                    charging_level: 'DC Fast',
                });
            }

            if (connectorsData.length > 0) {
                await supabase.from('connectors').insert(connectorsData);
            }

            // Add status
            await supabase.from('station_status').insert({
                station_id: stationId,
                status: 'available',
                total_connectors: connectorsData.reduce((sum, c) => sum + (c.quantity || 1), 0),
                available_connectors: connectorsData.reduce((sum, c) => sum + (c.quantity || 1), 0),
                last_updated: new Date().toISOString(),
            });

            successCount++;
        } catch (error) {
            console.error(`Error processing ${station.station_name}:`, error);
            errorCount++;
        }
    }

    console.log('\nSUMMARY:');
    console.log(`Success: ${successCount}`);
    console.log(`Duplicates: ${duplicateCount}`);
    console.log(`Errors: ${errorCount}`);
}

async function main() {
    console.log('═══════════════════════════════════════');
    console.log('NREL/AFDC DATA IMPORT (US/Canada)');
    console.log('═══════════════════════════════════════\n');

    try {
        // Major US states
        const states = ['CA', 'NY', 'FL', 'TX', 'WA'];
        let totalStations = 0;

        for (const state of states) {
            console.log(`\n--- ${state} ---`);
            const stations = await fetchNRELData(state, 100);

            if (stations.length > 0) {
                await saveNRELStations(stations);
                totalStations += stations.length;
            }

            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        await supabase
            .from('data_sources')
            .update({
                last_sync_at: new Date().toISOString(),
                last_sync_status: 'success',
                total_records_synced: totalStations,
            })
            .eq('source_name', 'nrel');

        console.log(`\n═══════════════════════════════════════`);
        console.log(`TOTAL: ${totalStations} stations fetched`);
        console.log('═══════════════════════════════════════');
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();
