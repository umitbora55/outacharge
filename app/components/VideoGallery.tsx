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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                {videos.map((video) => (
                    <div
                        key={video.id}
                        onClick={() => setPlayingVideoId(video.id)}
                        className="group flex flex-col cursor-pointer"
                    >
                        {/* Cinematic 16:9 Thumbnail Container */}
                        <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900 shadow-sm group-hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] transition-all duration-500 ease-out z-10 group-hover:-translate-y-1">
                            <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            />

                            {/* Gradient Overlay for Text Readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                            {/* Centered Play Button (Glass) */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
                                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-xl">
                                    <Play className="w-6 h-6 text-white fill-current ml-1" />
                                </div>
                            </div>

                            {/* Duration / Type Badge */}
                            <div className="absolute top-3 right-3">
                                <span className="text-[10px] font-bold text-white bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
                                    KAYDI OYNAT
                                </span>
                            </div>
                        </div>

                        {/* Professional Metadata */}
                        <div className="pt-4 px-1 space-y-2">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-green-700 transition-colors duration-300">
                                {video.title}
                            </h3>

                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                        {video.channelTitle.charAt(0)}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-500 truncate max-w-[120px]">
                                        {video.channelTitle}
                                    </span>
                                </div>
                                <span className="text-[10px] font-medium text-slate-400">
                                    {formatDate(video.publishDate)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}