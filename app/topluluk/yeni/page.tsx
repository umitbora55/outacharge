"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import {
    ArrowLeft,
    AlertTriangle,
    Zap,
    Car,
    HelpCircle,
    Lightbulb,
    Newspaper,
    MapPin,
    Send,
    Loader2
} from "lucide-react";
import { operators } from "@/data/operators";

const categories = [
    {
        id: "istasyon_sikayeti",
        label: "İstasyon Şikayeti",
        icon: AlertTriangle,
        color: "bg-red-50 text-red-600 border-red-200",
        activeBorder: "border-red-500",
        description: "Belirli bir istasyonla ilgili sorun bildirin"
    },
    {
        id: "operator_sikayeti",
        label: "Operatör Şikayeti",
        icon: Zap,
        color: "bg-yellow-50 text-yellow-600 border-yellow-200",
        activeBorder: "border-yellow-500",
        description: "Şarj operatörü hakkında genel şikayet"
    },
    {
        id: "deneyim",
        label: "Deneyim",
        icon: Car,
        color: "bg-blue-50 text-blue-600 border-blue-200",
        activeBorder: "border-blue-500",
        description: "Şarj veya yolculuk deneyiminizi paylaşın"
    },
    {
        id: "soru",
        label: "Soru",
        icon: HelpCircle,
        color: "bg-purple-50 text-purple-600 border-purple-200",
        activeBorder: "border-purple-500",
        description: "Topluluktan yardım isteyin"
    },
    {
        id: "oneri",
        label: "Öneri",
        icon: Lightbulb,
        color: "bg-emerald-50 text-emerald-600 border-emerald-200",
        activeBorder: "border-emerald-500",
        description: "İstasyon veya özellik önerisi"
    },
    {
        id: "haber",
        label: "Haber",
        icon: Newspaper,
        color: "bg-cyan-50 text-cyan-600 border-cyan-200",
        activeBorder: "border-cyan-500",
        description: "Elektrikli araç sektörü haberleri"
    },
];

const cities = [
    "Adana", "Ankara", "Antalya", "Bursa", "Denizli", "Diyarbakır", "Eskişehir",
    "Gaziantep", "İstanbul", "İzmir", "Kayseri", "Kocaeli", "Konya", "Mersin",
    "Muğla", "Sakarya", "Samsun", "Trabzon"
];

export default function YeniEntryPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [category, setCategory] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [operatorId, setOperatorId] = useState("");
    const [city, setCity] = useState("");
    const [stationName, setStationName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const selectedOperator = operators.find(o => o.id === operatorId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            setError("Giriş yapmalısınız");
            return;
        }

        if (!category) {
            setError("Kategori seçmelisiniz");
            return;
        }

        if (!title.trim()) {
            setError("Başlık girmelisiniz");
            return;
        }

        if (title.trim().length < 10) {
            setError("Başlık en az 10 karakter olmalı");
            return;
        }

        if (!content.trim()) {
            setError("İçerik girmelisiniz");
            return;
        }

        if (content.trim().length < 30) {
            setError("İçerik en az 30 karakter olmalı");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const { data, error: insertError } = await supabase
                .from("posts")
                .insert({
                    user_id: user.id,
                    category,
                    title: title.trim(),
                    content: content.trim(),
                    operator_id: operatorId || null,
                    operator_name: selectedOperator?.name || null,
                    station_name: stationName.trim() || null,
                    city: city || null,
                })
                .select()
                .single();

            if (insertError) throw insertError;

            router.push(`/topluluk/${data.id}`);
        } catch (err) {
            const error = err as Error;
            console.error("Submit error:", error);
            setError(error.message || "Bir hata oluştu");
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-md shadow-sm">
                    <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-100">
                        <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900 mb-2">Giriş Gerekli</h2>
                    <p className="text-gray-500 mb-6">Entry yazmak için giriş yapmalısınız.</p>
                    <div className="flex gap-3 justify-center">
                        <Link
                            href="/topluluk"
                            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-zinc-900 font-medium rounded-full transition-colors"
                        >
                            Geri Dön
                        </Link>
                        <Link
                            href="/?login=true"
                            className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-full transition-colors"
                        >
                            Giriş Yap
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/topluluk"
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </Link>
                        <h1 className="text-xl font-bold text-zinc-900">Yeni Entry</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-8">
                <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Kategori Seçimi */}
                    <div>
                        <label className="block text-sm font-semibold text-zinc-900 mb-4">
                            Kategori Seçin <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {categories.map((cat) => {
                                const Icon = cat.icon;
                                const isActive = category === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`p-4 rounded-xl border-2 transition-all text-left group ${isActive
                                            ? `${cat.color} ${cat.activeBorder}`
                                            : "bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                                            }`}
                                    >
                                        <Icon className={`w-6 h-6 mb-2 ${isActive ? "text-current" : "text-gray-400 group-hover:text-gray-600"}`} />
                                        <div className={`font-semibold text-sm ${isActive ? "text-current" : "text-zinc-900"}`}>
                                            {cat.label}
                                        </div>
                                        <div className={`text-xs mt-1 line-clamp-2 ${isActive ? "opacity-80" : "text-gray-500"}`}>
                                            {cat.description}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Operatör Seçimi (Şikayet kategorileri için) */}
                    {(category === "istasyon_sikayeti" || category === "operator_sikayeti") && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-semibold text-zinc-900 mb-2">
                                Operatör (Opsiyonel)
                            </label>
                            <select
                                value={operatorId}
                                onChange={(e) => setOperatorId(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            >
                                <option value="">Operatör seçin...</option>
                                {operators.map((op) => (
                                    <option key={op.id} value={op.id}>
                                        {op.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* İstasyon Adı (İstasyon şikayeti için) */}
                    {category === "istasyon_sikayeti" && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-semibold text-zinc-900 mb-2">
                                İstasyon Adı/Lokasyonu (Opsiyonel)
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={stationName}
                                    onChange={(e) => setStationName(e.target.value)}
                                    placeholder="Örn: ZES Ankara Kızılay AVM"
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* Şehir Seçimi */}
                    {(category === "istasyon_sikayeti" || category === "oneri" || category === "deneyim") && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-semibold text-zinc-900 mb-2">
                                Şehir (Opsiyonel)
                            </label>
                            <select
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                            >
                                <option value="">Şehir seçin...</option>
                                {cities.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Başlık */}
                    <div>
                        <label className="block text-sm font-semibold text-zinc-900 mb-2">
                            Başlık <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Dikkat çekici bir başlık yazın..."
                            maxLength={200}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                        />
                        <div className="text-xs text-gray-400 mt-1 text-right font-medium">
                            {title.length}/200
                        </div>
                    </div>

                    {/* İçerik */}
                    <div>
                        <label className="block text-sm font-semibold text-zinc-900 mb-2">
                            İçerik <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Detaylı açıklamanızı yazın..."
                            rows={8}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-zinc-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none"
                        />
                        <div className="text-xs text-gray-400 mt-1 text-right font-medium">
                            {content.length} karakter (min. 30)
                        </div>
                    </div>

                    {/* Hata Mesajı */}
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex gap-4 pt-4 border-t border-gray-100">
                        <Link
                            href="/topluluk"
                            className="flex-1 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-zinc-900 font-semibold rounded-full transition-colors text-center"
                        >
                            İptal
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting || !category || !title.trim() || !content.trim()}
                            className="flex-[2] flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-900 hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-full transition-colors shadow-lg shadow-zinc-200"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Gönderiliyor...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Paylaş
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}