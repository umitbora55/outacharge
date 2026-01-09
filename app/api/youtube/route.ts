// app/api/youtube/route.ts

import { NextResponse } from 'next/server';

const API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3/search';
const CACHE_DURATION = 86400; // 24 saat cache

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const lang = searchParams.get('lang') || 'tr';
    // YENİ: Sıralama parametresini al (varsayılan: relevance)
    const order = searchParams.get('order') || 'relevance';

    if (!API_KEY) {
        return NextResponse.json({ error: 'API Key eksik' }, { status: 500 });
    }

    if (!query) {
        return NextResponse.json({ error: 'Arama terimi gerekli' }, { status: 400 });
    }

    const searchSuffix = lang === 'tr' ? 'inceleme test sürüşü' : 'review test drive';
    const finalQuery = `${query} ${searchSuffix}`;

    try {
        // YENİ: URL'e &order=${order} eklendi
        const response = await fetch(
            `${YOUTUBE_BASE_URL}?part=snippet&type=video&maxResults=9&q=${encodeURIComponent(finalQuery)}&relevanceLanguage=${lang}&order=${order}&key=${API_KEY}`,
            {
                next: { revalidate: CACHE_DURATION }
            }
        );

        if (!response.ok) {
            return NextResponse.json({ error: 'YouTube hatası' }, { status: response.status });
        }

        const data = await response.json();

        const videos = data.items.map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.medium.url,
            channelTitle: item.snippet.channelTitle,
            publishDate: item.snippet.publishedAt,
        }));

        return NextResponse.json({ videos });

    } catch (error) {
        return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
    }
}