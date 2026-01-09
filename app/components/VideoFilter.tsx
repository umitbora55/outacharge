// app/components/VideoFilter.tsx

"use client";

import { Car, Calendar, Search, ChevronRight, Loader2, ArrowUpDown, Languages } from "lucide-react";

interface VideoFilterProps {
    brands: string[];
    years: string[];
    models: string[];
    selections: {
        brand: string;
        year: string;
        model: string;
        lang: string;
        sort: string;
    };
    setters: {
        setBrand: (val: string) => void;
        setYear: (val: string) => void;
        setModel: (val: string) => void;
        setLang: (val: string) => void;
        setSort: (val: string) => void;
    };
    onSearch: () => void;
    loading: boolean;
}

export default function VideoFilter({
    brands, years, models, selections, setters, onSearch, loading
}: VideoFilterProps) {

    const isReady = selections.brand && selections.year && selections.model;

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 transition-colors">

            {/* Başlık */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400">
                    <Search className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">İnceleme Bulucu</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">Aracınızı seçin, en iyi incelemeleri izleyin</p>
                </div>
            </div>

            {/* Grid Yapısı - 3 Sütunlu Düzen */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* 1. Marka */}
                <div className="relative group">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Marka</label>
                    <div className="relative">
                        <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                        <select
                            value={selections.brand}
                            onChange={(e) => setters.setBrand(e.target.value)}
                            className="w-full pl-12 pr-10 py-3.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-medium"
                        >
                            <option value="">Seçiniz</option>
                            {brands.map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500 rotate-90 pointer-events-none" />
                    </div>
                </div>

                {/* 2. Yıl */}
                <div className="relative group">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Yıl</label>
                    <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                        <select
                            value={selections.year}
                            onChange={(e) => setters.setYear(e.target.value)}
                            disabled={!selections.brand}
                            className="w-full pl-12 pr-10 py-3.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">{selections.brand ? "Yıl Seçin" : "Önce Marka"}</option>
                            {years.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500 rotate-90 pointer-events-none" />
                    </div>
                </div>

                {/* 3. Model */}
                <div className="relative group">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Model</label>
                    <div className="relative">
                        <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                        <select
                            value={selections.model}
                            onChange={(e) => setters.setModel(e.target.value)}
                            disabled={!selections.year}
                            className="w-full pl-12 pr-10 py-3.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="">{selections.year ? "Model Seçin" : "Önce Yıl"}</option>
                            {models.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500 rotate-90 pointer-events-none" />
                    </div>
                </div>

                {/* 4. Dil */}
                <div className="relative group">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Dil</label>
                    <div className="relative">
                        <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                        <select
                            value={selections.lang}
                            onChange={(e) => setters.setLang(e.target.value)}
                            className="w-full pl-12 pr-10 py-3.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-medium"
                        >
                            <option value="tr">Türkçe (TR)</option>
                            <option value="en">English (EN)</option>
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500 rotate-90 pointer-events-none" />
                    </div>
                </div>

                {/* 5. Sıralama */}
                <div className="relative group">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">Sıralama</label>
                    <div className="relative">
                        <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-zinc-500 group-hover:text-emerald-500 transition-colors" />
                        <select
                            value={selections.sort}
                            onChange={(e) => setters.setSort(e.target.value)}
                            className="w-full pl-12 pr-10 py-3.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer font-medium"
                        >
                            <option value="relevance">En Alakalı</option>
                            <option value="date">En Yeniler</option>
                            <option value="viewCount">Çok İzlenen</option>
                            <option value="rating">Yüksek Puan</option>
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500 rotate-90 pointer-events-none" />
                    </div>
                </div>

                {/* 6. Buton */}
                <div>
                    {/* Görünmez label: Butonu diğer inputlarla aynı hizaya (aşağı) iter */}
                    <label className="block text-xs font-semibold text-transparent mb-1.5 ml-1 select-none">İşlem</label>
                    <button
                        onClick={onSearch}
                        disabled={!isReady || loading}
                        className="w-full py-3.5 bg-zinc-900 hover:bg-black text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2 border border-transparent"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Aranıyor...</span>
                            </>
                        ) : (
                            <>
                                Videoları Getir
                                <ChevronRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}