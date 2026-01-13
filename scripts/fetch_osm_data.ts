// scripts/fetch_osm_data.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// LOGGING SYSTEM
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, `osm_import_${new Date().toISOString().split('T')[0]}.log`);

// Log dizini oluştur
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message: string, level: 'INFO' | 'ERROR' | 'WARNING' | 'SUCCESS' = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;

    // Console'a yaz
    console.log(message);

    // Dosyaya yaz
    fs.appendFileSync(LOG_FILE, logMessage);
}

function logError(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    const errorDetails = error ? JSON.stringify(error, null, 2) : '';
    const logMessage = `[${timestamp}] [ERROR] ${message}\n${errorDetails}\n\n`;

    console.error(message, error);
    fs.appendFileSync(LOG_FILE, logMessage);
}

function logStats(stats: any) {
    const statsMessage = `\n${'='.repeat(50)}\nSTATISTICS:\n${JSON.stringify(stats, null, 2)}\n${'='.repeat(50)}\n\n`;
    console.log(statsMessage);
    fs.appendFileSync(LOG_FILE, statsMessage);
}

interface OSMElement {
    type: string;
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags: {
        amenity: string;
        name?: string;
        operator?: string;
        'addr:city'?: string;
        'addr:street'?: string;
        'addr:postcode'?: string;
        'addr:country'?: string;
        capacity?: string;
        'socket:type2'?: string;
        'socket:ccs'?: string;
        'socket:chademo'?: string;
        'socket:type2:output'?: string;
        'socket:ccs:output'?: string;
        fee?: string;
        phone?: string;
        website?: string;
        opening_hours?: string;
        access?: string;
    };
}

async function fetchOSMData(bbox: [number, number, number, number], retries = 3) {
    log(`Fetching OSM data for bbox: ${bbox.join(',')}`, 'INFO');

    const query = `
    [out:json][timeout:60];
    (
      node["amenity"="charging_station"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
      way["amenity"="charging_station"](${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]});
    );
    out center;
  `;

    for (let i = 0; i < retries; i++) {
        try {
            log(`Attempt ${i + 1}/${retries}...`, 'INFO');

            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (!response.ok) {
                if (response.status === 504 || response.status === 429) {
                    log(`Got ${response.status}, waiting before retry...`, 'WARNING');
                    await new Promise(resolve => setTimeout(resolve, 5000 * (i + 1)));
                    continue;
                }
                throw new Error(`OSM API error: ${response.status}`);
            }

            const data = await response.json();
            log(`Found ${data.elements?.length || 0} charging stations`, 'SUCCESS');

            return data.elements || [];
        } catch (error) {
            if (i === retries - 1) {
                logError('OSM API error after all retries', error);
                throw error;
            }
            log('Error, retrying...', 'WARNING');
            await new Promise(resolve => setTimeout(resolve, 5000 * (i + 1)));
        }
    }

    return [];
}

function parseConnectors(tags: any): Array<{ type: string; power: number; quantity: number }> {
    const connectors = [];

    if (tags['socket:type2']) {
        const qty = parseInt(tags['socket:type2']) || 1;
        const power = parseFloat(tags['socket:type2:output']) || 22;
        connectors.push({ type: 'Type 2 (Mennekes)', power, quantity: qty });
    }

    if (tags['socket:ccs']) {
        const qty = parseInt(tags['socket:ccs']) || 1;
        const power = parseFloat(tags['socket:ccs:output']) || 50;
        connectors.push({ type: 'CCS (Type 2)', power, quantity: qty });
    }

    if (tags['socket:chademo']) {
        const qty = parseInt(tags['socket:chademo']) || 1;
        connectors.push({ type: 'CHAdeMO', power: 50, quantity: qty });
    }

    return connectors;
}

