import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
    try {
        // Get all unique operators with station counts
        const { data, error } = await supabase
            .from('stations')
            .select('operator_name, country')
            .order('operator_name');

        if (error) throw error;

        // Group by operator and country
        const operatorMap = new Map<string, {
            name: string;
            countries: Set<string>;
            count: number;
        }>();

        data?.forEach(station => {
            const name = station.operator_name || 'Bilinmeyen';
            const country = station.country || 'Unknown';

            if (!operatorMap.has(name)) {
                operatorMap.set(name, {
                    name,
                    countries: new Set([country]),
                    count: 1
                });
            } else {
                const op = operatorMap.get(name)!;
                op.countries.add(country);
                op.count++;
            }
        });

        // Convert to array and sort by count
        const operators = Array.from(operatorMap.values())
            .map(op => ({
                name: op.name,
                countries: Array.from(op.countries).sort(),
                stationCount: op.count
            }))
            .sort((a, b) => b.stationCount - a.stationCount);

        return NextResponse.json({
            success: true,
            total: operators.length,
            operators
        });

    } catch (error) {
        console.error('Operators API error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch operators' },
            { status: 500 }
        );
    }
}
