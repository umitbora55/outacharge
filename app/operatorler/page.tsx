"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Zap, ArrowRight, ShieldCheck, Globe, Database } from 'lucide-react';

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

    const fetchOperators = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/operators');
            const data = await response.json();
            if (data.success) {
                setOperators(data.operators);
            }
        } catch (error) {
            console.error('Error fetching operators:', error);
            // Mock data for fallback presentation if API fails or is empty during dev
            setOperators([
                { name: "ZES", countries: ["TR"], stationCount: 1540 },
                { name: "Eşarj", countries: ["TR"], stationCount: 890 },
                { name: "Trugo", countries: ["TR"], stationCount: 650 },
                { name: "Tesla", countries: ["TR", "US", "DE"], stationCount: 45000 },
                { name: "Ionity", countries: ["DE", "FR", "GB"], stationCount: 2400 },
                { name: "Voltrun", countries: ["TR"], stationCount: 420 },
                { name: "Sharz.net", countries: ["TR"], stationCount: 380 },
                { name: "OnCharge", countries: ["TR"], stationCount: 210 },
                { name: "Astor", countries: ["TR"], stationCount: 150 },
            ]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOperators();
    }, []);

    const filteredOperators = operators
        .filter(op => {
            if (filter === 'turkey') return op.countries.includes('TR');
            if (filter === 'europe') return op.countries.some(c => ['Unknown', 'DE', 'NL', 'BE', 'FR', 'GB', 'IT', 'ES'].includes(c));
            if (filter === 'usa') return op.countries.includes('US');
            return true;
        })
        .filter(op => op.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Brand logos mapping (Basic Mapping for Demo)
    const brandLogos: Record<string, string> = {
        'Tesla': 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/tesla.png',
        'ZES': '/images/brand-logos/zes.png', // Placeholder
        'Eşarj': '/images/brand-logos/esarj.png', // Placeholder
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
                    <Link href="/operatorler" className="text-green-600 transition-colors">Operatörler</Link>
                    <Link href="/markalar" className="hover:text-green-600 transition-colors">Markalar</Link>
                    <Link href="/incelemeler" className="hover:text-green-600 transition-colors">İncelemeler</Link>
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
            <div className="relative z-10 pt-44 pb-16 px-6 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 relative"
                >
                    <div className="relative px-5 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/60 shadow-sm flex items-center gap-2">
                        <Database className="w-3 h-3 text-green-600" />
                        <span className="text-slate-600 text-[10px] font-bold tracking-[0.2em] uppercase">Partner Ağı</span>
                    </div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 drop-shadow-sm"
                >
                    Şarj Ağı <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-800">Ortaklarımız.</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg md:text-xl text-slate-600 max-w-2xl font-medium leading-relaxed mb-10"
                >
                    Türkiye'nin ve dünyanın önde gelen operatörleri tek bir platformda.
                </motion.p>

                {/* Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="w-full max-w-lg relative group"
                >
                    <div className="absolute inset-0 bg-green-200/50 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full" />
                    <div className="relative bg-white rounded-2xl shadow-lg shadow-slate-200/50 flex items-center p-2 border border-slate-100">
                        <Search className="w-5 h-5 text-slate-400 ml-4" />
                        <input
                            type="text"
                            placeholder="Operatör ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 px-4 py-2 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 font-medium"
                        />
                    </div>
                </motion.div>
            </div>

            {/* 3. Operators Grid */}
            <div className="container max-w-7xl mx-auto px-6">

                {/* Filters */}
                <div className="flex justify-center mb-12">
                    <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm">
                        {[
                            { key: 'all', label: 'Tümü' },
                            { key: 'turkey', label: 'Türkiye' },
                            { key: 'europe', label: 'Avrupa' },
                            { key: 'usa', label: 'Global' },
                        ].map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key as any)}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${filter === f.key
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-500 hover:text-green-700 hover:bg-white/50'
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-64 bg-white/40 rounded-[2rem] animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredOperators.map((operator, idx) => {
                            const logo = brandLogos[operator.name];
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group relative"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-[2.5rem] transform group-hover:scale-[1.02] transition-transform duration-500" />
                                    <div className="relative bg-white/80 backdrop-blur-md rounded-[2.5rem] p-8 border border-white shadow-sm hover:shadow-[0_20px_40px_-12px_rgba(22,163,74,0.1)] transition-all duration-500 hover:-translate-y-1 overflow-hidden">

                                        {/* Status Dot */}
                                        <div className="absolute top-8 right-8 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-[10px] font-bold text-green-700 tracking-wider uppercase">Aktif</span>
                                        </div>

                                        {/* Logo / Initial */}
                                        <div className="w-20 h-20 mb-8 rounded-2xl bg-white/80 shadow-inner flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                                            {logo ? (
                                                <img src={logo} alt={operator.name} className="w-12 h-12 object-contain" />
                                            ) : (
                                                <span className="text-3xl font-black text-slate-300 group-hover:text-green-600 transition-colors">
                                                    {operator.name.charAt(0)}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                            {operator.name}
                                        </h3>

                                        <div className="flex items-center gap-2 mb-6">
                                            <Globe className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-medium text-slate-500">
                                                {operator.countries.includes('TR') ? 'Türkiye Geneli' : 'Global Ağ'}
                                            </span>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">İstasyonlar</div>
                                                <div className="text-xl font-bold text-slate-900 tabular-nums">
                                                    {operator.stationCount.toLocaleString()}
                                                </div>
                                            </div>

                                            <button className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-green-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-green-500/30">
                                                <ArrowRight className="w-5 h-5 -ml-0.5" />
                                            </button>
                                        </div>

                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}