async function saveOSMStations(elements: OSMElement[]) {
    log('Saving to database...', 'INFO');

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    const errors: Array<{ element: number, reason: string, error?: any }> = [];

    for (const element of elements) {
        try {
            const lat = element.lat || element.center?.lat;
            const lon = element.lon || element.center?.lon;

            if (!lat || !lon) {
                skippedCount++;
                errors.push({ element: element.id, reason: 'No coordinates' });
                continue;
            }

            const { data: existing } = await supabase
                .from('stations')
                .select('id')
                .eq('osm_id', element.id)
                .single();

            if (existing) {
                duplicateCount++;
                continue;
            }

            const tags = element.tags;
            const name = tags.name || `OSM Station ${element.id}`;

            const stationData = {
                osm_id: element.id,
                external_id: element.id.toString(),
                name,
                address: tags['addr:street'],
                city: tags['addr:city'],
                country: tags['addr:country'] || 'Unknown',
                postal_code: tags['addr:postcode'],
                latitude: lat,
                longitude: lon,
                location: `POINT(${lon} ${lat})`,
                operator_name: tags.operator,
                phone: tags.phone,
                website: tags.website,
                opening_hours: tags.opening_hours,
                access_type: tags.access === 'private' ? 'private' : 'public',
                has_pricing: tags.fee === 'yes',
                is_operational: true,
                data_source: 'osm',
                data_quality_score: 70,
            };

            const { data: insertedStation, error: stationError } = await supabase
                .from('stations')
                .insert(stationData)
                .select('id')
                .single();

            if (stationError) {
                errorCount++;
                errors.push({ element: element.id, reason: 'Insert failed', error: stationError });
                continue;
            }

            log(`Added: ${name}`, 'SUCCESS');

            const connectors = parseConnectors(tags);
            if (connectors.length > 0) {
                const connectorsData = connectors.map(c => ({
                    station_id: insertedStation.id,
                    connector_type: c.type,
                    power_kw: c.power,
                    current_type: c.power > 22 ? 'DC' : 'AC',
                    quantity: c.quantity,
                    charging_level: c.power > 22 ? 'DC Fast' : 'Level 2',
                }));

                await supabase.from('connectors').insert(connectorsData);
            }

            await supabase.from('station_status').insert({
                station_id: insertedStation.id,
                status: 'available',
                total_connectors: connectors.reduce((sum, c) => sum + c.quantity, 0) || 1,
                available_connectors: connectors.reduce((sum, c) => sum + c.quantity, 0) || 1,
                last_updated: new Date().toISOString(),
            });

            successCount++;
        } catch (error) {
            errorCount++;
            errors.push({ element: element.id, reason: 'Processing failed', error });
        }
    }

    const summary = {
        success: successCount,
        duplicates: duplicateCount,
        errors: errorCount,
        skipped: skippedCount,
        total: elements.length
    };

    logStats(summary);

    if (errors.length > 0) {
        log(`\nERRORS DETAILS (${errors.length} total):`, 'ERROR');
        errors.forEach(err => {
            logError(`Element ${err.element}: ${err.reason}`, err.error);
        });
    }
}

async function main() {
    log('OSM DATA IMPORT STARTED', 'INFO');
    log(`Log file: ${LOG_FILE}`, 'INFO');

    try {
        // Daha küçük bölgeler
        const regions = [
            { name: 'Berlin Center', bbox: [52.48, 13.35, 52.55, 13.45] },
            { name: 'Amsterdam Center', bbox: [52.35, 4.85, 52.40, 4.95] },
            { name: 'Paris Center', bbox: [48.84, 2.30, 48.88, 2.38] },
            { name: 'Munich', bbox: [48.10, 11.50, 48.18, 11.62] },
            { name: 'Brussels', bbox: [50.82, 4.32, 50.88, 4.40] },
        ];

        let totalStations = 0;
        let totalProcessed = 0;
        const regionResults: any[] = [];

        for (const region of regions) {
            log(`\n--- ${region.name} ---`, 'INFO');

            try {
                const elements = await fetchOSMData(region.bbox as [number, number, number, number]);
                totalProcessed += elements.length;

                if (elements.length > 0) {
                    await saveOSMStations(elements);
                    regionResults.push({
                        region: region.name,
                        found: elements.length,
                        status: 'success'
                    });
                    totalStations += elements.length;
                } else {
                    regionResults.push({
                        region: region.name,
                        found: 0,
                        status: 'no data'
                    });
                }

                log('Waiting 5 seconds before next region...', 'INFO');
                await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (error) {
                logError(`Failed for ${region.name}, continuing...`, error);
                regionResults.push({
                    region: region.name,
                    found: 0,
                    status: 'failed',
                    error: String(error)
                });
                continue;
            }
        }

        await supabase
            .from('data_sources')
            .update({
                last_sync_at: new Date().toISOString(),
                last_sync_status: 'success',
                total_records_synced: totalProcessed,
            })
            .eq('source_name', 'osm');

        const finalStats = {
            total_processed: totalProcessed,
            total_added: totalStations,
            regions: regionResults,
            log_file: LOG_FILE
        };

        logStats(finalStats);
        log('OSM DATA IMPORT COMPLETED', 'SUCCESS');
    } catch (error) {
        logError('Fatal error', error);
        process.exit(1);
    }
}

main();
