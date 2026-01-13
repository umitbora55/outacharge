import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const make = searchParams.get('make');
    const model = searchParams.get('model');

    try {
        let query = supabase
            .from('ev_vehicles')
            .select('*')
            .eq('market', 'TR')
            .order('make', { ascending: true })
            .order('model', { ascending: true });

        if (make) {
            query = query.ilike('make', `%${make}%`);
        }

        if (model) {
            query = query.ilike('model', `%${model}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            count: data?.length || 0,
            vehicles: data
        });

    } catch (error) {
        console.error('API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch vehicles' },
            { status: 500 }
        );
    }
}
