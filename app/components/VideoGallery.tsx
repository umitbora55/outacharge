// app/components/VideoGallery.tsx

"use client";

import { useState } from "react"; // State eklendi
import { Play, Calendar, User, Youtube } from "lucide-react";
import VideoModal from "./VideoModal"; // Modal import edildi

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
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('tr-TR', options);
};

export default function VideoGallery({ videos, loading, searched }: VideoGalleryProps) {
    // YENİ: Hangi videonun oynatıldığını tutan state
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 h-80 animate-pulse">
                        <div className="bg-gray-200 h-48 w-full" />
                        <div className="p-5 space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!loading && searched && videos.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-50 rounded-3xl mt-8 border border-dashed border-gray-200">
                <Youtube className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Video Bulunamadı</h3>
                <p className="text-gray-500">Bu kriterlere uygun bir inceleme videosu yok gibi görünüyor.</p>
            </div>
        );
    }

    if (!searched) return null;

    return (
        <>
            {/* Modal - Eğer bir video seçiliyse göster */}
            {playingVideoId && (
                <VideoModal
                    videoId={playingVideoId}
                    onClose={() => setPlayingVideoId(null)}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {videos.map((video) => (
                    <div
                        key={video.id}
                        onClick={() => setPlayingVideoId(video.id)}
                        className="group bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 dark:border-zinc-800 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full cursor-pointer"
                    >
                        {/* Thumbnail Alanı */}
                        <div className="relative aspect-video w-full bg-black overflow-hidden">
                            <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                            />

                            {/* Play Butonu */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                                <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                    <Play className="w-6 h-6 text-white fill-current ml-1" />
                                </div>
                            </div>

                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg">
                                <Youtube className="w-4 h-4 text-white" />
                            </div>
                        </div>

                        {/* İçerik Alanı */}
                        <div className="p-5 flex flex-col flex-1">
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 line-clamp-2 mb-3 group-hover:text-red-600 transition-colors">
                                {video.title}
                            </h3>

                            <div className="mt-auto flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400 font-medium">
                                <div className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5" />
                                    <span className="truncate max-w-[100px]">{video.channelTitle}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>{formatDate(video.publishDate)}</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 flex items-center text-sm font-semibold text-zinc-900 dark:text-zinc-200 group-hover:text-red-600 transition-colors">
                                Hemen İzle
                                <Play className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}