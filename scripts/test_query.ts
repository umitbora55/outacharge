// scripts/test_query.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testQueries() {
    console.log('Test sorguları calıstırılıyor...\n');

    // 1. Toplam istasyon sayısı
    const { count: totalStations } = await supabase
        .from('stations')
        .select('*', { count: 'exact', head: true });

    console.log(`Toplam istasyon: ${totalStations}`);

    // 2. Şehir bazlı dağılım
    const { data: cityCounts } = await supabase
        .from('stations')
        .select('city')
        .eq('country', 'TR');

    const cityMap = new Map();
    cityCounts?.forEach(s => {
        const city = s.city || 'Bilinmiyor';
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
    });

    console.log('\nSehir bazlı dagilim:');
    Array.from(cityMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([city, count]) => {
            console.log(`  ${city}: ${count} istasyon`);
        });

    // 3. Operatör dağılımı
    const { data: operators } = await supabase
        .from('stations')
        .select('operator_name')
        .not('operator_name', 'is', null);

    const opMap = new Map();
    operators?.forEach(s => {
        opMap.set(s.operator_name, (opMap.get(s.operator_name) || 0) + 1);
    });

    console.log('\nOperator dagilimi (Top 5):');
    Array.from(opMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([op, count]) => {
            console.log(`  ${op}: ${count} istasyon`);
        });

    // 4. Connector tipleri
    const { data: connectors } = await supabase
        .from('connectors')
        .select('connector_type');

    const connMap = new Map();
    connectors?.forEach(c => {
        connMap.set(c.connector_type, (connMap.get(c.connector_type) || 0) + 1);
    });

    console.log('\nConnector tipleri:');
    Array.from(connMap.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
            console.log(`  ${type}: ${count} adet`);
        });

    // 5. Yakındaki istasyonlar (Istanbul merkez)
    try {
        const { data: nearby, error } = await supabase.rpc('stations_nearby', {
            lat: 41.0082,
            lon: 28.9784,
            radius_km: 5
        });

        if (error) {
            console.log('\n⚠️  stations_nearby RPC hatası (Muhtemelen RPC henüz tanımlanmadı):', error.message);
        } else {
            console.log('\nIstanbul merkeze yakin 5 istasyon:');
            nearby?.slice(0, 5).forEach((s: any) => {
                console.log(`  ${s.name} - ${s.distance_km?.toFixed(2)} km`);
            });
        }
    } catch (err) {
        console.log('\n⚠️  Yakın istasyon sorgusu sırasında hata oluştu.');
    }
}

testQueries();
