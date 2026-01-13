// scripts/fetch_ocm_data.ts
// Open Charge Map veri çekme scripti - İlk test

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// .env dosyasını yükle
dotenv.config({ path: '.env.local' });

// Supabase client oluştur
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ocmApiKey = process.env.NEXT_PUBLIC_OCM_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// TİP TANIMLARI
// ============================================

interface OCMConnection {
    ConnectionTypeID: number;
    PowerKW: number;
    Voltage?: number;
    Amps?: number;
    CurrentTypeID: number;
    Quantity: number;
    LevelID?: number;
}

interface OCMStation {
    ID: number;
    UUID: string;
    AddressInfo: {
        Title: string;
        AddressLine1?: string;
        Town?: string;
        StateOrProvince?: string;
        Postcode?: string;
        CountryID: number;
        Country: {
            Title: string;
            ISOCode: string;
        };
        Latitude: number;
        Longitude: number;
        ContactTelephone1?: string;
        AccessComments?: string;
    };
    OperatorInfo?: {
        Title: string;
        WebsiteURL?: string;
        ID: number;
    };
    UsageType?: {
        Title: string;
    };
    StatusType?: {
        IsOperational: boolean;
    };
    Connections: OCMConnection[];
    NumberOfPoints?: number;
    GeneralComments?: string;
    DateLastStatusUpdate?: string;
}

// ============================================
// CONNECTOR TYPE MAPPING
// ============================================

const CONNECTOR_TYPE_MAP: { [key: number]: string } = {
    0: 'Unknown',
    1: 'Type 1 (J1772)',
    2: 'CHAdeMO',
    25: 'Type 2 (Mennekes)',
    27: 'Type 2 (Tethered)',
    32: 'CCS (Type 1)',
    33: 'CCS (Type 2)',
    1036: 'Tesla (Model S/X)',
    8: 'Tesla (Roadster)',
    16: 'Type 3',
    23: 'Type 3A',
    // Ekstra tipler...
};

const CURRENT_TYPE_MAP: { [key: number]: string } = {
    10: 'AC',
    20: 'DC',
    30: 'AC', // Mapping AC/DC to AC to avoid constraint violation
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getConnectorType(typeId: number): string {
    return CONNECTOR_TYPE_MAP[typeId] || `Type_${typeId}`;
}

function getCurrentType(typeId: number): string {
    const type = CURRENT_TYPE_MAP[typeId];
    if (!type) {
        console.warn(`⚠️  Unknown current type ID: ${typeId}, defaulting to AC`);
        return 'AC';
    }
    return type;
}

function getChargingLevel(levelId?: number): string {
    if (!levelId) return 'Unknown';
    if (levelId === 1) return 'Level 1';
    if (levelId === 2) return 'Level 2';
    if (levelId === 3) return 'DC Fast';
    return 'Unknown';
}

function getAccessType(usageType?: string): string {
    if (!usageType) return 'public';
    const lower = usageType.toLowerCase();
    if (lower.includes('private')) return 'private';
    if (lower.includes('restricted')) return 'semi-public';
    return 'public';
}

// ============================================
// MAIN FUNCTION: Veri Çekme
// ============================================

async function fetchOCMData(
    latitude: number,
    longitude: number,
    radiusKM: number = 50,
    maxResults: number = 10
) {
    console.log('🚀 Open Charge Map veri çekme başlıyor...');
    console.log(`📍 Lokasyon: ${latitude}, ${longitude}`);
    console.log(`📏 Yarıçap: ${radiusKM} km`);
    console.log(`📊 Max sonuç: ${maxResults}`);

    try {
        // OCM API çağrısı
        const url = new URL('https://api.openchargemap.io/v3/poi/');
        url.searchParams.append('output', 'json');
        url.searchParams.append('key', ocmApiKey);
        url.searchParams.append('latitude', latitude.toString());
        url.searchParams.append('longitude', longitude.toString());
        url.searchParams.append('distance', radiusKM.toString());
        url.searchParams.append('distanceunit', 'KM');
        url.searchParams.append('maxresults', maxResults.toString());
        url.searchParams.append('compact', 'false');
        url.searchParams.append('verbose', 'false');

        console.log('🌐 API çağrısı yapılıyor...');
        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`OCM API error: ${response.status} ${response.statusText}`);
        }

        const data: OCMStation[] = await response.json();
        console.log(`✅ ${data.length} istasyon bulundu!`);

        return data;
    } catch (error) {
        console.error('❌ OCM API hatası:', error);
        throw error;
    }
}

// ============================================
// TRANSFORM & LOAD: Veritabanına Kaydet
// ============================================

