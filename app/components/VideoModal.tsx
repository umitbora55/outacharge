// app/components/VideoModal.tsx

"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface VideoModalProps {
    videoId: string;
    onClose: () => void;
}

export default function VideoModal({ videoId, onClose }: VideoModalProps) {

    // Modal açıldığında "ESC" tuşuna basılırsa kapansın
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        // Sayfa scroll olmasın diye body'i kitleyelim
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "auto";
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">

            {/* Kapatma Butonu (Sağ Üst) */}
            <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
            >
                <X className="w-8 h-8" />
            </button>

            {/* Arka plan tıklamasıyla kapatma alanı */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Video Alanı */}
            <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                />
            </div>
        </div>
    );
}
