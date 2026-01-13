// scripts/cleanup_test_data.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function cleanup() {
    console.log('Veritabani temizleniyor...');

    // Stations silinince connectors ve status otomatik silinir (CASCADE)
    const { error } = await supabase
        .from('stations')
        .delete()
        .gte('created_at', '2020-01-01');

    if (error) {
        console.error('Hata:', error);
    } else {
        console.log('Temizlendi!');
    }
}

cleanup();
