import { NextResponse } from 'next/server';

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
let cache: { data: any; timestamp: number } | null = null;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const boundingbox = searchParams.get('boundingbox');

    // If no bounding box is provided, we could return a default or use Turkey's bounds
    // For now, let's allow it to be optional but prioritize it if present.

    const apiKey = process.env.NEXT_PUBLIC_OCM_API_KEY;
    const baseUrl = 'https://api.openchargemap.io/v3/poi/';
    const url = `${baseUrl}?output=json&countrycode=TR&maxresults=5000&compact=true&verbose=false&key=${apiKey}${boundingbox ? `&boundingbox=${boundingbox}` : ''}`;

    // Simple in-memory cache for the full Turkey data if no bounding box is specific (or even if it is, for simplicity)
    // To keep it simple and "incredibly fast", we can cache the results based on the URL.

    try {
        const response = await fetch(url, {
            next: { revalidate: 3600 } // Use Next.js built-in fetch cache if available
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch from OpenChargeMap' }, { status: 500 });
        }

        const data = await response.json();

        // Minimize the data payload
        const optimizedData = data.map((station: any) => ({
            ID: station.ID,
            AddressInfo: {
                Title: station.AddressInfo.Title,
                Latitude: station.AddressInfo.Latitude,
                Longitude: station.AddressInfo.Longitude,
                AddressLine1: station.AddressInfo.AddressLine1,
            },
            OperatorInfo: station.OperatorInfo ? { Title: station.OperatorInfo.Title } : undefined,
            Connections: station.Connections?.map((c: any) => ({
                PowerKW: c.PowerKW,
                CurrentTypeID: c.CurrentTypeID,
            })),
        }));

        return NextResponse.json(optimizedData);
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
