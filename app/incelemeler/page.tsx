"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, BookOpen } from "lucide-react";

import VideoFilter from "../components/VideoFilter";
import VideoGallery, { VideoItem } from "../components/VideoGallery";
import { useVehicleSelector } from "../hooks/useVehicleSelector";

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

    const content = {
        locations: "İstasyonlar",
        community: "Topluluk",
        login: "Giriş Yap",
        getStarted: "Hemen Başla"
    };

    return (
        <div className="min-h-screen bg-[#f0fdf4] font-sans text-slate-900 pb-20 overflow-x-hidden relative">

            {/* Background Illustration */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div
                    className="absolute inset-0 bg-cover bg-top bg-no-repeat grayscale-[20%]"
                    style={{ backgroundImage: 'url(/ev-hero-illustrative.png)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-[#f0fdf4]/50 to-[#f0fdf4]" />
            </div>

            {/* 1. Header (Consistent) */}
            <nav className="fixed top-6 left-6 right-6 md:left-12 md:right-12 z-50 flex justify-between items-center px-6 py-4 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/50">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white">
                        <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">Outa<span className="text-green-600">Charge</span></span>
                </Link>

                <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
                    <Link href="/harita" className="hover:text-green-600 transition-colors">{content.locations}</Link>
                    <Link href="/rota-planla" className="hover:text-green-600 transition-colors">Rota Planlayıcı</Link>
                    <Link href="/topluluk" className="hover:text-green-600 transition-colors">{content.community}</Link>
                    <Link href="/operatorler" className="hover:text-green-600 transition-colors">Operatörler</Link>
                    <Link href="/markalar" className="hover:text-green-600 transition-colors">Markalar</Link>
                    <Link href="/incelemeler" className="text-green-600 transition-colors">İncelemeler</Link>
                    <Link href="/hesaplayici" className="hover:text-green-600 transition-colors">Hesaplayıcı</Link>
                </div>

                <div className="hidden md:flex items-center gap-5">
                    <Link href="/giris">
                        <button className="text-sm font-semibold text-slate-600 hover:text-green-700 transition-colors">
                            {content.login}
                        </button>
                    </Link>
                    <Link href="/kayit">
                        <button className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-all shadow-lg shadow-slate-900/20">
                            {content.getStarted}
                        </button>
                    </Link>
                </div>
            </nav>

            {/* 2. Hero Section */}
            <div className="relative z-10 pt-44 pb-0 px-6 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 relative"
                >
                    <div className="relative px-5 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/60 shadow-sm flex items-center gap-2">
                        <BookOpen className="w-3 h-3 text-green-600" />
                        <span className="text-slate-600 text-[10px] font-bold tracking-[0.2em] uppercase">Araç İncelemeleri</span>
                    </div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 drop-shadow-sm"
                >
                    Aradığın Aracı <br className="md:hidden" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-800">Keşfet.</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg md:text-xl text-slate-600 max-w-2xl font-medium leading-relaxed mb-12"
                >
                    Veritabanımızdaki araçların detaylı video incelemelerini ve test sürüşlerini izleyin.
                </motion.p>
            </div>

            {/* 3. Search & Results */}
            <div className="container max-w-6xl mx-auto px-6 relative z-20">

                {/* Search Filter Container */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-16 bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-green-900/5 border border-white/60"
                >
                    <VideoFilter
                        brands={brands}
                        years={years}
                        models={models}
                        selections={selections}
                        setters={setters}
                        onSearch={handleSearch}
                        loading={loading}
                    />
                </motion.div>

                {/* Results */}
                <div className="min-h-[400px]">
                    <VideoGallery
                        videos={videos}
                        loading={loading}
                        searched={searched}
                    />
                </div>

                {!searched && (
                    <div className="mt-12 flex flex-col items-center opacity-40">
                        <p className="text-slate-400 font-medium">Başlamak için bir marka ve model seçin.</p>
                    </div>
                )}
            </div>
        </div>
    );
}