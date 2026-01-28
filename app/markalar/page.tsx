"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Zap, ArrowRight, Car, TrendingUp } from 'lucide-react';

interface Brand {
    id: string;
    name: string;
    logo: string;
    origin: string;
    popularModels: string[];
    communityMembers: number;
}

const brandsData: Brand[] = [
    { id: 'tesla', name: 'Tesla', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/tesla.png', origin: 'USA', popularModels: ['Model Y', 'Model 3'], communityMembers: 12500 },
    { id: 'togg', name: 'Togg', logo: 'https://raw.githubusercontent.com/nicholasadamou/car-logos/refs/heads/master/logos/togg/togg.png', origin: 'Türkiye', popularModels: ['T10X'], communityMembers: 8400 },
    { id: 'bmw', name: 'BMW', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/bmw.png', origin: 'Germany', popularModels: ['iX', 'i4', 'iX1'], communityMembers: 6200 },
    { id: 'mercedes', name: 'Mercedes-Benz', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mercedes-benz.png', origin: 'Germany', popularModels: ['EQS', 'EQE', 'EQB'], communityMembers: 5400 },
    { id: 'hyundai', name: 'Hyundai', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/hyundai.png', origin: 'South Korea', popularModels: ['IONIQ 5', 'IONIQ 6'], communityMembers: 4800 },
    { id: 'kia', name: 'Kia', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/kia.png', origin: 'South Korea', popularModels: ['EV6', 'Niro EV'], communityMembers: 3900 },
    { id: 'volvo', name: 'Volvo', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/volvo.png', origin: 'Sweden', popularModels: ['XC40 Recharge', 'EX30'], communityMembers: 3400 },
    { id: 'renault', name: 'Renault', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/renault.png', origin: 'France', popularModels: ['Zoe', 'Megane E-Tech'], communityMembers: 3100 },
    { id: 'audi', name: 'Audi', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/audi.png', origin: 'Germany', popularModels: ['e-tron GT', 'Q8 e-tron'], communityMembers: 2900 },
    { id: 'porsche', name: 'Porsche', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/porsche.png', origin: 'Germany', popularModels: ['Taycan'], communityMembers: 1800 },
    { id: 'byd', name: 'BYD', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/byd.png', origin: 'China', popularModels: ['Atto 3', 'Seal'], communityMembers: 1500 },
    { id: 'mg', name: 'MG', logo: 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mg.png', origin: 'UK/China', popularModels: ['MG4', 'ZS EV'], communityMembers: 1200 },
];

export default function MarkalarPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading
        setTimeout(() => setLoading(false), 800);
    }, []);

    const filteredBrands = brandsData.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brand.origin.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <Link href="/markalar" className="text-green-600 transition-colors">Markalar</Link>
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
            <div className="relative z-10 pt-44 pb-16 px-6 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-8 relative"
                >
                    <div className="relative px-5 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white/60 shadow-sm flex items-center gap-2">
                        <Car className="w-3 h-3 text-green-600" />
                        <span className="text-slate-600 text-[10px] font-bold tracking-[0.2em] uppercase">Showroom</span>
                    </div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 drop-shadow-sm"
                >
                    Elektrikli Geleceğin <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-800">Mimarları.</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg md:text-xl text-slate-600 max-w-2xl font-medium leading-relaxed mb-10"
                >
                    Favori markanızı keşfedin ve topluluğa katılın.
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
                            placeholder="Marka veya model ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 px-4 py-2 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 font-medium"
                        />
                    </div>
                </motion.div>
            </div>

            {/* 3. Brands Grid */}
            <div className="container max-w-7xl mx-auto px-6">

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-48 bg-white/40 rounded-[2rem] animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredBrands.map((brand, idx) => (
                            <motion.div
                                key={brand.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-[2rem] transform group-hover:scale-[1.02] transition-transform duration-500" />
                                <div className="relative bg-white/80 backdrop-blur-md rounded-[2rem] p-6 border border-white shadow-sm hover:shadow-[0_15px_30px_-10px_rgba(22,163,74,0.1)] transition-all duration-500 hover:-translate-y-1 flex flex-col items-center text-center">

                                    {/* Logo */}
                                    <div className="w-24 h-24 mb-6 rounded-2xl bg-white shadow-inner flex items-center justify-center border border-slate-50 group-hover:scale-105 transition-transform duration-500">
                                        <img src={brand.logo} alt={brand.name} className="w-14 h-14 object-contain" />
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                                        {brand.name}
                                    </h3>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                                        {brand.origin}
                                    </span>

                                    {/* Stats */}
                                    <div className="w-full flex items-center justify-between bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
                                        <div className="flex flex-col items-start">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Topluluk</span>
                                            <span className="text-sm font-bold text-slate-700">{brand.communityMembers.toLocaleString()}</span>
                                        </div>
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                    </div>

                                    <div className="w-full text-left">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Popüler Modeller</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {brand.popularModels.map(model => (
                                                <span key={model} className="text-xs font-medium text-slate-600 bg-slate-100/50 px-2 py-1 rounded-md">
                                                    {model}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <Link href={`/topluluk/markalar/${brand.id}`} className="absolute inset-0 z-10" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