async function saveStationsToDatabase(stations: OCMStation[]) {
    console.log('\n💾 Veritabanına kaydetme başlıyor...');

    let successCount = 0;
    let errorCount = 0;

    for (const station of stations) {
        try {
            // 1. Station verisini hazırla
            const stationData = {
                ocm_id: station.ID,
                external_id: station.UUID,
                name: station.AddressInfo.Title || 'Unnamed Station',
                address: station.AddressInfo.AddressLine1,
                city: station.AddressInfo.Town,
                state_province: station.AddressInfo.StateOrProvince,
                country: station.AddressInfo.Country.ISOCode,
                postal_code: station.AddressInfo.Postcode,
                latitude: station.AddressInfo.Latitude,
                longitude: station.AddressInfo.Longitude,
                location: `POINT(${station.AddressInfo.Longitude} ${station.AddressInfo.Latitude})`,
                operator_name: station.OperatorInfo?.Title,
                phone: station.AddressInfo.ContactTelephone1,
                website: station.OperatorInfo?.WebsiteURL,
                access_type: getAccessType(station.UsageType?.Title),
                access_restrictions: station.AddressInfo.AccessComments,
                is_operational: station.StatusType?.IsOperational ?? true,
                data_source: 'ocm',
                data_quality_score: 75, // OCM için ortalama kalite skoru
                last_verified_at: station.DateLastStatusUpdate || new Date().toISOString(),
            };

            // 2. Station'ı veritabanına ekle (upsert - varsa güncelle)
            const { data: insertedStation, error: stationError } = await supabase
                .from('stations')
                .upsert(stationData, {
                    onConflict: 'ocm_id',
                    ignoreDuplicates: false,
                })
                .select('id')
                .single();

            if (stationError) {
                console.error(`❌ Station kayıt hatası (OCM ID: ${station.ID}):`, stationError);
                errorCount++;
                continue;
            }

            const stationId = insertedStation.id;
            console.log(`✅ Station kaydedildi: ${stationData.name} (ID: ${stationId})`);

            // 3. Connectors (soketler) ekle
            if (station.Connections && station.Connections.length > 0) {
                const connectorsData = station.Connections.map((conn) => ({
                    station_id: stationId,
                    connector_type: getConnectorType(conn.ConnectionTypeID),
                    power_kw: conn.PowerKW || 0,
                    voltage: conn.Voltage,
                    amperage: conn.Amps,
                    current_type: getCurrentType(conn.CurrentTypeID),
                    quantity: conn.Quantity || 1,
                    charging_level: getChargingLevel(conn.LevelID),
                }));

                const { error: connectorsError } = await supabase
                    .from('connectors')
                    .insert(connectorsData);

                if (connectorsError) {
                    console.error(`⚠️  Connectors kayıt hatası:`, connectorsError);
                } else {
                    console.log(`   ├─ ${connectorsData.length} connector eklendi`);
                }
            }

            // 4. Station status ekle
            const statusData = {
                station_id: stationId,
                status: station.StatusType?.IsOperational ? 'available' : 'out_of_service',
                available_connectors: station.StatusType?.IsOperational ? (station.NumberOfPoints || 0) : 0,
                total_connectors: station.NumberOfPoints || 0,
                last_updated: new Date().toISOString(),
            };

            const { error: statusError } = await supabase
                .from('station_status')
                .insert(statusData);

            if (statusError) {
                console.error(`⚠️  Status kayıt hatası:`, statusError);
            }

            successCount++;
        } catch (error) {
            console.error(`❌ Genel hata (Station ID: ${station.ID}):`, error);
            errorCount++;
        }
    }

    console.log('\n📊 ÖZET:');
    console.log(`✅ Başarılı: ${successCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log(`📈 Toplam: ${stations.length}`);
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
    console.log('═══════════════════════════════════════');
    console.log('EV CHARGING STATIONS - TURKEY IMPORT');
    console.log('Open Charge Map Data Import');
    console.log('═══════════════════════════════════════\n');

    try {
        // Türkiye şehirleri
        const locations = [
            { name: 'Istanbul', lat: 41.0082, lon: 28.9784, radius: 100 },
            { name: 'Ankara', lat: 39.9334, lon: 32.8597, radius: 100 },
            { name: 'Izmir', lat: 38.4237, lon: 27.1428, radius: 100 },
            { name: 'Antalya', lat: 36.8969, lon: 30.7133, radius: 80 },
            { name: 'Bursa', lat: 40.1826, lon: 29.0665, radius: 80 },
            { name: 'Adana', lat: 37.0000, lon: 35.3213, radius: 80 },
            { name: 'Konya', lat: 37.8667, lon: 32.4833, radius: 80 },
            { name: 'Gaziantep', lat: 37.0662, lon: 37.3833, radius: 60 },
            { name: 'Kayseri', lat: 38.7312, lon: 35.4787, radius: 60 },
        ];

        let totalStations = 0;

        for (const loc of locations) {
            console.log(`\n--- ${loc.name} ---`);
            const stations = await fetchOCMData(loc.lat, loc.lon, loc.radius, 100);

            if (stations.length > 0) {
                await saveStationsToDatabase(stations);
                totalStations += stations.length;
            }

            // API rate limit için 2 saniye bekle
            console.log('Bekleniyor...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Data source güncelle
        await supabase
            .from('data_sources')
            .update({
                last_sync_at: new Date().toISOString(),
                last_sync_status: 'success',
                total_records_synced: totalStations,
            })
            .eq('source_name', 'ocm');

        console.log(`\n═══════════════════════════════════════`);
        console.log(`TOPLAM: ${totalStations} istasyon cekildi`);
        console.log('Islem tamamlandi!');
        console.log('═══════════════════════════════════════');
    } catch (error) {
        console.error('\nFatal error:', error);
        process.exit(1);
    }
}

// Script çalıştır
main();
