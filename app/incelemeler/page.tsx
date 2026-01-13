// app/incelemeler/page.tsx

"use client";

import { useState } from "react";
import HeaderWhite from "../components/HeaderWhite";
import VideoFilter from "../components/VideoFilter";
import VideoGallery, { VideoItem } from "../components/VideoGallery";
import { useVehicleSelector } from "../hooks/useVehicleSelector";
import { RefreshCw } from "lucide-react";

export default function IncelemelerPage() {
    const { brands, years, models, selections, setters } = useVehicleSelector();

    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        if (!selections.brand || !selections.model) return;

        setLoading(true);
        setSearched(true);
        setVideos([]);

        try {
            const query = `${selections.brand} ${selections.model} ${selections.year}`;
            const params = new URLSearchParams({
                q: query,
                lang: selections.lang,
                order: selections.sort
            });

            const res = await fetch(`/api/youtube?${params}`);

            if (!res.ok) throw new Error("Veri çekilemedi");

            const data = await res.json();
            setVideos(data.videos || []);

        } catch (error) {
            console.error("Arama hatası:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#000000] transition-colors duration-1000 selection:bg-red-500/30 font-sans text-zinc-900 dark:text-white">
            <HeaderWhite />

            {/* Understated Library Hero - Minimalist Luxury */}
            <div className="relative h-[60vh] min-h-[500px] flex items-center overflow-hidden bg-zinc-950">
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: 'url("/images/hero-car.jpg")',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px]" />
                </div>

                <div className="container max-w-6xl mx-auto px-6 relative z-10">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-3 mb-6 opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
                            <span className="text-zinc-500 text-[10px] font-bold tracking-[0.5em] uppercase">Archive & Review</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extralight text-white tracking-tight mb-6 leading-tight opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards]">
                            Technical <br />
                            <span className="font-medium">Insights.</span>
                        </h1>
                        <p className="text-zinc-500 max-w-md text-lg font-light leading-relaxed mb-12 opacity-0 animate-[fadeIn_1s_ease-out_0.4s_forwards]">
                            Explore detailed expert reviews processed through our high-precision archive.
                        </p>

                        {/* Integrated Stats - Technical Specification Style */}
                        <div className="flex items-center gap-16 opacity-0 animate-[fadeIn_1s_ease-out_0.6s_forwards]">
                            <div className="flex flex-col gap-1">
                                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                                    {videos.length > 0 ? videos.length : "0"}
                                </span>
                                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                                    Active Records
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                                    {searched ? "Verified" : "Standby"}
                                </span>
                                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                                    Service Status
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container max-w-6xl mx-auto px-6 pb-32 relative z-20">
                {/* Search & Filter Section */}
                <div className="pt-20 pb-16">
                    <VideoFilter
                        brands={brands}
                        years={years}
                        models={models}
                        selections={selections}
                        setters={setters}
                        onSearch={handleSearch}
                        loading={loading}
                    />
                </div>

                {/* Video Gallery Container */}
                <div className="mt-8">
                    <VideoGallery
                        videos={videos}
                        loading={loading}
                        searched={searched}
                    />
                </div>

                <div className="mt-48 flex flex-col items-center">
                    <div className="h-px w-24 bg-zinc-100 dark:bg-zinc-950" />
                    <p className="text-zinc-100 dark:text-zinc-900/30 text-[10vw] font-black leading-none select-none tracking-tighter mt-12">
                        ARCHIVE
                    </p>
                </div>
            </main>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}