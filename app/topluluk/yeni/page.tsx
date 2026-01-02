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
        color: "bg-red-500/20 border-red-500/50 text-red-400",
        description: "Belirli bir istasyonla ilgili sorun bildirin"
    },
    {
        id: "operator_sikayeti",
        label: "Operatör Şikayeti",
        icon: Zap,
        color: "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
        description: "Şarj operatörü hakkında genel şikayet"
    },
    {
        id: "deneyim",
        label: "Deneyim",
        icon: Car,
        color: "bg-blue-500/20 border-blue-500/50 text-blue-400",
        description: "Şarj veya yolculuk deneyiminizi paylaşın"
    },
    {
        id: "soru",
        label: "Soru",
        icon: HelpCircle,
        color: "bg-purple-500/20 border-purple-500/50 text-purple-400",
        description: "Topluluktan yardım isteyin"
    },
    {
        id: "oneri",
        label: "Öneri",
        icon: Lightbulb,
        color: "bg-green-500/20 border-green-500/50 text-green-400",
        description: "İstasyon veya özellik önerisi"
    },
    {
        id: "haber",
        label: "Haber",
        icon: Newspaper,
        color: "bg-cyan-500/20 border-cyan-500/50 text-cyan-400",
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
        } catch (err: any) {
            console.error("Submit error:", err);
            setError(err.message || "Bir hata oluştu");
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center max-w-md">
                    <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Giriş Gerekli</h2>
                    <p className="text-slate-400 mb-6">Entry yazmak için giriş yapmalısınız.</p>
                    <div className="flex gap-3 justify-center">
                        <Link
                            href="/topluluk"
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            Geri Dön
                        </Link>
                        <Link
                            href="/?login=true"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                        >
                            Giriş Yap
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <div className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40 backdrop-blur-sm">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/topluluk"
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-400" />
                        </Link>
                        <h1 className="text-xl font-bold text-white">Yeni Entry</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Kategori Seçimi */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                            Kategori Seçin *
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {categories.map((cat) => {
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategory(cat.id)}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${category === cat.id
                                                ? cat.color + " border-current"
                                                : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                                            }`}
                                    >
                                        <Icon className={`w-6 h-6 mb-2 ${category === cat.id ? "" : "text-slate-400"}`} />
                                        <div className={`font-medium ${category === cat.id ? "" : "text-white"}`}>
                                            {cat.label}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                                            {cat.description}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Operatör Seçimi (Şikayet kategorileri için) */}
                    {(category === "istasyon_sikayeti" || category === "operator_sikayeti") && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Operatör (Opsiyonel)
                            </label>
                            <select
                                value={operatorId}
                                onChange={(e) => setOperatorId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                İstasyon Adı/Lokasyonu (Opsiyonel)
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={stationName}
                                    onChange={(e) => setStationName(e.target.value)}
                                    placeholder="Örn: ZES Ankara Kızılay AVM"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Şehir Seçimi */}
                    {(category === "istasyon_sikayeti" || category === "oneri" || category === "deneyim") && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Şehir (Opsiyonel)
                            </label>
                            <select
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Başlık *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Dikkat çekici bir başlık yazın..."
                            maxLength={200}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="text-xs text-slate-500 mt-1 text-right">
                            {title.length}/200
                        </div>
                    </div>

                    {/* İçerik */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            İçerik *
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Detaylı açıklamanızı yazın..."
                            rows={8}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        />
                        <div className="text-xs text-slate-500 mt-1 text-right">
                            {content.length} karakter (min. 30)
                        </div>
                    </div>

                    {/* Hata Mesajı */}
                    {error && (
                        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <div className="flex gap-3 pt-4">
                        <Link
                            href="/topluluk"
                            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-center"
                        >
                            İptal
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting || !category || !title.trim() || !content.trim()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
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