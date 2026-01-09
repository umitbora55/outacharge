// app/incelemeler/page.tsx

"use client";

import { useState } from "react";
import HeaderWhite from "../components/HeaderWhite";
import VideoFilter from "../components/VideoFilter";
import VideoGallery, { VideoItem } from "../components/VideoGallery";
import { useVehicleSelector } from "../hooks/useVehicleSelector";
import { Youtube } from "lucide-react";

export default function IncelemelerPage() {
    // 1. Hook'u Çağır (Veri Yönetimi)
    const { brands, years, models, selections, setters } = useVehicleSelector();

    // 2. State Yönetimi (Video ve Yükleme Durumu)
    const [videos, setVideos] = useState<VideoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false); // İlk açılışta boş ekran göstermek için

    // 3. Arama Fonksiyonu (Backend ile İletişim)
    const handleSearch = async () => {
        if (!selections.brand || !selections.model) return;

        setLoading(true);
        setSearched(true);
        setVideos([]); // Önceki sonuçları temizle

        try {
            // API'ye istek at (Backend'de oluşturduğumuz route)
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
            alert("Videolar getirilirken bir sorun oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <HeaderWhite />

            {/* Hero / Başlık Alanı */}
            <div className="bg-zinc-900 text-white pb-24 pt-12">
                <div className="container mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium mb-6 border border-white/10">
                        <Youtube className="w-4 h-4 text-red-500" />
                        <span>Video İnceleme Kütüphanesi</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">
                        Aracınızı Uzmanlardan Dinleyin
                    </h1>
                    <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
                        Binlerce inceleme videosu arasından marka ve modele göre filtrelenmiş,
                        en alakalı içeriklere anında ulaşın.
                    </p>
                </div>
            </div>

            {/* Ana İçerik (Yukarıya doğru taşan tasarım) */}
            <div className="container mx-auto px-4 -mt-16 pb-20 relative z-10">

                {/* Filtreleme Komponenti */}
                <VideoFilter
                    brands={brands}
                    years={years}
                    models={models}
                    selections={selections}
                    setters={setters}
                    onSearch={handleSearch}
                    loading={loading}
                />

                {/* Video Galeri */}
                <VideoGallery
                    videos={videos}
                    loading={loading}
                    searched={searched}
                />

            </div>
        </div>
    );
}