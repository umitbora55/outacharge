"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import HeaderWhite from '../components/HeaderWhite';
import { RefreshCw, Search, ArrowRight } from 'lucide-react';

interface Operator {
    name: string;
    countries: string[];
    stationCount: number;
}

export default function OperatorlerPage() {
    const [operators, setOperators] = useState<Operator[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'turkey' | 'europe' | 'usa'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const fetchOperators = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/operators');
            const data = await response.json();
            if (data.success) {
                setOperators(data.operators);
                setLastUpdate(new Date());
            }
        } catch (error) {
            console.error('Error fetching operators:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOperators();
        const interval = setInterval(fetchOperators, 300000);
        return () => clearInterval(interval);
    }, []);

    const filteredOperators = operators
        .filter(op => {
            if (filter === 'turkey') return op.countries.includes('TR');
            if (filter === 'europe') return op.countries.some(c => ['Unknown', 'DE', 'NL', 'BE', 'FR', 'GB', 'IT', 'ES'].includes(c));
            if (filter === 'usa') return op.countries.includes('US');
            return true;
        })
        .filter(op => op.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const totalStations = operators.reduce((sum, op) => sum + op.stationCount, 0);

    return (
        <div className="min-h-screen bg-white dark:bg-[#000000] transition-colors duration-1000 selection:bg-red-500/30 font-sans text-zinc-900 dark:text-white">
            <HeaderWhite />

            {/* Understated Library Hero - Minimalist Luxury */}
            <div className="relative h-[60vh] min-h-[500px] flex items-center overflow-hidden bg-zinc-950">
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        backgroundImage: 'url("/images/operators-hero.jpg")',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px]" />
                </div>

                <div className="container max-w-6xl mx-auto px-6 relative z-10">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-3 mb-6 opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
                            <span className="text-zinc-500 text-[10px] font-bold tracking-[0.5em] uppercase">Intelligence & Infrastructure</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extralight text-white tracking-tight mb-6 leading-tight opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards]">
                            Infrastucture <br />
                            <span className="font-medium">Directives.</span>
                        </h1>
                        <p className="text-zinc-500 max-w-md text-lg font-light leading-relaxed mb-12 opacity-0 animate-[fadeIn_1s_ease-out_0.4s_forwards]">
                            Access precise technical data from the world's leading infrastructure providers in our technical archive.
                        </p>

                        {/* Integrated Stats - Technical Specification Style */}
                        <div className="flex items-center gap-16 opacity-0 animate-[fadeIn_1s_ease-out_0.6s_forwards]">
                            <div className="flex flex-col gap-1">
                                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                                    {operators.length}
                                </span>
                                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                                    Systems
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-3xl font-light text-white tracking-tighter tabular-nums">
                                    {(totalStations / 1000).toFixed(1)}K
                                </span>
                                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-[0.3em]">
                                    Endpoints
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container max-w-6xl mx-auto px-6 pb-32 relative z-20">
                {/* Search & Filter - Minimalist Directive Style */}
                <div className="pt-20 pb-24">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-zinc-100 dark:border-zinc-900 pb-12">
                        <nav className="flex items-center gap-12">
                            {[
                                { key: 'all', label: 'Global' },
                                { key: 'turkey', label: 'Local' }, // Unified naming
                                { key: 'europe', label: 'Europe' },
                                { key: 'usa', label: 'USA' },
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key as any)}
                                    className={`relative py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${filter === f.key
                                        ? 'text-zinc-900 dark:text-white after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-zinc-900 dark:after:bg-white'
                                        : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </nav>

                        <div className="relative w-full md:w-80 group">
                            <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors" />
                            <input
                                type="text"
                                placeholder="Search directives..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent text-zinc-900 dark:text-white pl-8 py-2 focus:outline-none text-[13px] font-medium placeholder:text-zinc-300"
                            />
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="aspect-[4/5] bg-zinc-50 dark:bg-zinc-900/40 animate-pulse rounded-3xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-32">
                        {filteredOperators.map((operator, idx) => {
                            const maxStations = Math.max(...operators.map(o => o.stationCount));
                            const networkSize = (operator.stationCount / maxStations) * 100;

                            return (
                                <div key={idx} className="group flex flex-col">
                                    <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-[#FAFAFA] dark:bg-[#080808] border border-zinc-100 dark:border-white/[0.02] transition-all duration-1000 group-hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] group-hover:-translate-y-2">

                                        <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                                            <span className="text-[240px] font-thin text-zinc-900/[0.01] dark:text-white/[0.01]">
                                                {operator.name.charAt(0)}
                                            </span>
                                        </div>

                                        <div className="absolute inset-0 p-12 flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                                <span className="text-[10px] font-medium text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">.{String(idx + 1).padStart(2, '0')}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                                                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">System Online</span>
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                <div className="flex flex-col">
                                                    <span className="text-[80px] font-extralight text-zinc-900 dark:text-white leading-none tracking-tighter tabular-nums text-center">
                                                        {operator.stationCount}
                                                    </span>
                                                    <span className="text-[9px] font-bold tracking-[0.5em] text-zinc-300 dark:text-zinc-700 uppercase mt-4 text-center">Verified Stations</span>
                                                </div>

                                                <div className="relative h-[1px] w-full bg-zinc-100 dark:bg-white/[0.03]">
                                                    <div
                                                        className="h-full bg-zinc-950 dark:bg-white transition-all duration-[2.5s] ease-out"
                                                        style={{ width: `${Math.max(1, networkSize)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-10 px-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-medium text-zinc-900 dark:text-white tracking-tight">
                                                {operator.name}
                                            </h3>
                                            <ArrowRight className="w-4 h-4 text-zinc-200 dark:text-zinc-800 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-700" />
                                        </div>
                                        <div className="flex items-end justify-between">
                                            <div className="flex gap-8">
                                                {operator.countries.map(c => (
                                                    <div key={c} className="flex flex-col gap-1">
                                                        <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-800 uppercase tracking-widest">Registry</span>
                                                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-500">
                                                            {c === 'TR' ? 'TURKEY' : c === 'US' ? 'USA' : c === 'DE' ? 'GERMANY' : c}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex flex-col gap-1 items-end">
                                                <span className="text-[8px] font-bold text-zinc-300 dark:text-zinc-800 uppercase tracking-widest">Network Impact</span>
                                                <span className="text-[11px] font-bold text-emerald-500/60 tracking-tight">
                                                    {Math.max(1, Math.round(networkSize))}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-48 flex flex-col items-center">
                    <div className="h-px w-24 bg-zinc-100 dark:bg-zinc-950" />
                    <p className="text-zinc-100 dark:text-zinc-900/30 text-[10vw] font-black leading-none select-none tracking-tighter mt-12">
                        INFRA
                    </p>
                </div>
            </main>
        </div>
    );
}