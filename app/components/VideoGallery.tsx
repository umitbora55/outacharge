// app/components/VideoGallery.tsx

"use client";

import { useState } from "react";
import { Play, Search } from "lucide-react";
import VideoModal from "./VideoModal";

export interface VideoItem {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    publishDate: string;
}

interface VideoGalleryProps {
    videos: VideoItem[];
    loading: boolean;
    searched: boolean;
}

const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
};

export default function VideoGallery({ videos, loading, searched }: VideoGalleryProps) {
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 mt-16">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-[4/5] bg-zinc-50 dark:bg-zinc-900/40 animate-pulse rounded-[2.5rem]" />
                ))}
            </div>
        );
    }

    if (!loading && searched && videos.length === 0) {
        return (
            <div className="text-center py-40 mt-16 bg-zinc-50/30 dark:bg-zinc-900/10 rounded-[4rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                <Search className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-6" />
                <h3 className="text-xl font-medium text-zinc-900 dark:text-white">Record Not Found</h3>
                <p className="text-zinc-500 font-light mt-2">The selected variant has no verified review documentation.</p>
            </div>
        );
    }

    if (!searched) return null;

    return (
        <>
            {playingVideoId && (
                <VideoModal
                    videoId={playingVideoId}
                    onClose={() => setPlayingVideoId(null)}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-24 mt-20">
                {videos.map((video) => (
                    <div
                        key={video.id}
                        onClick={() => setPlayingVideoId(video.id)}
                        className="group flex flex-col cursor-pointer"
                    >
                        {/* Apple-Style Floating Thumbnail Container */}
                        <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-900 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] transition-all duration-700 ease-out">
                            <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000 ease-out"
                            />

                            {/* Sophisticated Hover Overlay */}
                            <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors duration-500" />

                            {/* Floating Play Icon */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100">
                                <div className="w-16 h-16 rounded-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md flex items-center justify-center shadow-2xl">
                                    <Play className="w-6 h-6 text-zinc-900 dark:text-white fill-current translate-x-0.5" />
                                </div>
                            </div>

                            {/* Top Internal Label */}
                            <div className="absolute top-8 left-8">
                                <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em] bg-black/30 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 shadow-lg">
                                    Exclusive Review
                                </span>
                            </div>
                        </div>

                        {/* Text Content - Positioned outside for an editorial look */}
                        <div className="pt-10 px-4 space-y-4">
                            <div className="flex flex-col gap-3">
                                <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em]">
                                    Curated Segment
                                </span>
                                <h3 className="text-xl md:text-2xl font-medium text-zinc-900 dark:text-white line-clamp-2 leading-tight tracking-tight group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors duration-500">
                                    {video.title}
                                </h3>
                            </div>

                            {/* High-Precision Metadata Strip */}
                            <div className="flex items-center gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest leading-none mb-1.5">Production</span>
                                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-[140px]">{video.channelTitle}</span>
                                </div>
                                <div className="w-[1px] h-6 bg-zinc-100 dark:bg-zinc-800" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest leading-none mb-1.5">Timeline</span>
                                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{formatDate(video.publishDate)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}