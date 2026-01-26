import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const distance = searchParams.get('distance') || '50';
    const maxresults = searchParams.get('maxresults') || '30';

    if (!lat || !lng) {
        return NextResponse.json({ error: 'Missing lat/lng parameters' }, { status: 400 });
    }

    // Create cache key (round coordinates to reduce cache misses)
    const roundedLat = Math.round(parseFloat(lat) * 10) / 10;
    const roundedLng = Math.round(parseFloat(lng) * 10) / 10;
    const cacheKey = `${roundedLat},${roundedLng},${distance}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data, {
            headers: {
                'X-Cache': 'HIT',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    }

    const apiKey = process.env.NEXT_PUBLIC_OCM_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'OCM API key not configured' }, { status: 500 });
    }

    try {
        const url = `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lng}&distance=${distance}&distanceunit=KM&maxresults=${maxresults}&compact=true&verbose=false&key=${apiKey}`;

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'OutACharge/1.0',
            },
        });

        if (response.status === 429) {
            // Return empty array instead of error for rate limiting
            return NextResponse.json([], {
                headers: {
                    'X-Rate-Limited': 'true',
                    'Retry-After': '5',
                },
            });
        }

        if (!response.ok) {
            console.error(`OCM API error: ${response.status}`);
            return NextResponse.json([], { status: 200 }); // Return empty array
        }

        const data = await response.json();

        // Store in cache
        cache.set(cacheKey, { data, timestamp: Date.now() });

        // Clean old cache entries
        if (cache.size > 100) {
            const now = Date.now();
            for (const [key, value] of cache.entries()) {
                if (now - value.timestamp > CACHE_TTL) {
                    cache.delete(key);
                }
            }
        }

        return NextResponse.json(data, {
            headers: {
                'X-Cache': 'MISS',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
            },
        });
    } catch (error) {
        console.error('OCM API Error:', error);
        return NextResponse.json([], { status: 200 }); // Return empty array instead of error
    }
}
