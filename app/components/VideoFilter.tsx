// app/components/VideoFilter.tsx

"use client";

import { Search, ChevronRight, Loader2 } from "lucide-react";

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
        <div className="w-full">
            {/* Header - Subtle technical label with improved contrast */}
            <div className="flex items-center gap-4 mb-12 pl-1">
                <Search className="w-5 h-5 text-zinc-400 dark:text-zinc-600" />
                <h2 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.4em]">Search Directives</h2>
            </div>

            {/* Minimalist Grid Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-12 gap-y-12">

                {/* Brand Selection */}
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Identifier</span>
                    <div className="relative border-b border-zinc-200 dark:border-zinc-800 focus-within:border-zinc-950 dark:focus-within:border-white transition-colors">
                        <select
                            value={selections.brand}
                            onChange={(e) => setters.setBrand(e.target.value)}
                            className="w-full py-4 bg-transparent text-zinc-900 dark:text-white appearance-none focus:outline-none text-base font-medium cursor-pointer"
                        >
                            <option value="">Select Brand</option>
                            {brands.map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 rotate-90" />
                    </div>
                </div>

                {/* Model Selection */}
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Model Variant</span>
                    <div className="relative border-b border-zinc-200 dark:border-zinc-800 focus-within:border-zinc-950 dark:focus-within:border-white transition-colors">
                        <select
                            value={selections.model}
                            onChange={(e) => setters.setModel(e.target.value)}
                            disabled={!selections.brand}
                            className="w-full py-4 bg-transparent text-zinc-900 dark:text-white appearance-none focus:outline-none text-base font-medium cursor-pointer disabled:opacity-20"
                        >
                            <option value="">{selections.brand ? "Select Model" : "Awaiting"}</option>
                            {models.map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 rotate-90" />
                    </div>
                </div>

                {/* Year & Region */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Year</span>
                        <div className="relative border-b border-zinc-200 dark:border-zinc-800">
                            <select
                                value={selections.year}
                                onChange={(e) => setters.setYear(e.target.value)}
                                disabled={!selections.model}
                                className="w-full py-4 bg-transparent text-zinc-900 dark:text-white appearance-none focus:outline-none text-base font-medium disabled:opacity-20"
                            >
                                <option value="">Year</option>
                                {years.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Region</span>
                        <div className="relative border-b border-zinc-200 dark:border-zinc-800">
                            <select
                                value={selections.lang}
                                onChange={(e) => setters.setLang(e.target.value)}
                                className="w-full py-4 bg-transparent text-zinc-900 dark:text-white appearance-none focus:outline-none text-base font-medium"
                            >
                                <option value="tr">TR</option>
                                <option value="en">EN</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sorting */}
                <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Ordering</span>
                    <div className="relative border-b border-zinc-200 dark:border-zinc-800 focus-within:border-zinc-950 dark:focus-within:border-white transition-colors">
                        <select
                            value={selections.sort}
                            onChange={(e) => setters.setSort(e.target.value)}
                            className="w-full py-4 bg-transparent text-zinc-900 dark:text-white appearance-none focus:outline-none text-base font-medium cursor-pointer"
                        >
                            <option value="relevance">Relevance</option>
                            <option value="date">Latest</option>
                            <option value="viewCount">Popular</option>
                            <option value="rating">Top Rated</option>
                        </select>
                        <ChevronRight className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 rotate-90" />
                    </div>
                </div>

                {/* Submit Action */}
                <button
                    onClick={onSearch}
                    disabled={!isReady || loading}
                    className="h-full mt-auto flex items-center justify-center gap-3 px-8 bg-zinc-950 dark:bg-white text-white dark:text-black rounded-xl hover:bg-black dark:hover:bg-zinc-200 transition-all duration-300 disabled:opacity-5 group shadow-xl"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Generate</span>
                            <ChevronRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}